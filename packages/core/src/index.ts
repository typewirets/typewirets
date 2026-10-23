/**
 * TypeWire Core Library
 *
 * A lightweight, container-agnostic dependency injection library for TypeScript that provides
 * strong typing with minimal overhead. This library enables type-safe dependency injection
 * through a functional API that emphasizes immutability and composition.
 *
 * Key Features:
 * - Strong typing with TypeScript
 * - Container-agnostic design
 * - Immutable definitions
 * - Async support
 * - Circular dependency detection
 * - Smart scoping (singleton, transient)
 *
 * The library is organized around several core concepts:
 * 1. TypeSymbol - A typed wrapper around JavaScript's Symbol for type-safe identification
 * 2. TypeWire - The main interface for defining how to create and manage instances
 * 3. TypeWireGroup - A collection of TypeWire instances that can be managed together
 * 4. ResolutionContext - Interface for resolving dependencies
 * 5. BindingContext - Interface for registering dependencies
 * 6. TypeWireContainer - Default implementation of both ResolutionContext and BindingContext
 *
 * @packageDocumentation
 */

/**
 * A typed wrapper around JavaScript's Symbol that preserves type information
 * at compile time while providing unique identification at runtime.
 *
 * @template _T The type associated with this symbol. It is only used for type check.
 *
 * Note: We cannot use `type TypeSymbol<_T> = symbol` because TypeScript is structurally typed,
 * which means that two symbols with the same structure are considered compatible.
 * This would allow type mismatches to go undetected.
 *
 * For example:
 * ```typescript
 * type TypeSymbol<T> = symbol;
 *
 * const userSymbol: TypeSymbol<User> = Symbol('user');
 * const loggerSymbol: TypeSymbol<Logger> = userSymbol; // No error! 😱
 * ```
 *
 * Instead, we use an object type to ensure type safety:
 * ```typescript
 * type TypeSymbol<T> = { symbol: symbol };
 *
 * const userSymbol: TypeSymbol<User> = { symbol: Symbol('user') };
 * const loggerSymbol: TypeSymbol<Logger> = userSymbol; // Error! Types are not compatible 👍
 * ```
 *
 * This is a common pattern in TypeScript known as "branded types" or "phantom types",
 * where we use the structure of the type to enforce nominal typing behavior.
 *
 * For more information on TypeScript's structural type system, see:
 * - TypeScript Handbook on Type Compatibility: https://www.typescriptlang.org/docs/handbook/type-compatibility.html
 * - TypeScript FAQ on Nominal Types: https://github.com/Microsoft/TypeScript/wiki/FAQ#can-i-make-a-type-alias-nominal
 */
export type TypeSymbol<_T> = {
  /**
   * The underlying JavaScript Symbol
   */
  symbol: symbol;
};

/**
 * Type alias for any for prevent
 * linting errors for a convenience
 */
// biome-ignore lint/suspicious/noExplicitAny: Explicitly looking for any type
type AnyType = any;

/**
 * A type symbol that can represent any type.
 * Used when the specific type is not important or unknown.
 */
export type AnyTypeSymbol = TypeSymbol<AnyType>;

/**
 * Constant representing the singleton scope for dependencies.
 * When a dependency is registered with this scope, the same instance
 * will be returned for all resolutions.
 */
const ScopeSingleton = "singleton";

const UnknownTypeSymbol = "unknown";

/**
 * Gets the description of a type symbol.
 * @param typeSymbol - The type symbol to get the description for
 * @returns The description of the symbol, or "unknown" if none exists
 */
function getDescription(typeSymbol?: TypeSymbol<unknown>): string {
  if (!typeSymbol) {
    return UnknownTypeSymbol;
  }

  return typeSymbol.symbol.description ?? UnknownTypeSymbol;
}

/**
 * Resolves dependencies from a container.
 * Provides methods to retrieve instances by their type symbols.
 */
export interface ResolutionContext {
  /**
   * Gets an instance of type T synchronously.
   *
   * @template T The type of instance to get
   * @param typeSymbol The type symbol identifying the dependency
   * @returns An instance of type T
   * @throws Error if the dependency cannot be resolved synchronously or is not found
   */
  getSync<T>(typeSymbol: TypeSymbol<T>): T;

  /**
   * Gets an instance of type T asynchronously.
   *
   * @template T The type of instance to get
   * @param typeSymbol The type symbol identifying the dependency
   * @returns A promise that resolves to an instance of type T
   * @throws Error if the dependency is not found
   */
  get<T>(typeSymbol: TypeSymbol<T>): Promise<T>;
}

/**
 * Registers dependencies with a container.
 * Provides methods to bind, unbind, and check for typewires.
 */
export interface BindingContext {
  /**
   * Binds a Typewire to the container, replacing any existing binding for the
   * same type. What happens to a value the container already created for that
   * type is up to the container.
   *
   * @param typeWire The Typewire to bind
   */
  bind(typeWire: AnyTypeWire): void | Promise<void>;

  /**
   * Removes a binding from the container.
   *
   * @param typeSymbol The type symbol identifying the binding to remove
   */
  unbind(typeSymbol: AnyTypeSymbol): Promise<void>;

  /**
   * Checks if a binding exists in the container.
   *
   * @param typeSymbol The type symbol to check
   * @returns True if the binding exists, false otherwise
   */
  isBound(typeSymbol: AnyTypeSymbol): boolean;
}

/**
 * A creator function that creates instances of type T.
 *
 * @template T The type of instance to create
 * @param container The dependency resolver to use for resolving dependencies
 * @returns An instance of type T or a Promise that resolves to an instance of type T
 */
export type Creator<T> = (context: ResolutionContext) => T | Promise<T>;

/**
 * A function that can decorate or replace a creator function.
 * Can be either a new creator function or a function that takes the original
 * creator and returns a new one.
 */
export type CreatorDecorator<T> =
  | Creator<T>
  | ((context: ResolutionContext, creator: Creator<T>) => T | Promise<T>);

/**
 * Interface for types that can be applied to a BindingContext.
 * This is the common interface shared by TypeWire and TypeWireGroup.
 */
export interface Applicable {
  /**
   * Registers this type with a dependency binder.
   *
   * @param binder The dependency binder to register with
   * @returns A promise that resolves when registration is complete
   */
  apply(binder: BindingContext): void | Promise<void>;
}

/**
 * Defines a provider for creating and retrieving typed instances.
 * Providers are immutable definitions that describe how to create
 * instances of a specific type and how they should be managed.
 *
 * @template T The type of instance this provider creates
 */
export interface TypeWire<T> extends Applicable {
  /**
   * The unique typed symbol that identifies this provider.
   */
  readonly type: TypeSymbol<T>;

  /**
   * The scope that determines instance lifecycle.
   * - 'singleton': One instance shared across all resolutions (default)
   * - 'transient': New instance created for each resolution
   */
  readonly scope?: string;

