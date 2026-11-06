/**
 * TypeWire React Integration
 *
 * Provides React bindings for TypeWire dependency injection, enabling
 * context-based dependency resolution within React component trees.
 *
 * Key exports:
 * - {@link ReactResolutionContext} — Wraps a `ResolutionContext` with error caching, so a failed resolution doesn't loop under Suspense
 * - {@link ContainerContext} — React Context holding the active resolution context
 * - {@link useContainer} — Hook to access the current resolution context
 * - {@link useTypeWire} — Hook to resolve a TypeWire with React Suspense support
 * - {@link usePreload} — Hook that suspends a subtree once until a set of wires is created
 * - {@link ResolutionContextProvider} — Component that provides a resolution context to the tree
 *
 * @packageDocumentation
 */

import * as React from "react";
import {
  type AnyTypeSymbol,
  type AnyTypeWire,
  type ResolutionContext,
  type TypeSymbol,
  type TypeWire,
  TypeWireError,
  TypeWireContainer,
} from "@typewirets/core";

/**
 * A React-aware wrapper around {@link ResolutionContext} that caches resolution
 * errors.
 *
 * When a component suspends on a resolution that then fails, React renders it
 * again, and that render would start a new creation, suspend, fail and repeat
 * forever. To stop that loop, the error from a failed `get` is cached, and
 * later `get` and `getSync` calls for the same `TypeSymbol` throw it without
 * calling the underlying context.
 *
 * A cached error lasts until {@link ReactResolutionContext.clearErrors} is
 * called, even across `unbind` and a re-apply: this class only sees a
 * `ResolutionContext`, so it cannot tell that a binding changed. To retry
 * after replacing a binding, call `clearErrors` and then reset the error
 * boundary that caught the error.
 *
 * Calls that run while a resolution is in flight are not deduplicated here.
 * The underlying context must share one in-flight creation per singleton
 * itself, or readers may get different instances. `TypeWireContainer` does,
 * and never hands a creation started before `unbind` to new callers. So does
 * the `@typewirets/inversify` adapter, because Inversify 7 shares concurrent
 * singleton `getAsync` calls. A custom `ResolutionContext` must do the same.
 *
 * @example
 * ```typescript
 * const container = new TypeWireContainer();
 * const context = new ReactResolutionContext(container);
 * const value = await context.get(MySymbol);
 *
 * // After replacing the binding for MySymbol:
 * context.clearErrors(MySymbol);
 * ```
 */
export class ReactResolutionContext {
  /** The underlying resolution context that performs actual dependency resolution. */
  readonly #resolutionContext: ResolutionContext;
  /** Cached resolution errors, keyed by symbol, to fail fast on repeated access. */
  readonly #resolutionErrors: Map<symbol, unknown> = new Map();
  /** Counts `clearErrors` calls, so a `get` can tell if one ran while it waited. */
  #generation = 0;
  /** The generation of the last `clearErrors()` call that cleared every symbol. */
  #allClearedAt = 0;
  /** The generation of the last `clearErrors(typeSymbol)` call, per symbol. */
  readonly #clearedAt: Map<symbol, number> = new Map();

  constructor(resolutionContext: ResolutionContext) {
    this.#resolutionContext = resolutionContext;
  }

  /**
   * Synchronously retrieves a resolved instance for the given type symbol.
   *
   * @template T The type of the resolved instance
   * @param typeSymbol - The typed symbol identifying the dependency to resolve
   * @returns The resolved instance
   * @throws Re-throws the cached error if a previous async resolution for this symbol failed
   * @throws Throws if the instance has not been resolved yet (see {@link ResolutionContext.getSync})
   */
  getSync<T>(typeSymbol: TypeSymbol<T>): T {
    if (this.#resolutionErrors.has(typeSymbol.symbol)) {
      throw this.#resolutionErrors.get(typeSymbol.symbol);
    }
    return this.#resolutionContext.getSync(typeSymbol);
  }

