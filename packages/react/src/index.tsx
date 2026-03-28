/**
 * TypeWire React Integration
 *
 * Provides React bindings for TypeWire dependency injection, enabling
 * context-based dependency resolution within React component trees.
 *
 * Key exports:
 * - {@link ReactResolutionContext} — Wraps a `ResolutionContext` with promise deduplication and error caching for React's concurrent rendering model
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
 * A React-aware wrapper around {@link ResolutionContext} that adds promise
 * deduplication and error caching.
 *
 * React's concurrent rendering may call the same resolution multiple times
 * during a single render cycle. This class ensures that concurrent calls
 * for the same `TypeSymbol` share a single in-flight promise rather than
 * triggering duplicate resolutions. Once a resolution fails, the error is
 * cached so that subsequent calls throw immediately without retrying.
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
  /** In-flight resolution promises, keyed by symbol, for deduplication. */
  readonly #resolutions: Map<symbol, Promise<unknown>> = new Map();
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
   * Asynchronously resolves an instance for the given type symbol, with
   * promise deduplication.
   *
   * If a resolution for the same symbol is already in flight, the existing
   * promise is returned instead of starting a new one. If a previous
   * resolution failed, the cached error is thrown immediately.
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

    const promise = this.#resolutions.get(typeSymbol.symbol) as Promise<T>;
    if (promise) {
      return promise;
    }

    const newResolution = this.#resolutionContext.get(typeSymbol);
    this.#resolutions.set(typeSymbol.symbol, newResolution);
    return newResolution
      .catch((err) => {
        this.#resolutionErrors.set(typeSymbol.symbol, err);
        throw err;
      })
      .finally(() => {
        this.#resolutions.delete(typeSymbol.symbol);
      });
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
 * it is automatically wrapped in one to enable promise deduplication and error
 * caching for React's concurrent rendering model.
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
