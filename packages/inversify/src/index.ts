import type {
  AnyTypeSymbol,
  AnyTypeWire,
  BindingContext,
  TypeSymbol,
  TypeWire,
  ResolutionContext as TypeWireResolutionContext,
} from "@typewirets/core";
import type { BindingScope, Container } from "inversify";

/**
 * Converts a TypeWire scope string to the equivalent InversifyJS BindingScope.
 *
 * @param scope - The TypeWire scope string (e.g., 'singleton', 'transient', 'request')
 * @returns The equivalent InversifyJS BindingScope or undefined if no conversion is possible
 *
 * @example
 * ```typescript
 * // Convert a TypeWire scope to InversifyJS scope
 * const inversifyScope = adoptScope('singleton'); // returns 'Singleton'
 * ```
 */
export function adoptScope(scope?: string): BindingScope | undefined {
  if (!scope) {
    return "Singleton";
  }

  switch (scope.toLowerCase()) {
    case "singleton":
      return "Singleton";
    case "transient":
      return "Transient";
    case "request":
      return "Request";
  }
}

/**
 * Adapter class that provides both TypeWire ResolutionContext and BindingContext
 * interfaces on top of an InversifyJS container.
 *
 * This adapter allows TypeWire definitions to work with an existing InversifyJS
 * container, providing a bridge between the two dependency injection systems.
 *
 * @example
 * ```typescript
 * const container = new Container();
 * const adapter = new InversifyAdapter(container);
 *
 * // Now you can use TypeWire with your InversifyJS container
 * await serviceWire.apply(adapter);
 * const service = await serviceWire.getInstance(adapter);
 * ```
 */
export class InversifyAdapter
  implements TypeWireResolutionContext, BindingContext
{
  /**
   * Set of symbols for which instances have been loaded/initialized.
   * Used to track which singleton instances have already been created.
   */
  private readonly loaded: Set<symbol> = new Set();

  /**
   * Set of symbols that represent singleton-scoped dependencies.
   */
  private readonly singletons: Set<symbol> = new Set();

  /**
   * Creates a new InversifyAdapter for the specified container.
   *
   * @param container - The InversifyJS container to adapt
   */
  constructor(readonly container: Container) {}

  /**
   * Checks if a symbol represents a singleton-scoped dependency.
   *
   * @param symbol - The symbol to check
   * @returns True if the dependency is singleton-scoped, false otherwise
   */
  #isSingleton(symbol: symbol): boolean {
    return this.singletons.has(symbol);
  }

  /**
   * Gets an instance of type T synchronously.
   * For singleton-scoped dependencies, also tracks that they have been loaded.
   *
   * @template T - The type of instance to get
   * @param typeSymbol - The type symbol identifying the dependency
   * @returns An instance of type T
   * @throws Error if the dependency cannot be resolved synchronously
   */
  getSync<T>(typeSymbol: AnyTypeSymbol): T {
    if (!this.#isSingleton(typeSymbol.symbol)) {
      return this.container.get(typeSymbol.symbol);
    }

    const result = this.container.get(typeSymbol.symbol) as T;
    this.loaded.add(typeSymbol.symbol);
    return result;
  }

  /**
   * Gets an instance of type T asynchronously.
   * For singleton-scoped dependencies, also tracks that they have been loaded.
   *
   * @template T - The type of instance to get
   * @param typeSymbol - The type symbol identifying the dependency
   * @returns A promise that resolves to an instance of type T
   * @throws Error if the dependency is not found
   */
  async get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
    if (!this.#isSingleton(typeSymbol.symbol)) {
      return this.container.getAsync(typeSymbol.symbol);
    }

    const result = await this.container.getAsync(typeSymbol.symbol);
    this.loaded.add(typeSymbol.symbol);
    return result as T;
  }

  /**
   * Binds a TypeWire to the InversifyJS container.
   * Configures the binding with the appropriate scope and creator function.
   *
   * @param typeWire - The TypeWire to bind
   */
  bind(typeWire: AnyTypeWire): void | Promise<void> {
    const bound = this.container
      .bind(typeWire.type.symbol)
      .toDynamicValue((_ctx) => {
        return typeWire.creator(this);
      });

    const scope = adoptScope(typeWire.scope);
    if (scope) {
      switch (scope) {
        case "Singleton":
          this.singletons.add(typeWire.type.symbol);
          bound.inSingletonScope();
          break;
        case "Transient":
          bound.inTransientScope();
          break;
        case "Request":
          bound.inRequestScope();
      }
    }
  }

  /**
   * Removes a binding from the InversifyJS container.
   * Also removes any tracking information for the binding.
   *
   * @param typeSymbol - The type symbol identifying the binding to remove
   * @returns A promise that resolves when the unbinding is complete
   */
  async unbind(typeSymbol: AnyTypeSymbol): Promise<void> {
    this.loaded.delete(typeSymbol.symbol);
    this.singletons.delete(typeSymbol.symbol);
    return this.container.unbind(typeSymbol.symbol);
  }

  /**
   * Checks if a binding exists in the InversifyJS container.
   *
   * @param typeSymbol - The type symbol to check
   * @returns True if the binding exists, false otherwise
   */
  isBound(typeSymbol: AnyTypeSymbol): boolean {
    return this.container.isBound(typeSymbol.symbol);
  }
}

/**
 * Creates an adapter that provides both TypeWire ResolutionContext and BindingContext
 * interfaces using an InversifyJS container.
 *
 * This is a convenience function for creating an InversifyAdapter.
 *
 * @param container - The InversifyJS container to adapt
 * @returns An object implementing both TypeWire interfaces
 *
 * @example
 * ```typescript
 * const container = new Container();
 * const adapter = createInversifyAdapter(container);
 *
 * // Now you can use TypeWire with your InversifyJS container
 * await serviceWire.apply(adapter);
 * const service = await serviceWire.getInstance(adapter);
 * ```
 */
export function createInversifyAdapter(
  container: Container,
): TypeWireResolutionContext & BindingContext {
  return new InversifyAdapter(container);
}