  /**
   * Asynchronously resolves an instance for the given type symbol.
   *
   * If a previous resolution for this symbol failed, the cached error is
   * thrown immediately. Otherwise the call goes to the underlying context,
   * which joins a creation already in flight for a singleton.
   *
   * @template T The type of the resolved instance
   * @param typeSymbol - The typed symbol identifying the dependency to resolve
   * @returns A promise that resolves to the instance
   * @throws Re-throws the cached error if a previous resolution for this symbol failed
   */
  async get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
    const symbol = typeSymbol.symbol;
    if (this.#resolutionErrors.has(symbol)) {
      throw this.#resolutionErrors.get(symbol);
    }

    const startedAt = this.#generation;
    try {
      return await this.#resolutionContext.get(typeSymbol);
    } catch (err: unknown) {
      // A failure that settles after `clearErrors` belongs to the attempt the
      // caller just discarded: hand it to this caller, but don't cache it.
      if (!this.#clearedSince(symbol, startedAt)) {
        this.#resolutionErrors.set(symbol, err);
      }
      throw err;
    }
  }

  /**
   * Forgets cached resolution errors, so the next `get` or `getSync` asks the
   * underlying context again.
   *
   * Call it after replacing a failed binding (`unbind`, then apply the wire
   * again), then reset the error boundary that shows the error. A failure that
   * was still in flight when you call this is not cached when it settles.
   *
   * @param typeSymbol - The symbol whose error to forget. Omit to forget all.
   */
  clearErrors(typeSymbol?: AnyTypeSymbol): void {
    this.#generation += 1;
    if (typeSymbol) {
      this.#resolutionErrors.delete(typeSymbol.symbol);
      this.#clearedAt.set(typeSymbol.symbol, this.#generation);
      return;
    }

    this.#resolutionErrors.clear();
    this.#clearedAt.clear();
    this.#allClearedAt = this.#generation;
  }

  #clearedSince(symbol: symbol, generation: number): boolean {
    const clearedAt = Math.max(
      this.#allClearedAt,
      this.#clearedAt.get(symbol) ?? 0,
    );
    return clearedAt > generation;
  }
}

/**
 * The wrapper {@link ResolutionContextProvider} uses for each plain context, so
 * every render and every mount of a provider for that context share one error
 * cache and one context value.
 */
const reactResolutionContexts = new WeakMap<
  ResolutionContext,
  ReactResolutionContext
>();

function reactResolutionContextFor(
  resolutionContext: ResolutionContext,
): ReactResolutionContext {
  if (resolutionContext instanceof ReactResolutionContext) {
    return resolutionContext;
  }

  let wrapper = reactResolutionContexts.get(resolutionContext);
  if (!wrapper) {
    wrapper = new ReactResolutionContext(resolutionContext);
    reactResolutionContexts.set(resolutionContext, wrapper);
  }
  return wrapper;
}

/**
 * React Context that holds the active {@link ResolutionContext} for the component tree.
 *
 * The default value is an empty {@link TypeWireContainer} wrapped in a
 * {@link ReactResolutionContext}. In practice, you should provide your own
 * container via {@link ResolutionContextProvider}.
 */
export const ContainerContext = React.createContext<ResolutionContext>(
  new ReactResolutionContext(new TypeWireContainer()),
);

/**
 * Hook to access the current {@link ResolutionContext} from the nearest
 * {@link ResolutionContextProvider}.
 *
 * @returns The current resolution context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const container = useContainer();
 *   // Use container for manual resolution if needed
 * }
 * ```
 */
export function useContainer() {
  const container = React.useContext(ContainerContext);
  return container;
}

/**
 * Options for {@link useTypeWire}.
 */
export interface UseTypeWireOpts {
  /**
   * What to do when the value isn't created yet. `true` (the default)
   * suspends until it is, so the nearest `<Suspense>` shows its fallback.
   * `false` throws a `TypeWireError` with reason `NotPreloaded` naming the
   * wire instead, for apps that preload every phase and never want a
   * fallback: a forgotten preload then shows up at once, in development.
   */
  suspend?: boolean;
}

