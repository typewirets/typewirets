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

/**
 * Gets the description of a type symbol.
 * @param typeSymbol - The type symbol to get the description for
 * @returns The description of the symbol, or "unknown" if none exists
 */
function getDescription(typeSymbol: TypeSymbol<unknown>): string {
  return typeSymbol.symbol.description ?? "unknown";
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
   * Binds a Typewire to the container.
   *
   * @param typeWire The Typewire to bind
   */
  bind(typeWire: AnyTypeWire): void;

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
  /**
   * The array of TypeWire instances in this group.
   */
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
   * @param wires The TypeWire instances to include in this group
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
  ) {}

  /**
   * Registers this provider with a dependency binder.
   *
   * @param binder The dependency binder to register with
   * @returns A promise that resolves when registration is complete
   */
  async apply(binder: BindingContext): Promise<void> {
    if (binder.isBound(this.type)) {
      binder.unbind(this.type);
    }

    binder.bind(this);
  }

  /**
   * Retrieves an instance of type T synchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns An instance of type T
   * @throws Error if the instance cannot be resolved synchronously
   */
  getInstanceSync(resolver: ResolutionContext): T {
    return resolver.getSync(this.type);
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
    return new StandardTypeWire(this.type, this.creator, scope);
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

/**
 * Options for creating a provider.
 * @template T The type of instance the provider will create
 */
export interface TypeWireOpts<T> {
  /**
   * A string or symbol identifier for debugging purposes.
   */
  token: string | symbol;

  /**
   * The creator function that creates instances of type T.
   */
  creator: Creator<T>;

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
export function typeWireOf<T>(opts: TypeWireOpts<T>): TypeWire<T> {
  const { token, creator, scope } = opts;
  const typedSymbol =
    typeof token === "string" ? typeSymbolOf<T>(token) : { symbol: token };
  return new StandardTypeWire(typedSymbol, creator, scope);
}

/**
 * Options for configuring a TypeWire container.
 */
export interface TypeWireContianerOpts {
  /** Optional custom resolution monitor for tracking dependency resolution */
  resolutionMonitor?: ResolutionMonitor;
  /** Optional limit on how many path items to display in error messages */
  numberOfPathsToPrint?: number;
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
 * Monitors dependency resolution to detect issues and collect information.
 * This interface allows for custom monitoring implementations.
 */
export interface ResolutionMonitor {
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
 * Tracks dependency resolution and detects circular dependencies.
 * This is the default implementation of ResolutionMonitor.
 */
export class CircularDependencyMonitor implements ResolutionMonitor {
  /**
   * Set of symbols currently being resolved.
   */
  private readonly resolutionSet: Set<symbol> = new Set();

  /**
   * The current resolution path.
   */
  private readonly resolutionStack: TypeSymbol<unknown>[] = [];

  /**
   * Optional limit on how many path items to display in error messages.
   */
  private readonly numberOfPathsToPrint?: number;

  /**
   * Creates a new CircularDependencyMonitor.
   * @param opts Configuration options for the monitor
   */
  constructor(opts: {
    numberOfPathsToPrint?: number;
  }) {
    this.numberOfPathsToPrint = opts.numberOfPathsToPrint;
  }

  /**
   * Adds a type symbol to the resolution set and stack.
   * @param typeSymbol The type symbol to add
   */
  private add(typeSymbol: TypeSymbol<unknown>) {
    this.resolutionSet.add(typeSymbol.symbol);
    this.resolutionStack.push(typeSymbol);
  }

  /**
   * Removes a type symbol from the resolution set and stack.
   * @param typeSymbol The type symbol to remove
   */
  private remove(typeSymbol: TypeSymbol<unknown>) {
    this.resolutionSet.delete(typeSymbol.symbol);
    this.resolutionStack.pop();
  }

  /**
   * Monitors the resolution of a type symbol to detect circular dependencies.
   * @template T The type being resolved
   * @param typeSymbol The type symbol being resolved
   * @param action The action to perform
   * @returns The result of the action
   * @throws Error if a circular dependency is detected
   */
  monitor<T>(typeSymbol: TypeSymbol<T>, action: SyncAction<T>): T {
    if (this.resolutionSet.has(typeSymbol.symbol)) {
      throw TypeWireError.circularDependency();
    }

    this.add(typeSymbol);
    try {
      return action();
    } catch (err) {
      if (err instanceof TypeWireError && !err.message) {
        err.message = getErrorMessage({
          type: typeSymbol,
          reason: err.reason,
          paths: [...this.resolutionStack],
          numberOfPathsToPrint: this.numberOfPathsToPrint,
        });
      }
      throw err;
    } finally {
      this.remove(typeSymbol);
    }
  }

  /**
   * Tracks an asynchronous dependency resolution, detecting circular dependencies.
   * @template T The type of the resolution result
   * @param typeSymbol The typed symbol being resolved
   * @param action The asynchronous resolution function to execute
   * @returns A promise that resolves to the result of the resolution function
   * @throws {TypeWireError | Error} If a circular dependency is detected or action throws
   */
  async monitorAsync<T>(
    typeSymbol: TypeSymbol<T>,
    action: AsyncAction<T>,
  ): Promise<T> {
    try {
      // Check for circular dependency
      if (this.resolutionSet.has(typeSymbol.symbol)) {
        throw TypeWireError.circularDependency();
      }

      // Add to resolution stack
      this.add(typeSymbol);

      // Execute the resolution action
      return await action();
    } catch (err: unknown) {
      if (err instanceof TypeWireError && !err.message) {
        err.message = getErrorMessage({
          type: typeSymbol,
          reason: err.reason,
          paths: [...this.resolutionStack],
          numberOfPathsToPrint: this.numberOfPathsToPrint,
        });
      }

      throw err;
    } finally {
      // Remove from resolution stack when done
      this.remove(typeSymbol);
    }
  }

  /**
   * Checks if the tracker is currently resolving any dependencies.
   * @returns True if any dependencies are being resolved, false otherwise
   */
  isResolving(): boolean {
    return this.resolutionStack.length > 0;
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
  /** The type symbol that failed to resolve */
  type: TypeSymbol<unknown>;

  /** The reason for the error */
  reason: ErrorReason;

  /** The resolution path that led to the error */
  paths: TypeSymbol<unknown>[];

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
 * @param paths The array of type symbols in the resolution path
 * @param numberOfPathsToPrint Optional limit on how many path items to display
 * @returns An object containing the formatted path and any truncation prefix
 */
function formatDependencyPath(
  paths: TypeSymbol<unknown>[],
  numberOfPathsToPrint?: number,
): { prefix: string; formattedPath: string } {
  const connector = " -> ";
  let prefix = "";
  let depsToPrint = [...paths];

  if (
    numberOfPathsToPrint !== undefined &&
    depsToPrint.length > numberOfPathsToPrint
  ) {
    const size = depsToPrint.length;
    const rest = size - numberOfPathsToPrint;
    prefix = `truncated(${rest})... ${connector}`;
    depsToPrint = depsToPrint.slice(size - numberOfPathsToPrint, size);
  }

  return {
    prefix,
    formattedPath: depsToPrint.map(getDescription).join(connector),
  };
}

/**
 * Formats a complete error message with all components.
 * @param opts The error options containing all necessary context
 * @returns A formatted error message string
 */
function getErrorMessage(opts: TypeWireErrorOpt): string {
  const paths =
    opts.reason === ReasonCircularDependency
      ? [...opts.paths, opts.type]
      : opts.paths;

  const { prefix, formattedPath } = formatDependencyPath(
    paths,
    opts.numberOfPathsToPrint,
  );

  return `Failed To Resolve ${getDescription(opts.type)}
Reason: ${opts.reason}
Instruction: ${getInstruction(opts)}
Resolution Path: [${prefix}${formattedPath}]
`;
}

/**
 * The main container that manages dependencies.
 * Implements both ResolutionContext and BindingContext interfaces.
 */
export class TypeWireContainer implements ResolutionContext, BindingContext {
  /**
   * Map of symbols to their provider definitions.
   */
  private readonly bindings: Map<symbol, TypeWire<unknown>>;

  /**
   * Map of symbols to their singleton instances.
   */
  private readonly singletons: Map<symbol, unknown>;

  /**
   * Dependency tracker for detecting circular dependencies.
   */
  private readonly resolutionMonitor: ResolutionMonitor;

  /**
   * Creates a new TypeWireContainer.
   * @param opts Optional configuration options
   */
  constructor(opts?: TypeWireContianerOpts) {
    this.bindings = new Map();
    this.singletons = new Map();
    this.resolutionMonitor =
      opts?.resolutionMonitor ??
      new CircularDependencyMonitor({
        numberOfPathsToPrint: opts?.numberOfPathsToPrint,
      });
  }

  /**
   * Binds a provider to the container.
   * @param provider The provider to bind
   */
  bind(provider: AnyTypeWire): void {
    this.bindings.set(provider.type.symbol, provider);
  }

  /**
   * Checks if a binding exists in the container.
   * @param typeSymbol The type symbol to check
   * @returns True if the binding exists, false otherwise
   */
  isBound(typeSymbol: AnyTypeSymbol): boolean {
    return this.bindings.has(typeSymbol.symbol);
  }

  /**
   * Removes a binding from the container.
   * Also removes any singleton instances of the binding.
   * @param typeSymbol The type symbol identifying the binding to remove
   */
  async unbind(typeSymbol: AnyTypeSymbol): Promise<void> {
    this.bindings.delete(typeSymbol.symbol);
    this.singletons.delete(typeSymbol.symbol);
  }

  /**
   * Gets the provider definition for a type symbol.
   * @template T The type of instance the provider creates
   * @param typeSymbol The type symbol to get the provider for
   * @returns The provider definition
   * @throws Error if no provider is found for the symbol
   */
  private getBinding<T>(typeSymbol: TypeSymbol<T>): TypeWire<T> {
    const binding = this.bindings.get(typeSymbol.symbol);
    if (!binding) {
      throw TypeWireError.bindingNotFound();
    }

    return binding as TypeWire<T>;
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
    return this.resolutionMonitor.monitorAsync(typeSymbol, async () => {
      const binding = this.getBinding(typeSymbol);
      const creator = binding.creator;
      const scope = binding.scope ?? ScopeSingleton;

      if (scope === ScopeSingleton) {
        const singleton = this.singletons.get(typeSymbol.symbol);
        if (singleton) {
          return singleton as T;
        }

        const result = await binding.creator(this);
        this.singletons.set(typeSymbol.symbol, result);
        return result as T;
      }

      return (await creator(this)) as T;
    });
  }

  /**
   * Gets all instances from the container asynchronously.
   * @returns A promise that resolves to a map of all instances
   */
  async getAllAsync(): Promise<Map<symbol, unknown>> {
    const result = new Map<symbol, unknown>();
    for (const binding of this.bindings.values()) {
      result.set(binding.type.symbol, await binding.getInstance(this));
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
    return this.resolutionMonitor.monitor(typeSymbol, () => {
      const binding = this.getBinding(typeSymbol);
      const creator = binding.creator;
      const scope = binding.scope ?? ScopeSingleton;

      if (scope === ScopeSingleton) {
        const singleton = this.singletons.get(typeSymbol.symbol);
        if (singleton) {
          return singleton as T;
        }

        const result = creator(this);
        if (isPromise(result)) {
          throw TypeWireError.asyncBindingOnly();
        }

        this.singletons.set(typeSymbol.symbol, result);
        return result as T;
      }

      const result = creator(this);
      if (isPromise(result)) {
        throw TypeWireError.asyncBindingOnly();
      }

      return result as T;
    });
  }
}