  /**
   * The creator function that creates instances of type T.
   */
  readonly creator: Creator<T>;

  /**
   * Retrieves an instance of type T synchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns An instance of type T
   * @throws Error if the instance cannot be resolved synchronously
   */
  getInstanceSync(resolver: ResolutionContext): T;

  /**
   * Retrieves an instance of type T asynchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns A promise that resolves to an instance of type T
   */
  getInstance(resolver: ResolutionContext): Promise<T>;

  /**
   * Creates a new provider with the specified scope.
   * The original provider remains unchanged.
   *
   * @param scope The scope to use for the new provider
   * @returns A new provider with the updated scope
   */
  withScope(scope: string): TypeWire<T>;

  /**
   * Creates a new provider with the specified implementation.
   * The original provider remains unchanged.
   *
   * @param create The creator function for the new provider
   * @returns A new provider with the updated implementation
   */
  withCreator(create: CreatorDecorator<T>): TypeWire<T>;
}

export type InferWireType<W> = W extends TypeWire<infer T> ? T : never;

/**
 * A group of TypeWire instances that create instances of type T.
 * This type allows you to manage multiple wires together and apply them
 * to a container in a single operation.
 *
 * @template T The type of instances created by the wires in this group
 */
export interface TypeWireGroup<T> extends Applicable {
  wires: TypeWire<T>[];

  /**
   * Retrieves all instances from the group asynchronously.
   * This method resolves all instances in parallel, making it more efficient than
   * sequential resolution when dealing with multiple async dependencies.
   *
   * This method is particularly useful for pre-loading async resources during application
   * startup. Once pre-loaded, singleton resources can be accessed synchronously using
   * getAllInstancesSync for better performance in hot code paths.
   *
   * @param resolver - The resolution context used to resolve dependencies
   * @returns A promise that resolves to an array of all instances in the group
   * @throws {TypeWireError} If any instance fails to resolve
   *
   * @example
   * ```typescript
   * // Pre-load all services during startup
   * const group = typeWireGroupOf([userServiceWire, loggerWire]);
   * await group.getAllInstances(container);
   *
   * // Later, access pre-loaded singletons synchronously
   * const [userService, logger] = group.getAllInstancesSync(container);
   *
   * // Or access individual instances using their wires
   * const userService = await userServiceWire.getInstance(container);
   * const logger = loggerWire.getInstanceSync(container);
   * ```
   */
  getAllInstances(resolver: ResolutionContext): Promise<T[]>;

  /**
   * Retrieves all instances from the group synchronously.
   * This method is useful when all dependencies are known to be synchronous
   * or when working in a context where async operations are not allowed.
   *
   * Note: This method will throw if any of the instances require async resolution.
   * For async dependencies, use getAllInstances instead.
   *
   * @param resolver - The resolution context used to resolve dependencies
   * @returns An array of all instances in the group
   * @throws {TypeWireError} If any instance fails to resolve or requires async resolution
   *
   * @example
   * ```typescript
   * // For synchronous services
   * const group = typeWireGroupOf([configWire, loggerWire]);
   * const [config, logger] = group.getAllInstancesSync(container);
   *
   * // Or access individual instances using their wires
   * const config = configWire.getInstanceSync(container);
   * const logger = loggerWire.getInstanceSync(container);
   * ```
   */
  getAllInstancesSync(resolver: ResolutionContext): T[];

  withExtraWires(extraWires: TypeWire<T>[]): TypeWireGroup<T>;
}

/**
 * Standard implementation of the TypeWireGroup interface.
 * This class provides a concrete implementation that can be used directly
 * or extended for custom behavior.
 *
 * @template T The type of instances created by the wires in this group
 */
export class StandardTypeWireGroup<T> implements TypeWireGroup<T> {
  /**
   * Creates a new StandardTypeWireGroup with the given wires.
   *
   * @param #wires The TypeWire instances to include in this group
   */
  constructor(readonly wires: TypeWire<T>[]) {}

  async getAllInstances(resolver: ResolutionContext): Promise<T[]> {
    return await Promise.all(
      this.wires.map((wire) => wire.getInstance(resolver)),
    );
  }

  getAllInstancesSync(resolver: ResolutionContext): T[] {
    return this.wires.map((wire) => wire.getInstanceSync(resolver));
  }

  withExtraWires(extraWires: TypeWire<T>[]): TypeWireGroup<T> {
    return new StandardTypeWireGroup([this.wires, extraWires].flat());
  }

  /**
   * Applies all wires in this group to the given binder.
   * This is done sequentially to maintain a predictable order.
   *
   * @param binder The dependency binder to register with
   */
  async apply(binder: BindingContext) {
    for (const wire of this.wires) {
      await wire.apply(binder);
    }
  }
}

/**
 * Creates a group of TypeWire instances.
 * This is a convenience function that helps with type inference and linter rules.
 * It allows you to group wires without having to explicitly specify types or
 * deal with linter warnings about 'any' types.
 *
 * @template T The type of instances created by the wires
 * @param wires The TypeWire instances to group
 * @returns A TypeWireGroup containing the provided wires
 *
 * @example
 * ```ts
 * // Define a base type for your components
 * interface Service {
 *   start(): Promise<void>;
 * }
 *
 * // Create typed wires for each service
 * const DatabaseServiceWire = typeWireOf({
 *   token: 'DatabaseService',
 *   creator: () => new DatabaseService()
 * });
 *
 * const CacheServiceWire = typeWireOf({
 *   token: 'CacheService',
 *   creator: () => new CacheService()
 * });
 *
 * // Create a group of service wires
 * const serviceWires = typeWireGroupOf([
 *   DatabaseServiceWire,
 *   CacheServiceWire
 * ]);
 *
 * // Apply all wires in the group
 * await serviceWires.apply(container);
 * ```
 */
export function typeWireGroupOf<T>(wires: TypeWire<T>[]): TypeWireGroup<T>;
export function typeWireGroupOf(
  wires: TypeWire<AnyType>[],
): TypeWireGroup<AnyType>;
export function typeWireGroupOf(
  wires: TypeWire<AnyType>[],
): TypeWireGroup<AnyType> {
  return new StandardTypeWireGroup(wires);
}

/**
 * Combines multiple groups of TypeWire instances into a single group.
 * This is a convenience function that helps with type inference and linter rules,
 * similar to typeWireGroupOf but for combining multiple groups.
 *
 * @template T The type of instances created by the wires
 * @param wireGroups The groups of TypeWire instances to combine
 * @returns A single TypeWireGroup containing all wires
 *
 * @example
 * ```typescript
 * // Define your wire groups in separate files
 * // core.wires.ts
 * export const CoreWires = typeWireGroupOf([
 *   UserServiceWire,
 *   AuthServiceWire
 * ]);
 *
 * // feature.wires.ts
 * export const FeatureWires = typeWireGroupOf([
 *   FeatureServiceWire,
 *   FeatureControllerWire
 * ]);
 *
 * // Combine them in your app setup
 * const allWires = combineWireGroups([
 *   CoreWires,
 *   FeatureWires
 * ]);
 *
 * // Apply all wires
 * await allWires.apply(container);
 * ```
 */
