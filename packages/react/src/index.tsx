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
 * - {@link ResolutionContextProvider} — Component that provides a resolution context to the tree
 *
 * @packageDocumentation
 */

import * as React from "react";
import {
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
 * A cached error lasts as long as this object, even across `unbind` and a
 * re-apply: this class only sees a `ResolutionContext`, so it cannot tell
 * that the binding changed. {@link ResolutionContextProvider} creates a new
 * one each time it renders (unless you pass it a `ReactResolutionContext`),
 * so to retry after replacing a binding, re-render or remount the provider.
 *
 * Calls that run while a resolution is in flight are not deduplicated here:
 * the underlying context does that (`TypeWireContainer` creates each singleton
 * once), and it never hands a creation started before `unbind` to new callers.
 *
 * @example
 * ```typescript
 * const context = new ReactResolutionContext(new TypeWireContainer());
 * const value = await context.get(MySymbol);
 * ```
 */
export class ReactResolutionContext {
  /** The underlying resolution context that performs actual dependency resolution. */
  readonly #resolutionContext: ResolutionContext;
  /** Cached resolution errors, keyed by symbol, to fail fast on repeated access. */
  readonly #resolutionErrors: Map<symbol, unknown> = new Map();

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
    if (this.#resolutionErrors.has(typeSymbol.symbol)) {
      throw this.#resolutionErrors.get(typeSymbol.symbol);
    }

    try {
      return await this.#resolutionContext.get(typeSymbol);
    } catch (err: unknown) {
      this.#resolutionErrors.set(typeSymbol.symbol, err);
      throw err;
    }
  }
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
 * Hook that resolves a {@link TypeWire} within the current container context,
 * with React Suspense integration.
 *
 * Resolution behavior:
 * 1. **Sync available** — If the wire can be resolved synchronously (e.g., a singleton
 *    that was already created), the value is returned immediately.
 * 2. **Async pending** — If sync resolution fails with a retriable error, the hook
 *    starts an async resolution and throws the promise to trigger React Suspense.
 * 3. **Error** — If sync resolution fails with a non-retriable error, it is re-thrown.
 *
 * This hook must be used inside a `<Suspense>` boundary when resolving wires
 * with asynchronous creators.
 *
 * @template T The type of the resolved instance
 * @param typeWire - The TypeWire to resolve
 * @returns The resolved instance
 * @throws The resolution promise when the value is not yet available (for Suspense)
 * @throws {@link TypeWireError} if synchronous resolution fails with a non-retriable error
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const userService = useTypeWire(UserServiceWire);
 *   return <div>{userService.getName()}</div>;
 * }
 *
 * // Wrap in Suspense for async wires
 * <Suspense fallback={<Loading />}>
 *   <UserProfile />
 * </Suspense>
 * ```
 */
export function useTypeWire<T>(typeWire: TypeWire<T>): T {
  const container = useContainer();
  const [value, setValue] = React.useState(() => {
    try {
      return typeWire.getInstanceSync(container);
    } catch (err: unknown) {
      if (err instanceof TypeWireError && err.retriable) {
        return null;
      }

      throw err;
    }
  });

  const promise = typeWire.getInstance(container);
  React.useEffect(() => {
    let mounted = true;

    promise
      .then((value) => {
        if (mounted) {
          setValue(() => value);
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

  if (value) {
    return value;
  }

  throw promise;
}

/**
 * React component that provides a {@link ResolutionContext} to the component tree.
 *
 * If the given `resolutionContext` is not already a {@link ReactResolutionContext},
 * it is automatically wrapped in one to enable error caching, so a failed
 * resolution reaches an error boundary instead of retrying under Suspense.
 *
 * The wrapper is created anew on every render of this component, which clears
 * cached errors. A failed resolution stays failed until this component
 * re-renders or remounts, even after `unbind` and a re-apply. If you pass a
 * `ReactResolutionContext` yourself, its errors last as long as that object.
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
  const resolutionContext =
    props.resolutionContext instanceof ReactResolutionContext
      ? props.resolutionContext
      : new ReactResolutionContext(props.resolutionContext);
  return (
    <ContainerContext value={resolutionContext}>
      {props.children}
    </ContainerContext>
  );
}