/** Error reason thrown by {@link useTypeWire} with `{ suspend: false }`. */
const ReasonNotPreloaded = "NotPreloaded";

const ScopeSingleton = "singleton";

/** Marks a state that has no value yet, so falsy values still count as values. */
const NotReady: unique symbol = Symbol("NotReady");

/**
 * Reads a wire synchronously. Returns `NotReady` when the value isn't
 * created yet and can be waited for; rethrows any other error.
 */
function readSync<T>(
  typeWire: TypeWire<T>,
  container: ResolutionContext,
): T | typeof NotReady {
  try {
    return typeWire.getInstanceSync(container);
  } catch (err: unknown) {
    if (err instanceof TypeWireError && err.retriable) {
      return NotReady;
    }

    throw err;
  }
}

function notPreloaded(typeWire: AnyTypeWire, cause: unknown) {
  const name = typeWire.type.symbol.description ?? "(unnamed wire)";
  const err = new TypeWireError(
    ReasonNotPreloaded,
    `${name} is not ready. It was rendered with { suspend: false } before it was created: preload it (container.preload or usePreload) before this component renders.`,
  );
  err.retriable = false;
  Object.defineProperty(err, "cause", {
    value: cause,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return err;
}

/**
 * Hook that resolves a {@link TypeWire} within the current container context,
 * with React Suspense integration.
 *
 * Resolution behavior:
 * 1. **Sync available** — If the wire can be resolved synchronously (e.g., a singleton
 *    that was already created or preloaded), the value is returned immediately,
 *    including falsy values such as `0`, `""`, `false` and `null`.
 * 2. **Async pending** — If sync resolution fails with a retriable error, the hook
 *    starts an async resolution and throws the promise to trigger React Suspense.
 *    With `{ suspend: false }` it throws a `TypeWireError` with reason
 *    `NotPreloaded` instead.
 * 3. **Error** — If sync resolution fails with a non-retriable error, it is re-thrown.
 *
 * To render without a fallback, preload the wires first, with
 * `container.preload` before rendering or {@link usePreload} higher in the
 * tree. A wire nobody preloaded suspends, so this hook must be used inside a
 * `<Suspense>` boundary unless you pass `{ suspend: false }`.
 *
 * @template T The type of the resolved instance
 * @param typeWire - The TypeWire to resolve
 * @param opts - Optional settings; see {@link UseTypeWireOpts}
 * @returns The resolved instance
 * @throws The resolution promise when the value is not yet available (for Suspense)
 * @throws {@link TypeWireError} with reason `NotPreloaded` when the value is not yet available and `suspend` is `false`
 * @throws {@link TypeWireError} if synchronous resolution fails with a non-retriable error
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const userService = useTypeWire(UserServiceWire);
 *   return <div>{userService.getName()}</div>;
 * }
 *
 * // Preloaded before rendering: no fallback.
 * await container.preload({ wires: [UserServiceWire] });
 *
 * // Or wrap in Suspense for wires that may not be ready yet.
 * <Suspense fallback={<Loading />}>
 *   <UserProfile />
 * </Suspense>
 * ```
 */
export function useTypeWire<T>(
  typeWire: TypeWire<T>,
  opts?: UseTypeWireOpts,
): T {
  const container = useContainer();
  const suspend = opts?.suspend ?? true;
  const [state, setState] = React.useState<{ value: T | typeof NotReady }>(
    () => ({ value: readSync(typeWire, container) }),
  );

  if (state.value === NotReady && !suspend) {
    let cause: unknown;
    try {
      typeWire.getInstanceSync(container);
    } catch (err: unknown) {
      cause = err;
    }
    throw notPreloaded(typeWire, cause);
  }

  const promise = typeWire.getInstance(container);
  React.useEffect(() => {
    let mounted = true;

    promise
      .then((value) => {
        if (mounted) {
          // Keep the same state object for the same value, so React skips the
          // re-render; a new object here would re-render, start a new
          // `getInstance` and run this effect again, forever.
          setState((prev) => (Object.is(prev.value, value) ? prev : { value }));
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error(err);
        }
      });
    return () => {
      mounted = false;
    };
  }, [promise]);

  if (state.value !== NotReady) {
    return state.value;
  }

  throw promise;
}

/**
 * Options for {@link usePreload}.
 */
export interface UsePreloadOpts {
  /**
   * The wires to create before the calling component renders. Their imports
   * are created with them. Wires that aren't singletons are skipped. To
   * preload a group, pass its `wires`.
   */
  wires: readonly AnyTypeWire[];
}

/**
 * Hook that suspends the calling component until every singleton in
 * `opts.wires` is created, so components below it read them with
 * {@link useTypeWire} without suspending.
 *
 * Use it where a part of the app starts (a route, a panel, a feature), under
 * one `<Suspense>` boundary: the fallback shows once for the whole set, and
 * the creations run in parallel. A creation that fails reaches the nearest
 * error boundary.
 *
 * It works with any resolution context, including the Inversify adapter.
 * Outside React, use `container.preload` instead.
 *
 * @param opts - The wires to preload; see {@link UsePreloadOpts}
 * @throws A promise while any of the wires is still being created (for Suspense)
 * @throws The creation's error, once one has failed
 *
 * @example
 * ```tsx
 * function ReportsRoute() {
 *   usePreload({ wires: [reportsServiceWire, chartsWire] });
 *   return <ReportsPage />;
 * }
 *
 * <Suspense fallback={<Loading />}>
 *   <ReportsRoute />
 * </Suspense>
 * ```
 */
export function usePreload(opts: UsePreloadOpts): void {
  const container = useContainer();
  const pending: Promise<unknown>[] = [];
  for (const wire of opts.wires) {
    if ((wire.scope ?? ScopeSingleton) !== ScopeSingleton) {
      continue;
    }

    if (readSync(wire, container) === NotReady) {
      pending.push(wire.getInstance(container));
    }
  }

  if (pending.length > 0) {
    throw Promise.all(pending);
  }
}

/**
 * React component that provides a {@link ResolutionContext} to the component tree.
 *
 * If the given `resolutionContext` is not already a {@link ReactResolutionContext},
 * it is wrapped in one, so a failed resolution reaches an error boundary
 * instead of retrying under Suspense. Each plain context gets one wrapper,
 * reused on every render and every mount, so re-rendering the provider keeps
 * cached errors and gives consumers the same context value.
 *
 * A cached error lasts until `clearErrors` is called, even after `unbind` and
 * a re-apply. To be able to retry, create the {@link ReactResolutionContext}
 * yourself, pass it here, and call its `clearErrors` after replacing the
 * binding.
 *
 * The context must share one in-flight creation per singleton (as
 * `TypeWireContainer` does); see {@link ReactResolutionContext}.
 *
 * @param props.resolutionContext - The resolution context to provide to descendants
 * @param props.children - Child components that will have access to the context
 *
 * @example
 * ```tsx
 * async function main() {
 *   const container = new TypeWireContainer();
 *   await AppWireGroup.apply(container);
 *
 *   createRoot(document.getElementById('root')!).render(
 *     <ResolutionContextProvider resolutionContext={container}>
 *       <App />
 *     </ResolutionContextProvider>
 *   );
 * }
 * ```
 */
export function ResolutionContextProvider(props: {
  resolutionContext: ResolutionContext;
  children?: React.ReactNode;
}) {
  const resolutionContext = reactResolutionContextFor(props.resolutionContext);
  return (
    <ContainerContext value={resolutionContext}>
      {props.children}
    </ContainerContext>
  );
}