export function combineWireGroups<T>(
  wireGroups: TypeWireGroup<T>[],
): TypeWireGroup<T>;
export function combineWireGroups(
  wireGroups: AnyTypeWireGroup[],
): AnyTypeWireGroup;
export function combineWireGroups(
  wireGroups: AnyTypeWireGroup[],
): AnyTypeWireGroup {
  const wires = wireGroups.flatMap((group) => group.wires);
  return new StandardTypeWireGroup(wires);
}

/**
 * A TypeWire that can create any type of instance.
 * This type is used internally to help with type inference and linter rules.
 * It allows TypeWire methods to work with any wire type without requiring
 * explicit type annotations or dealing with linter warnings.
 */
// biome-ignore lint/suspicious/noExplicitAny: Explicitly looking for any type
export type AnyTypeWire = TypeWire<any>;

/**
 * An array of TypeWire instances that can create any type of instance.
 * This type is used internally to help with type inference and linter rules,
 * similar to AnyTypeWire but for arrays of wires.
 */
// biome-ignore lint/suspicious/noExplicitAny: Explicitly looking for any type
export type AnyTypeWireGroup = TypeWireGroup<any>;

/**
 * Standard implementation of the ProviderDefinition interface.
 *
 * @template T The type of instance this provider creates
 */
export class StandardTypeWire<T> implements TypeWire<T> {
  /**
   * Creates a new StandardProvider.
   *
   * @param type The typed symbol that identifies this provider
   * @param creator The function that creates instances of type T
   * @param scope Optional scope that determines instance lifecycle
   */
  constructor(
    readonly type: TypeSymbol<T>,
    readonly creator: Creator<T>,
    readonly scope?: string,
    readonly imports?: AnyTypeWire[],
  ) {}
  /**
   * Registers this provider with a dependency binder.
   *
   * The binder owns its cached values: on a `TypeWireContainer`, re-applying a
   * wire for a token that is already bound replaces the binding but keeps any
   * value already created (or being created) for that token, so the new
   * binding only takes effect for values not yet created in that container.
   * Call `unbind` first to discard the cached value. An override that changes
   * the scope does not keep it: a singleton re-applied as `transient` runs the
   * new creator on every resolve.
   *
   * @param binder The dependency binder to register with
   * @returns A promise that resolves when registration is complete
   */
  async apply(binder: BindingContext): Promise<void> {
    if (this.imports) {
      for (const dep of this.imports) {
        if (!binder.isBound(dep.type)) {
          await dep.apply(binder);
        }
      }
    }

    await binder.bind(this);
  }

  /**
   * Retrieves an instance of type T synchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns An instance of type T
   * @throws Error if the instance cannot be resolved synchronously
   */
  getInstanceSync(resolver: ResolutionContext): T {
    try {
      return resolver.getSync(this.type);
    } catch (err: unknown) {
      if (err instanceof TypeWireError) {
        // getInstanceSync can be retried later with following occasions
        // 1. If this wire is for singleton scope.
        // 2. If the error we captured is specific to AsyncOnlyBinding
        //
        // This is because, if we were to make the sync invocation again
        // once singleton instance is pre-loaded, this getInstanceSync method will
        // succeed.
        if (err.retriable === undefined) {
          const wireScope = this.scope ?? ScopeSingleton;
          err.retriable = wireScope === ScopeSingleton;
        }
      }

      throw err;
    }
  }

  /**
   * Retrieves an instance of type T asynchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns A promise that resolves to an instance of type T
   */
  getInstance(resolver: ResolutionContext): Promise<T> {
    return resolver.get(this.type);
  }

  /**
   * Creates a new provider with the specified scope.
   * The original provider remains unchanged.
   *
   * @param scope The scope to use for the new provider
   * @returns A new provider with the updated scope
   */
  withScope(scope: string): TypeWire<T> {
    return new StandardTypeWire(this.type, this.creator, scope, this.imports);
  }

  /**
   * Creates a new provider with the specified implementation.
   * The original provider remains unchanged.
   *
   * @param create The creator function for the new provider
   * @returns A new provider with the updated implementation
   */
  withCreator(create: CreatorDecorator<T>): TypeWire<T> {
    return new StandardTypeWire(
      this.type,
      (ctx) => create(ctx, this.creator),
      this.scope,
      this.imports,
    );
  }
}

/**
 * Checks if a value is a Promise.
 * @template T The type of the promise's resolved value
 * @param value The value to check
 * @returns True if the value is a Promise, false otherwise
 */
function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

/**
 * Creates a TypeSymbol for the specified token.
 *
 * If possible use typeWireOf, rather than explicitly creating a symbol
 * yourself.
 *
 * A TypeWire instance exposes a TypeSymbol instance that can be
 * re-used by others.
 *
 * @template T The type to associate with the symbol
 * @param token A string identifier for debugging purposes
 * @returns A typed symbol for type T
 */
export function typeSymbolOf<T>(token: string): TypeSymbol<T> {
  return { symbol: Symbol(token) };
}

type ImportArrayOrObject = AnyTypeWire[] | Record<string, AnyTypeWire>;

type ResolvedImports<D> = {
  [K in keyof D]: D[K] extends TypeWire<infer U> ? U : never;
};

/**
 * Options for creating a provider.
 * @template T The type of instance the provider will create
 */
export interface TypeWireOpts<T, D extends ImportArrayOrObject> {
  /**
   * A string or symbol identifier for debugging purposes.
   */
  token: string | symbol;

  imports?: D;

  createWith?: (
    imports: ResolvedImports<D>,
    ctx: ResolutionContext,
  ) => T | Promise<T>;

  /**
   * The creator function that creates instances of type T.
   */
  creator?: Creator<T>;

  /**
   * Optional scope that determines instance lifecycle.
   * - 'singleton': One instance shared across all resolutions (default)
   * - 'transient': New instance created for each resolution
   */
  scope?: string;
}

/**
 * Creates a provider for instances of type T.
 * @template T The type of instance the provider will create
 * @param opts Options for creating the provider
 * @returns A provider definition for type T
 */
export function typeWireOf<T, D extends ImportArrayOrObject = AnyType>(
  opts: TypeWireOpts<T, D>,
): TypeWire<T> {
  const { token, imports, createWith, creator, scope } = opts;
  const typedSymbol =
    typeof token === "string" ? typeSymbolOf<T>(token) : { symbol: token };

  const defaultCreator = () => {
    throw new Error(
      `Not implemented yet. Please provide a creator or createWith for ${String(typedSymbol.symbol)}`,
    );
  };

  if (createWith) {
    let deps: AnyTypeWire[] | undefined;
    if (imports) {
      deps = [];
      for (const key in imports) {
        const wire = imports[key] as AnyTypeWire;
        if (wire) {
          deps.push(wire);
        }
      }
    }

    const autoCreator = async (ctx: ResolutionContext) => {
      if (imports) {
        let resolved: ResolvedImports<D>;
        if (Array.isArray(imports)) {
          resolved = [] as AnyType;
        } else {
          resolved = {} as AnyType;
        }

        for (const key in imports) {
          const wire = imports[key] as AnyTypeWire;
          if (wire) {
            const instance = await wire.getInstance(ctx);
            resolved[key] = instance;
          }
        }

        return createWith(resolved, ctx);
      }

      return createWith({} as AnyType, ctx);
    };

    return new StandardTypeWire(typedSymbol, autoCreator, scope, deps);
  }

  return new StandardTypeWire(typedSymbol, creator ?? defaultCreator, scope);
}

/**
 * Factory function type for creating monitor instances per resolution request.
 * The container calls it once per top-level `get`/`getSync` call; every
 * resolution made while serving that request uses the monitor it returns.
 *
 * @param opts The resolution request context information
 * @returns A new monitor instance for this specific resolution request
 */
export type ResolutionRequestMonitorFactory = (
  opts: ResolutionRequest,
) => ResolutionRequestMonitor;

/**
 * Options for configuring a TypeWire container.
 */
export interface TypeWireContianerOpts {
  /** Optional limit on how many path items to display in error messages */
  numberOfPathsToPrint?: number;

  /**
   * Factory function to create resolution monitors.
   * If not provided, the default CircularDependencyMonitor factory will be used.
   */
  resolutionRequestMonitorFactory?: ResolutionRequestMonitorFactory;
}

/**
 * Default implementation of the monitor factory that creates a new CircularDependencyMonitor
 * for each resolution request.
 *
 * @param opts The resolution request context
 * @returns A new CircularDependencyMonitor instance
 */
function defaultResolutionRequestMonitorFactory(
  opts: ResolutionRequest,
): ResolutionRequestMonitor {
  return new CircularDependencyMonitor(opts);
}

/**
 * A synchronous action that can be passed to the ResolutionMonitor.
 * @template T The type of the action's result
 * @throws {TypeWireError | Error} If the action fails
 */
export type SyncAction<T> = () => T;

/**
 * An asynchronous action that can be passed to the ResolutionMonitor.
 * @template T The type of the action's result
 * @throws {TypeWireError | Error} If the action fails
 */
export type AsyncAction<T> = () => T | Promise<T>;

/**
 * Represents a single resolution request: one top-level `get`/`getSync` call
 * on a container, including every resolution made while serving it.
 * Each request gets its own unique identifier, so errors can be correlated with it.
 */
export interface ResolutionRequest {
  /**
   * A unique identifier for this specific resolution request/chain.
   * Used to distinguish between concurrent resolution paths.
   */
  requestId: symbol;

  /**
   * Optional limit on how many path items to display in error messages.
   * Controls the verbosity of resolution path reporting in error messages.
   */
  numberOfPathsToPrint?: number;
}

/**
 * Observes dependency resolution for a single resolution request.
 *
 * The container creates one monitor per top-level `get`/`getSync` call. Every
 * resolution made while serving that request goes through it, including the
 * resolutions of concurrent branches (a creator that resolves several imports
 * at once), so a monitor must not assume that calls are nested.
 *
 * Circular dependency detection does not depend on the monitor: the container
 * checks each branch's own chain, whatever monitor is configured.
 *
 * This interface allows for custom monitoring implementations (logging, tracing, metrics).
 */
export interface ResolutionRequestMonitor {
  /**
   * Monitors a synchronous dependency resolution.
   * @template T The type of the resolution result
   * @param typeSymbol The typed symbol being resolved
   * @param action The synchronous resolution function to execute
   * @returns The result of the resolution function
   * @throws {TypeWireError | Error} If resolution fails
   */
  monitor<T>(typeSymbol: TypeSymbol<T>, action: SyncAction<T>): T;

  /**
   * Monitors an asynchronous dependency resolution.
   * @template T The type of the resolution result
   * @param typeSymbol The typed symbol being resolved
   * @param action The asynchronous resolution function to execute
   * @returns A promise that resolves to the result of the resolution function
   * @throws {TypeWireError | Error} If resolution fails
   */
  monitorAsync<T>(
    typeSymbol: TypeSymbol<T>,
    action: AsyncAction<T>,
  ): Promise<T>;
}

/**
 * The default implementation of ResolutionRequestMonitor. It tags every
 * TypeWireError raised while serving its request with the request's id.
 *
 * Despite its name, this monitor no longer detects circular dependencies
 * itself: a single stack shared by one request mistook concurrent sibling
 * resolutions for a cycle. The container now detects cycles for every request
 * (see {@link TypeWireContainer}), keeping one chain per branch.
 */
export class CircularDependencyMonitor implements ResolutionRequestMonitor {
  private readonly requestId: symbol;

  /**
   * Creates a new CircularDependencyMonitor.
   * @param opts Configuration options for the monitor. `numberOfPathsToPrint`
   *   is accepted for compatibility; the container formats resolution paths.
   */
  constructor(opts: {
    requestId: symbol;
    numberOfPathsToPrint?: number;
  }) {
    this.requestId = opts.requestId;
  }

  private tag(err: unknown) {
    if (err instanceof TypeWireError) {
      err.requestId = this.requestId;
    }
  }

  /**
   * Runs a synchronous resolution, tagging a TypeWireError it throws with the request id.
   * @template T The type being resolved
   * @param _typeSymbol The type symbol being resolved
   * @param action The action to perform
   * @returns The result of the action
   * @throws {TypeWireError | Error} If the action throws
   */
  monitor<T>(_typeSymbol: TypeSymbol<T>, action: SyncAction<T>): T {
    try {
      return action();
    } catch (err) {
      this.tag(err);
      throw err;
    }
  }

  /**
   * Runs an asynchronous resolution, tagging a TypeWireError it throws with the request id.
   * @template T The type of the resolution result
   * @param _typeSymbol The typed symbol being resolved
   * @param action The asynchronous resolution function to execute
   * @returns A promise that resolves to the result of the resolution function
   * @throws {TypeWireError | Error} If the action throws
   */
  async monitorAsync<T>(
    _typeSymbol: TypeSymbol<T>,
    action: AsyncAction<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (err: unknown) {
      this.tag(err);
      throw err;
    }
  }
}

/**
 * The possible reasons for a TypeWire error.
 * Can be one of the predefined reasons or a custom string.
 */
export type ErrorReason =
  | "BindingNotFound"
  | "AsyncOnlyBinding"
  | "CircularDependency"
  | "Unknown"
  | string;

/**
 * Error reason indicating that a dependency was not found in the container.
 */
const ReasonBindingNotFound: ErrorReason = "BindingNotFound";

/**
 * Error reason indicating that a dependency can only be resolved asynchronously.
 */
const ReasonAsyncOnlyBinding: ErrorReason = "AsyncOnlyBinding";

/**
 * Error reason indicating that a circular dependency was detected in the resolution chain.
 */
const ReasonCircularDependency: ErrorReason = "CircularDependency";

/**
 * Error class for TypeWire dependency resolution failures.
 * Provides detailed error messages including the resolution path and guidance.
 */
export class TypeWireError extends Error {
  public readonly reason: ErrorReason;

  /**
   * The unique identifier of the resolution request that triggered this error.
   * Used to correlate errors with specific resolution chains.
   */
  public requestId?: symbol;

  public retriable?: boolean;

  /**
   * Creates a new TypeWireError.
   * @param reason - The reason for the error
   * @param message - Optional custom error message
   */
  constructor(reason: ErrorReason, message?: string) {
    super(message);
    this.name = "TypeWireError";
    Object.setPrototypeOf(this, TypeWireError.prototype);
    Object.defineProperty(this, "reason", {
      value: reason,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    this.reason = reason;

    Object.defineProperty(this, "requestId", {
      value: undefined,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(this, "retriable", {
      value: undefined,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }

  /**
   * Creates a TypeWireError for a binding not found scenario.
   * @param message - Optional custom error message
   * @returns A new TypeWireError with BindingNotFound reason
   */
  static bindingNotFound(message?: string): TypeWireError {
    return new TypeWireError(ReasonBindingNotFound, message);
  }

  /**
   * Creates a TypeWireError for a circular dependency scenario.
   * @param message - Optional custom error message
   * @returns A new TypeWireError with CircularDependency reason
   */
  static circularDependency(message?: string): TypeWireError {
    return new TypeWireError(ReasonCircularDependency, message);
  }

  /**
   * Creates a TypeWireError for an async-only binding scenario.
   * @param message - Optional custom error message
   * @returns A new TypeWireError with AsyncOnlyBinding reason
   */
  static asyncBindingOnly(message?: string): TypeWireError {
    return new TypeWireError(ReasonAsyncOnlyBinding, message);
  }
}

/**
 * Options for creating a TypeWire error.
 */
export interface TypeWireErrorOpt {
  /**
   * The unique identifier for the resolution request that triggered the error.
   * Used to correlate errors with specific resolution chains.
   */
  requestId?: symbol;

  /** The reason for the error */
  reason: ErrorReason;

  /** The resolution path that led to the error */
  stack: TypeSymbol<unknown>[];

  /** Optional limit on how many path items to display in the error message */
  numberOfPathsToPrint?: number;
}

/**
 * Gets a human-readable instruction for resolving a TypeWire error.
 * @param opts The error options containing the reason and context
 * @returns A string containing guidance on how to resolve the error
 */
function getInstruction(opts: TypeWireErrorOpt): string {
  switch (opts.reason) {
    case ReasonAsyncOnlyBinding:
      return "Use `getInstance` to resolve this dependency asynchronously.";
    case ReasonBindingNotFound:
      return "Ensure the dependency is registered in the container before attempting resolution.";
    case ReasonCircularDependency:
      return "Check for circular references in your dependency graph and refactor to break the cycle.";
    default:
      return "Review the dependency configuration for potential issues.";
  }
}

/**
 * Formats the dependency resolution path for error messages.
 *
 * @param requestedType final requestedType. It is only present, if error is for circular dependency
 * @param stack The array of type symbols in the resolution path
 * @param numberOfPathsToPrint Optional limit on how many path items to display
 * @returns {[]string} path fragments in string
 */
function formatDependencyPath(
  stack: TypeSymbol<unknown>[],
  numberOfPathsToPrint?: number,
): string[] {
  let counts = 0;
  const maxNumberOfPaths = numberOfPathsToPrint ?? 0;
  const result: string[] = [];
  for (let i = 0; i < stack.length - 2; i++) {
    if (maxNumberOfPaths === 0 || counts < maxNumberOfPaths) {
      const elem = stack[i];
      const path = getDescription(elem);
      counts++;
      result.push(path);
    } else {
      break;
    }
  }

  // insert the truncation if needed
  if (counts < stack.length - 2) {
    result.push("...");
  }

  // insert the last
  if (stack.length - 2 >= 0) {
    result.push(`${getDescription(stack[stack.length - 2])}`);
  }
  result.push(`[${getDescription(stack[stack.length - 1])}]`);
  return result;
}

/**
 * Formats a complete error message with all components.
 * @param opts The error options containing all necessary context
 * @returns A formatted error message string
 */
function getErrorMessage(opts: TypeWireErrorOpt): string {
  const typeWire = opts.stack[opts.stack.length - 1];
  const connector = " -> ";
  const formattedPaths = formatDependencyPath(
    opts.stack,
    opts.numberOfPathsToPrint,
  );

  return `Failed To Resolve ${getDescription(typeWire)}
Reason: ${opts.reason}
Instruction: ${getInstruction(opts)}
Resolution Path: ${formattedPaths.join(connector)}
`;
}

/**
 * A creation in progress: one link of a resolution chain.
 *
 * Each creation the container starts gets its own frame, and its creator
 * receives a context bound to that frame. A chain is therefore the list of
 * frames from a context up through its parents, so concurrent branches of one
 * request (a creator resolving several imports at once) never see each other's
 * links, as they would with one stack shared by the whole request.
 */
interface ResolutionFrame {
  /** The type being created. */
  readonly type: AnyTypeSymbol;

  /** The unsettled frame whose creator started this creation, if any. */
  readonly parent: ResolutionFrame | undefined;

  /**
   * True once the creation has returned a value or its promise has settled.
   * A context whose frame has settled (a creator kept its context and
   * resolves through it later) resolves as part of the nearest unsettled
   * ancestor's chain, or as a fresh request when there is none.
   */
  settled: boolean;

  /**
   * What this creation waits on, with a count per frame: the nested
   * creations it started and the in-flight creations of other requests it
   * awaits. These edges make up the wait-for graph that detects a cycle
   * running through another request's in-flight creation.
   */
  readonly waitsOn: Map<ResolutionFrame, number>;
}

/**
 * An in-flight creation of a singleton.
 */
interface RunningResolution<T> {
  /** Settles with the created value; the value is cached first if this entry is still current. */
  readonly promise: Promise<T>;

  /** The frame of the creation. */
  readonly frame: ResolutionFrame;
}

/**
 * Returns the unsettled frames of a chain, outermost first.
 */
function activeChain(frame: ResolutionFrame | undefined): ResolutionFrame[] {
  const chain: ResolutionFrame[] = [];
  for (let current = frame; current; current = current.parent) {
    if (!current.settled) {
      chain.push(current);
    }
  }
  return chain.reverse();
}

function addWait(from: ResolutionFrame, to: ResolutionFrame) {
  from.waitsOn.set(to, (from.waitsOn.get(to) ?? 0) + 1);
}

function removeWait(from: ResolutionFrame, to: ResolutionFrame) {
  const count = (from.waitsOn.get(to) ?? 0) - 1;
  if (count > 0) {
    from.waitsOn.set(to, count);
  } else {
    from.waitsOn.delete(to);
  }
}

/**
 * Follows the wait-for graph from `start` and returns a path of frames that
 * ends in one of `targets`, or undefined if none is reachable.
 */
function findWaitPath(
  start: ResolutionFrame,
  targets: ReadonlySet<ResolutionFrame>,
): ResolutionFrame[] | undefined {
  const visited = new Set<ResolutionFrame>();
  const visit = (frame: ResolutionFrame): ResolutionFrame[] | undefined => {
    if (targets.has(frame)) {
      return [frame];
    }
    if (frame.settled || visited.has(frame)) {
      return undefined;
    }

    visited.add(frame);
    for (const next of frame.waitsOn.keys()) {
      const path = visit(next);
      if (path) {
        return [frame, ...path];
      }
    }
    return undefined;
  };

  return visit(start);
}

/**
 * ResolutionState wraps internal state shared between ResolutionContext for handling followings:
 *
 * 1. All of TypeWire bindings indexed by symbol
 * 2. Loaded singleton instances indexed by symbol
 * 3. In-flight async resolutions of singleton wires indexed by symbol
 *
 * This class serves as the internal state management for TypeWireContainer, handling the storage
 * and retrieval of bindings, singleton instances, and tracking of in-progress async resolutions.
 * It is not exposed to users directly but is used internally by TypeWireContainer to manage
 * dependency injection state.
 */
class ResolutionState {
  /**
   * Map of symbols to their provider definitions.
   * This map stores all registered TypeWire bindings, allowing for quick lookup
   * of providers by their associated type symbols.
   */
  private readonly bindings: Map<symbol, TypeWire<unknown>> = new Map();

  /**
   * Map of symbols to their singleton instances.
   * This map caches resolved singleton instances, ensuring that subsequent
   * resolutions of the same type return the same instance.
   */
  private readonly singletons: Map<symbol, unknown> = new Map();

  /**
   * Map of symbols of in-flight async resolution for singleton wires.
   * This map tracks ongoing async resolutions to prevent duplicate resolution
   * attempts for the same type while a resolution is in progress.
   */
  private readonly resolutions: Map<symbol, RunningResolution<unknown>> =
    new Map();

  /**
   * Gets the provider definition for a type symbol.
   * @template T The type of instance the provider creates
   * @param typeSymbol The type symbol to get the provider for
   * @returns The provider definition
   * @throws Error if no provider is found for the symbol
   */
  getBinding<T>(typeSymbol: TypeSymbol<T>): TypeWire<T> {
    const binding = this.bindings.get(typeSymbol.symbol);
    if (!binding) {
      throw TypeWireError.bindingNotFound();
    }

    return binding as TypeWire<T>;
  }

  /**
   * Retrieves all registered TypeWire bindings.
   * @returns An array of all registered TypeWire instances
   */
  getAllBindings(): AnyTypeWire[] {
    return Array.from([...this.bindings.values()]);
  }

  /**
   * Checks if a type symbol has a registered binding.
   * @param typeSymbol The type symbol to check
   * @returns true if a binding exists for the symbol, false otherwise
   */
  isBound(typeSymbol: AnyTypeSymbol): boolean {
    return this.bindings.has(typeSymbol.symbol);
  }

  /**
   * Registers a TypeWire binding, replacing any existing binding for the same symbol.
   * A singleton instance or in-flight resolution already held for the symbol is kept.
   * @param wire The TypeWire instance to register
   */
  bind(wire: AnyTypeWire): void {
    this.bindings.set(wire.type.symbol, wire);
  }

  /**
   * Removes a binding and its associated singleton instance and resolution.
   * This method is used to clean up resources when a binding is no longer needed.
   * A creation still in flight keeps running for the callers already waiting
   * on it, but its value is not cached (see `registerResolution`).
   * @param typeSymbol The type symbol to unbind
   */
  async unbind(typeSymbol: AnyTypeSymbol): Promise<void> {
    this.bindings.delete(typeSymbol.symbol);
    this.singletons.delete(typeSymbol.symbol);
    this.resolutions.delete(typeSymbol.symbol);
  }

  /**
   * Checks if a singleton instance is cached for a type symbol.
   * A cached instance may be any value, including falsy ones such as `0` or `null`.
   * @param typeSymbol The type symbol to check
   * @returns true if a singleton instance is cached, false otherwise
   */
  hasSingletonValue(typeSymbol: AnyTypeSymbol): boolean {
    return this.singletons.has(typeSymbol.symbol);
  }

  /**
   * Gets the cached singleton instance for a type symbol.
   * @template T The type of the singleton instance
   * @param typeSymbol The type symbol to get the singleton for
   * @returns The singleton instance if it exists, undefined otherwise
   */
  getSingletonValue<T>(typeSymbol: TypeSymbol<T>): T | undefined {
    return this.singletons.get(typeSymbol.symbol) as T | undefined;
  }

  /**
   * Gets the in-flight creation for a type symbol.
   * @template T The type of the instance being resolved
   * @param typeSymbol The type symbol to get the resolution for
   * @returns The running resolution if one exists, undefined otherwise
   */
  getRunningResolution<T>(
    typeSymbol: TypeSymbol<T>,
  ): RunningResolution<T> | undefined {
    return this.resolutions.get(typeSymbol.symbol) as
      | RunningResolution<T>
      | undefined;
  }

  /**
   * Registers an in-flight creation and caches its value once it resolves.
   *
   * Only the current entry for the symbol may touch the cache: a creation
   * that `unbind` outlived finds another entry (or none) when it settles, so
   * it neither caches its value nor removes the newer entry. The value is
   * cached only if none is cached yet, so the first value cached for a
   * binding is the one every later caller gets.
   * @template T The type of the instance being resolved
   * @param typeSymbol The type symbol being resolved
   * @param created The promise that will resolve to the instance
   * @param frame The frame of the creation
   * @returns The promise that settles once the value is cached
   */
  registerResolution<T>(
    typeSymbol: TypeSymbol<T>,
    created: Promise<T>,
    frame: ResolutionFrame,
  ): Promise<T> {
    const symbol = typeSymbol.symbol;
    const isCurrent = () => this.resolutions.get(symbol) === running;
    const promise = created
      .then((value) => {
        if (isCurrent() && !this.singletons.has(symbol)) {
          this.singletons.set(symbol, value);
        }
        return value;
      })
      .finally(() => {
        if (isCurrent()) {
          this.resolutions.delete(symbol);
        }
      });

    const running: RunningResolution<T> = { promise, frame };
    this.resolutions.set(symbol, running);
    return promise;
  }

  /**
   * Directly registers a singleton instance for a type symbol.
   * This method is used to manually set a singleton instance, bypassing the resolution process.
   * @template T The type of the singleton instance
   * @param typeSymbol The type symbol to register the singleton for
   * @param result The singleton instance to register
   */
  registerSingleton<T>(typeSymbol: TypeSymbol<T>, result: T) {
    this.singletons.set(typeSymbol.symbol, result);
  }
}

/**
 * Provides a resolution context for one link of a resolution chain.
 *
 * Each resolution operation (get/getSync) in the container starts with a fresh
 * root instance of this context, with its own monitor. Each creation the
 * context starts gets its own {@link ResolutionFrame}, and the creator receives
 * a child context bound to that frame. Circular dependencies are detected from
 * the frame chain, so concurrent branches of one request (a creator resolving
 * several imports at once) never mistake each other for a cycle.
 */
class ScopedResolutionContext implements ResolutionContext {
  constructor(
    /**
     * A resolutionState shared between TypeWireContainer and ScopedResolutionContext
     */
    private readonly resolutionState: ResolutionState,

    /**
     * The monitor of the request this context serves. It is shared by every
     * context of the request.
     */
    private readonly resolutionRequestMonitor: ResolutionRequestMonitor,

    /**
     * Optional limit on how many path items to display in error messages.
     */
    private readonly numberOfPathsToPrint?: number,

    /**
     * The creation whose creator received this context; undefined for the
     * root context of a request.
     */
    private readonly frame?: ResolutionFrame,
  ) {}

  /**
   * Gets an instance of type T asynchronously.
   * Supports both synchronous and asynchronous creators.
   * @template T The type of instance to get
   * @param typeSymbol The type symbol identifying the dependency
   * @returns A promise that resolves to an instance of type T
   * @throws Error if the dependency is not found or if a circular dependency is detected
   */
  async get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
    const chain = activeChain(this.frame);
    return this.resolutionRequestMonitor.monitorAsync(typeSymbol, async () => {
      try {
        this.checkChain(chain, typeSymbol);
        const binding = this.resolutionState.getBinding(typeSymbol);
        const creator = binding.creator;
        const scope = binding.scope ?? ScopeSingleton;

        if (scope === ScopeSingleton) {
          if (this.resolutionState.hasSingletonValue(typeSymbol)) {
            return this.resolutionState.getSingletonValue(typeSymbol) as T;
          }

          const running = this.resolutionState.getRunningResolution(typeSymbol);
          if (running) {
            return await this.awaitRunning(chain, running);
          }

          const frame = this.startFrame(chain, typeSymbol);
          const created = this.runCreator(creator, frame);
          if (!isPromise<T>(created)) {
            this.resolutionState.registerSingleton(typeSymbol, created);
            return created;
          }

          return await this.resolutionState.registerResolution(
            typeSymbol,
            created,
            frame,
          );
        }

        const frame = this.startFrame(chain, typeSymbol);
        return await this.runCreator(creator, frame);
      } catch (err: unknown) {
        throw this.describe(err, chain, typeSymbol);
      }
    });
  }

  /**
   * Gets an instance of type T synchronously.
   * Only supports synchronous creators.
   *
   * A singleton whose creation is already in flight throws `AsyncOnlyBinding`
   * without running its creator again; a later `get` (or a `getSync` after
   * the creation settles) returns the value that creation produces.
   * @template T The type of instance to get
   * @param typeSymbol The type symbol identifying the dependency
   * @returns An instance of type T
   * @throws Error if the dependency is not found, if the creator is asynchronous,
   *         or if a circular dependency is detected
   */
  getSync<T>(typeSymbol: TypeSymbol<T>): T {
    const chain = activeChain(this.frame);
    return this.resolutionRequestMonitor.monitor(typeSymbol, () => {
      try {
        this.checkChain(chain, typeSymbol);
        const binding = this.resolutionState.getBinding(typeSymbol);
        const creator = binding.creator;
        const scope = binding.scope ?? ScopeSingleton;

        if (scope === ScopeSingleton) {
          if (this.resolutionState.hasSingletonValue(typeSymbol)) {
            return this.resolutionState.getSingletonValue(typeSymbol) as T;
          }

          if (this.resolutionState.getRunningResolution(typeSymbol)) {
            throw TypeWireError.asyncBindingOnly();
          }

          const frame = this.startFrame(chain, typeSymbol);
          const result = this.runCreator(creator, frame);
          if (isPromise<T>(result)) {
            // Nobody awaits this promise here; a later `get` picks it up. Its
            // rejection reaches that caller, so it is not reported as unhandled.
            this.resolutionState
              .registerResolution(typeSymbol, result, frame)
              .catch(() => undefined);
            throw TypeWireError.asyncBindingOnly();
          }

          this.resolutionState.registerSingleton(typeSymbol, result);
          return result;
        }

        const frame = this.startFrame(chain, typeSymbol);
        const result = this.runCreator(creator, frame);
        if (isPromise(result)) {
          throw TypeWireError.asyncBindingOnly();
        }

        return result;
      } catch (err: unknown) {
        throw this.describe(err, chain, typeSymbol);
      }
    });
  }

  /**
   * Throws `CircularDependency` if the type is already being created in this chain.
   */
  private checkChain(chain: ResolutionFrame[], typeSymbol: AnyTypeSymbol) {
    if (chain.some((frame) => frame.type.symbol === typeSymbol.symbol)) {
      throw TypeWireError.circularDependency();
    }
  }

  /**
   * Awaits another request's in-flight creation, unless that creation waits,
   * directly or through further waits, on a creation in this chain. Awaiting
   * it then would never settle, so this throws `CircularDependency` instead.
   */
  private async awaitRunning<T>(
    chain: ResolutionFrame[],
    running: RunningResolution<T>,
  ): Promise<T> {
    const waiter = chain[chain.length - 1];
    if (!waiter) {
      return running.promise;
    }

    const cycle = findWaitPath(running.frame, new Set(chain));
    if (cycle) {
      throw TypeWireError.circularDependency(
        getErrorMessage({
          reason: ReasonCircularDependency,
          stack: [...chain, ...cycle].map((frame) => frame.type),
          numberOfPathsToPrint: this.numberOfPathsToPrint,
        }),
      );
    }

    addWait(waiter, running.frame);
    try {
      return await running.promise;
    } finally {
      removeWait(waiter, running.frame);
    }
  }

  /**
   * Starts a frame for a creation made by the innermost unsettled creation of the chain.
   */
  private startFrame(
    chain: ResolutionFrame[],
    typeSymbol: AnyTypeSymbol,
  ): ResolutionFrame {
    const parent = chain[chain.length - 1];
    const frame: ResolutionFrame = {
      type: typeSymbol,
      parent,
      settled: false,
      waitsOn: new Map(),
    };
    if (parent) {
      addWait(parent, frame);
    }
    return frame;
  }

  /**
   * Runs a creator with a context bound to its frame, and settles the frame
   * once the creator returns a value or its promise settles.
   */
  private runCreator<T>(
    creator: Creator<T>,
    frame: ResolutionFrame,
  ): T | Promise<T> {
    const settle = () => {
      frame.settled = true;
      if (frame.parent) {
        removeWait(frame.parent, frame);
      }
    };

    let result: T | Promise<T>;
    try {
      result = creator(
        new ScopedResolutionContext(
          this.resolutionState,
          this.resolutionRequestMonitor,
          this.numberOfPathsToPrint,
          frame,
        ),
      );
    } catch (err) {
      settle();
      throw err;
    }

    if (isPromise<T>(result)) {
      result.then(settle, settle);
    } else {
      settle();
    }
    return result;
  }

  /**
   * Gives a TypeWireError without a message one that names the failed type and its resolution path.
   */
  private describe(
    err: unknown,
    chain: ResolutionFrame[],
    typeSymbol: AnyTypeSymbol,
  ): unknown {
    if (err instanceof TypeWireError && !err.message) {
      err.message = getErrorMessage({
        reason: err.reason,
        stack: [...chain.map((frame) => frame.type), typeSymbol],
        numberOfPathsToPrint: this.numberOfPathsToPrint,
      });
    }
    return err;
  }
}

/**
 * The main container that manages dependencies.
 * Implements both ResolutionContext and BindingContext interfaces.
 *
 * Resolution and circular dependency detection:
 * - Each call to get() or getSync() creates a fresh resolution context with its own monitor
 * - Each creation gets its own link in a resolution chain, and its creator receives a
 *   context bound to that link, so concurrent branches (several imports resolved at
 *   once) keep separate chains and are never mistaken for a cycle
 * - Resolving a type already being created in the same chain throws `CircularDependency`
 * - Concurrent first resolves of a singleton share one creation; awaiting another
 *   request's in-flight creation that waits, directly or through further waits, on the
 *   caller's own chain throws `CircularDependency` instead of never settling
 * - `getSync` on a singleton whose creation is in flight throws `AsyncOnlyBinding`
 *   without running the creator again
 */
export class TypeWireContainer implements ResolutionContext, BindingContext {
  /**
   * Internal state management for bindings, singletons, and resolutions
   */
  private readonly resolutionState: ResolutionState;

  /**
   * Factory function for creating resolution monitors
   */
  private readonly resolutionMonitorFactory: ResolutionRequestMonitorFactory;

  /**
   * Optional limit on how many path items to display in error messages
   */
  private readonly numberOfPathsToPrint?: number;

  /**
   * Counter for generating unique request IDs
   */
  private requestSequence = 0;

  /**
   * Creates a new TypeWireContainer.
   * @param opts Optional configuration options
   */
  constructor(opts?: TypeWireContianerOpts) {
    this.resolutionState = new ResolutionState();
    this.resolutionMonitorFactory =
      opts?.resolutionRequestMonitorFactory ??
      defaultResolutionRequestMonitorFactory;
    this.numberOfPathsToPrint = opts?.numberOfPathsToPrint;
  }

  /**
   * Generates the next sequence number for request IDs.
   * This is used as part of creating unique identifiers for each resolution request,
   * helping with debugging and error tracking across concurrent resolution chains.
   *
   * @returns The next sequence number, resetting to 1 if max safe integer is reached
   * @private
   */
  private getNextRequestId(): number {
    let nextSequence = 0;
    // arbitraty number to limit
    if (this.requestSequence >= Number.MAX_SAFE_INTEGER) {
      nextSequence = 1;
    } else {
      nextSequence = this.requestSequence + 1;
    }
    this.requestSequence = nextSequence;
    return nextSequence;
  }

  /**
   * Binds a provider to the container, replacing any existing binding for the same type.
   * A singleton instance already created for the type is kept; use `unbind` to discard it.
   * @param provider The provider to bind
   */
  bind(wire: AnyTypeWire): void {
    this.resolutionState.bind(wire);
  }

  /**
   * Checks if a binding exists in the container.
   * @param typeSymbol The type symbol to check
   * @returns True if the binding exists, false otherwise
   */
  isBound(typeSymbol: AnyTypeSymbol): boolean {
    return this.resolutionState.isBound(typeSymbol);
  }

  /**
   * Removes a binding from the container.
   * Also removes any singleton instances of the binding. A creation still in
   * flight settles for the callers already waiting on it, but its value is
   * never cached, so a resolve after re-binding starts a new creation.
   * @param typeSymbol The type symbol identifying the binding to remove
   */
  async unbind(typeSymbol: AnyTypeSymbol): Promise<void> {
    await this.resolutionState.unbind(typeSymbol);
  }

  /**
   * Creates a fresh root resolution context for a single resolution request,
   * with its own monitor.
   *
   * @returns A new ScopedResolutionContext with its own monitor
   * @private
   */
  private getScopedResolutionContext(): ResolutionContext {
    const resoltionRequest = {
      requestId: Symbol(this.getNextRequestId()),
      numberOfPathsToPrint: this.numberOfPathsToPrint,
    } satisfies ResolutionRequest;

    const monitor = this.resolutionMonitorFactory(resoltionRequest);
    return new ScopedResolutionContext(
      this.resolutionState,
      monitor,
      this.numberOfPathsToPrint,
    );
  }

  /**
   * Gets an instance of type T asynchronously.
   * Supports both synchronous and asynchronous creators.
   * @template T The type of instance to get
   * @param typeSymbol The type symbol identifying the dependency
   * @returns A promise that resolves to an instance of type T
   * @throws Error if the dependency is not found or if a circular dependency is detected
   */
  async get<T>(typeSymbol: TypeSymbol<T>): Promise<T> {
    const context = this.getScopedResolutionContext();
    return context.get(typeSymbol);
  }

  /**
   * Gets all instances from the container asynchronously.
   * @returns A promise that resolves to a map of all instances
   */
  async getAllAsync(): Promise<Map<symbol, unknown>> {
    const result = new Map<symbol, unknown>();
    for (const binding of this.resolutionState.getAllBindings()) {
      result.set(binding.type.symbol, await this.get(binding.type));
    }

    return result;
  }

  /**
   * Gets an instance of type T synchronously.
   * Only supports synchronous creators.
   * @template T The type of instance to get
   * @param typeSymbol The type symbol identifying the dependency
   * @returns An instance of type T
   * @throws Error if the dependency is not found, if the creator is asynchronous,
   *         or if a circular dependency is detected
   */
  getSync<T>(typeSymbol: TypeSymbol<T>): T {
    const context = this.getScopedResolutionContext();
    return context.getSync(typeSymbol);
  }
}
