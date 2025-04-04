/**
 * A typed wrapper around JavaScript's Symbol that preserves type information
 * at compile time while providing unique identification at runtime.
 *
 * @template _T The type associated with this symbol. It is only used for type check.
 *
 * Note: We cannot use `type TypedSymbol<_T> = symbol` because TypeScript is structurally typed,
 * meaning type aliases are checked by their structure, not their name. This leads to type erasure
 * where the generic parameter T is effectively ignored during type checking because all instances
 * resolve to the same underlying type (symbol).
 *
 * For example:
 * ```typescript
 * type TypedSymbol<T> = symbol;
 *
 * // These are considered the same type by TypeScript:
 * const userSymbol: TypedSymbol<User> = Symbol('user');
 * const loggerSymbol: TypedSymbol<Logger> = userSymbol; // No error! 😱
 * ```
 *
 * By using an object wrapper:
 * ```typescript
 * type TypedSymbol<T> = { symbol: symbol };
 * ```
 *
 * We create a "nominal type" that maintains the relationship with T:
 * ```typescript
 * const userSymbol: TypedSymbol<User> = { symbol: Symbol('user') };
 * const loggerSymbol: TypedSymbol<Logger> = userSymbol; // Error! Types are not compatible 👍
 * ```
 *
 * This is a common pattern in TypeScript known as "branded types" or "phantom types",
 * where we use the structure of the type to enforce nominal typing behavior.
 *
 * For more information on TypeScript's structural type system, see:
 * - TypeScript Handbook on Type Compatibility: https://www.typescriptlang.org/docs/handbook/type-compatibility.html
 * - TypeScript FAQ on Nominal Types: https://github.com/Microsoft/TypeScript/wiki/FAQ#can-i-make-a-type-alias-nominal
 */
export type TypedSymbol<_T> = {
  /**
   * The underlying JavaScript Symbol
   */
  symbol: symbol;
};

function getDescription(typedSymbol: TypedSymbol<unknown>): string {
  return typedSymbol.symbol.description ?? "unknown";
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
   * @param typedSymbol The typed symbol identifying the dependency
   * @returns An instance of type T
   * @throws Error if the dependency cannot be resolved synchronously or is not found
   */
  get<T>(typedSymbol: TypedSymbol<T>): T;

  /**
   * Gets an instance of type T asynchronously.
   *
   * @template T The type of instance to get
   * @param typedSymbol The typed symbol identifying the dependency
   * @returns A promise that resolves to an instance of type T
   * @throws Error if the dependency is not found
   */
  getAsync<T>(typedSymbol: TypedSymbol<T>): Promise<T>;
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
  // biome-ignore lint/suspicious/noExplicitAny: bind can take any type of wiring definition
  bind(typeWire: TypeWireDefinition<any>): void;

  /**
   * Removes a binding from the container.
   *
   * @param typedSymbol The typed symbol identifying the binding to remove
   */
  // biome-ignore lint/suspicious/noExplicitAny: unbind can take any type of typed symbol
  unbind(typedSymbol: TypedSymbol<any>): Promise<void>;

  /**
   * Checks if a binding exists in the container.
   *
   * @param typedSymbol The typed symbol to check
   * @returns True if the binding exists, false otherwise
   */
  // biome-ignore lint/suspicious/noExplicitAny: isBound can take any TypeSymbol
  isBound(typedSymbol: TypedSymbol<any>): boolean;
}

/**
 * A creator function that creates instances of type T.
 *
 * @template T The type of instance to create
 * @param container The dependency resolver to use for resolving dependencies
 * @returns An instance of type T or a Promise that resolves to an instance of type T
 */
export type Creator<T> = (context: ResolutionContext) => T | Promise<T>;

export type CreatorDecorator<T> =
  | Creator<T>
  | ((context: ResolutionContext, creator: Creator<T>) => T | Promise<T>);

/**
 * Defines a provider for creating and retrieving typed instances.
 * Providers are immutable definitions that describe how to create
 * instances of a specific type and how they should be managed.
 *
 * @template T The type of instance this provider creates
 */
export interface TypeWireDefinition<T> {
  /**
   * The unique typed symbol that identifies this provider.
   */
  readonly type: TypedSymbol<T>;

  /**
   * The scope that determines instance lifecycle.
   * - 'singleton': One instance shared across all resolutions (default)
   * - 'transient': New instance created for each resolution
   * - 'request': One instance per resolution context
   */
  readonly scope?: string;

  /**
   * The creator function that creates instances of type T.
   */
  readonly creator: Creator<T>;

  /**
   * Registers this provider with a dependency binder.
   *
   * @param binder The dependency binder to register with
   * @returns A promise that resolves when registration is complete
   */
  apply(binder: BindingContext): void | Promise<void>;

  /**
   * Retrieves an instance of type T synchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns An instance of type T
   * @throws Error if the instance cannot be resolved synchronously
   */
  getInstance(resolver: ResolutionContext): T;

  /**
   * Retrieves an instance of type T asynchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns A promise that resolves to an instance of type T
   */
  getInstanceAsync(resolver: ResolutionContext): Promise<T>;

  /**
   * Creates a new provider with the specified scope.
   * The original provider remains unchanged.
   *
   * @param scope The scope to use for the new provider
   * @returns A new provider with the updated scope
   */
  withScope(scope: string): TypeWireDefinition<T>;

  /**
   * Creates a new provider with the specified implementation.
   * The original provider remains unchanged.
   *
   * @param create The creator function for the new provider
   * @returns A new provider with the updated implementation
   */
  withCreator(create: CreatorDecorator<T>): TypeWireDefinition<T>;
}

/**
 * Standard implementation of the ProviderDefinition interface.
 *
 * @template T The type of instance this provider creates
 */
export class StandardTypeWire<T> implements TypeWireDefinition<T> {
  /**
   * Creates a new StandardProvider.
   *
   * @param type The typed symbol that identifies this provider
   * @param creator The function that creates instances of type T
   * @param scope Optional scope that determines instance lifecycle
   */
  constructor(
    readonly type: TypedSymbol<T>,
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
  getInstance(resolver: ResolutionContext): T {
    return resolver.get(this.type);
  }

  /**
   * Retrieves an instance of type T asynchronously.
   *
   * @param resolver The dependency resolver to use
   * @returns A promise that resolves to an instance of type T
   */
  getInstanceAsync(resolver: ResolutionContext): Promise<T> {
    return resolver.getAsync(this.type);
  }

  /**
   * Creates a new provider with the specified scope.
   * The original provider remains unchanged.
   *
   * @param scope The scope to use for the new provider
   * @returns A new provider with the updated scope
   */
  withScope(scope: string): TypeWireDefinition<T> {
    return new StandardTypeWire(this.type, this.creator, scope);
  }

  /**
   * Creates a new provider with the specified implementation.
   * The original provider remains unchanged.
   *
   * @param create The creator function for the new provider
   * @returns A new provider with the updated implementation
   */
  withCreator(create: CreatorDecorator<T>): TypeWireDefinition<T> {
    return new StandardTypeWire(
      this.type,
      (ctx) => create(ctx, this.creator),
      this.scope,
    );
  }
}

/**
 * Creates a typed symbol for the specified token.
 *
 * @template T The type to associate with the symbol
 * @param token A string identifier for debugging purposes
 * @returns A typed symbol for type T
 */
export function typedSymbolOf<T>(token: string): TypedSymbol<T> {
  return { symbol: Symbol(token) };
}

/**
 * Options for creating a provider.
 *
 * @template T The type of instance the provider will create
 */
export interface TypeWireOpts<T> {
  /**
   * A string identifier for debugging purposes.
   */
  token: string;

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
 *
 * @template T The type of instance the provider will create
 * @param opts Options for creating the provider
 * @returns A provider definition for type T
 */
export function typeWireOf<T>(opts: TypeWireOpts<T>): TypeWireDefinition<T> {
  const { token, creator, scope } = opts;
  const typedSymbol = typedSymbolOf<T>(token);
  return new StandardTypeWire(typedSymbol, creator, scope);
}

/**
 * Helper function to check if a value is a Promise.
 *
 * @template T The type of the promise value
 * @param value The value to check
 * @returns True if the value is a Promise, false otherwise
 */
function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

export interface TypeWireContianerOpts {
  resolutionMonitor?: ResolutionMonitor;
  numberOfPathsToPrint?: number;
}

/**
 * Represents the possible reasons for a TypeWire error.
 * Can be one of the predefined reasons or a custom string.
 */
export type ErrorReason =
  | "NotFound"
  | "AsyncOnly"
  | "CircularDependency"
  | "Unknown"
  | string;

/**
 * Error reason indicating that a dependency was not found in the container.
 */
const ReasonNotFound: ErrorReason = "NotFound";

/**
 * Error reason indicating that a dependency can only be resolved asynchronously.
 */
const ReasonAsyncOnly: ErrorReason = "AsyncOnly";

/**
 * Error reason indicating that a circular dependency was detected in the resolution chain.
 */
const ReasonCircularDependency: ErrorReason = "CircularDependency";

/**
 * Internal error class used to propagate error reasons without exposing resolution details.
 * This helps maintain clean error handling while preserving the error context.
 */
class InternalTypeWireError extends Error {
  constructor(readonly reason: ErrorReason) {
    super(reason);
  }
}

/**
 * Options for creating a TypeWire error.
 */
export interface TypeWireErrorOpt {
  /** The type symbol that failed to resolve */
  type: TypedSymbol<unknown>;
  /** The reason for the resolution failure */
  reason: ErrorReason;
  /** The resolution path that led to the error */
  paths: TypedSymbol<unknown>[];
  /** Optional limit on how many path items to display in the error message */
  numberOfPathsToPrint?: number;
}

/**
 * Gets a human-readable instruction for resolving the error based on its reason.
 * @param opts - The error options containing the reason and context
 * @returns A string containing guidance on how to resolve the error
 */
function getInstruction(opts: TypeWireErrorOpt): string {
  switch (opts.reason) {
    case ReasonNotFound:
      return "Ensure the dependency is registered in the container before attempting resolution.";
    case ReasonAsyncOnly:
      return "Use `getInstanceAsync` to resolve this dependency asynchronously.";
    case ReasonCircularDependency:
      return "Check for circular references in your dependency graph and refactor to break the cycle.";
    default:
      return "Review the dependency configuration for potential issues.";
  }
}

/**
 * Formats the dependency resolution path for error messages.
 * Handles truncation when the path exceeds the specified length limit.
 * @param paths - The array of type symbols in the resolution path
 * @param numberOfPathsToPrint - Optional limit on how many path items to display
 * @returns An object containing the formatted path and any truncation prefix
 */
function formatDependencyPath(
  paths: TypedSymbol<unknown>[],
  numberOfPathsToPrint?: number,
): { prefix: string; formattedPath: string } {
  const connector = " -> ";
  let prefix = "";
  let depsToPrint = [...paths];
  
  if (numberOfPathsToPrint !== undefined && depsToPrint.length > numberOfPathsToPrint) {
    const size = depsToPrint.length;
    const rest = size - numberOfPathsToPrint;
    prefix = `truncated(${rest})... ${connector}`;
    depsToPrint = depsToPrint.slice(size - numberOfPathsToPrint, size);
  }
  
  return {
    prefix,
    formattedPath: depsToPrint.map(getDescription).join(connector)
  };
}

/**
 * Formats a complete error message with all components.
 * Includes the error header, reason, resolution instruction, and the resolution path.
 * @param opts - The error options containing all necessary context
 * @returns A formatted error message string
 */
function getErrorMessage(opts: TypeWireErrorOpt): string {
  const paths = opts.reason === ReasonCircularDependency 
    ? [...opts.paths, opts.type] 
    : opts.paths;
    
  const { prefix, formattedPath } = formatDependencyPath(paths, opts.numberOfPathsToPrint);

  return `Failed To Resolve ${getDescription(opts.type)}
Reason: ${opts.reason}
Instruction: ${getInstruction(opts)}
Resolution Path: [${prefix}${formattedPath}]
`;
}

/**
 * Error class for TypeWire dependency resolution failures.
 * Provides detailed error messages including the resolution path and guidance.
 */
export class TypeWireError extends Error {
  constructor(opts: TypeWireErrorOpt) {
    super(getErrorMessage(opts));
    this.name = "TypeWireError";
  }
}

/**
 * The main container that manages dependencies.
 * Implements both ResolutionContext and BindingContext interfaces.
 */
export class TypeWireContainer implements ResolutionContext, BindingContext {
  /**
   * Map of symbols to their provider definitions.
   */
  private readonly bindings: Map<symbol, TypeWireDefinition<unknown>>;

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
   *
   * @param provider The provider to bind
   */
  // biome-ignore lint/suspicious/noExplicitAny: bind can take any type
  bind(provider: TypeWireDefinition<any>): void {
    this.bindings.set(provider.type.symbol, provider);
  }

  /**
   * Checks if a binding exists in the container.
   *
   * @param typedSymbol The typed symbol to check
   * @returns True if the binding exists, false otherwise
   */
  // biome-ignore lint/suspicious/noExplicitAny: isBound can take any type
  isBound(typedSymbol: TypedSymbol<any>): boolean {
    return this.bindings.has(typedSymbol.symbol);
  }

  /**
   * Removes a binding from the container.
   * Also removes any singleton instances of the binding.
   *
   * @param typedSymbol The typed symbol identifying the binding to remove
   */
  // biome-ignore lint/suspicious/noExplicitAny: unbind can take any type
  async unbind(typedSymbol: TypedSymbol<any>): Promise<void> {
    this.bindings.delete(typedSymbol.symbol);
    this.singletons.delete(typedSymbol.symbol);
  }

  /**
   * Gets the provider definition for a typed symbol.
   *
   * @template T The type of instance the provider creates
   * @param typedSymbol The typed symbol to get the provider for
   * @returns The provider definition
   * @throws Error if no provider is found for the symbol
   */
  private getBinding<T>(typedSymbol: TypedSymbol<T>): TypeWireDefinition<T> {
    const binding = this.bindings.get(typedSymbol.symbol);
    if (!binding) {
      throw new InternalTypeWireError(ReasonNotFound);
    }

    return binding as TypeWireDefinition<T>;
  }

  /**
   * Gets an instance of type T asynchronously.
   * Supports both synchronous and asynchronous creators.
   *
   * @template T The type of instance to get
   * @param typedSymbol The typed symbol identifying the dependency
   * @returns A promise that resolves to an instance of type T
   * @throws Error if the dependency is not found or if a circular dependency is detected
   */
  async getAsync<T>(typedSymbol: TypedSymbol<T>): Promise<T> {
    return this.resolutionMonitor.monitorAsync(typedSymbol, async () => {
      const binding = this.getBinding(typedSymbol);
      const creator = binding.creator;
      const scope = binding.scope ?? "singleton";

      if (scope === "singleton") {
        const singleton = this.singletons.get(typedSymbol.symbol);
        if (singleton) {
          return singleton as T;
        }

        const result = await binding.creator(this);
        this.singletons.set(typedSymbol.symbol, result);
        return result as T;
      }

      const result = (await creator(this)) as T;
      if (!result) {
        throw new InternalTypeWireError(ReasonNotFound);
      }

      return result;
    });
  }

  async getAllAsync(): Promise<Map<symbol, unknown>> {
    const result = new Map<symbol, unknown>();
    for (const binding of this.bindings.values()) {
      result.set(binding.type.symbol, await binding.getInstanceAsync(this));
    }

    return result;
  }

  /**
   * Gets an instance of type T synchronously.
   * Only supports synchronous creators.
   *
   * @template T The type of instance to get
   * @param typedSymbol The TypedSymbol identifying the dependency
   * @returns An instance of type T
   * @throws Error if the dependency is not found, if the creator is asynchronous,
   *         or if a circular dependency is detected
   */
  get<T>(typedSymbol: TypedSymbol<T>): T {
    return this.resolutionMonitor.monitor(typedSymbol, () => {
      const binding = this.getBinding(typedSymbol);
      const creator = binding.creator;
      const scope = binding.scope ?? "singleton";

      if (scope === "singleton") {
        const singleton = this.singletons.get(typedSymbol.symbol);
        if (singleton) {
          return singleton as T;
        }

        const result = creator(this);
        if (isPromise(result)) {
          throw new InternalTypeWireError(ReasonNotFound);
        }

        this.singletons.set(typedSymbol.symbol, result);
        return result as T;
      }

      const result = creator(this);
      if (isPromise(result)) {
        throw new InternalTypeWireError(ReasonNotFound);
      }

      return result as T;
    });
  }
}

/**
 * Monitors dependency resolution to detect issues and collect information
 */
export interface ResolutionMonitor {
  /**
   * Monitors a synchronous dependency resolution
   *
   * @template T The type of the resolution result
   * @param typedSymbol The TypedSymbol being resolved
   * @param action The synchronous resolution function to execute
   * @returns The result of the resolution function
   */
  monitor<T>(typedSymbol: TypedSymbol<T>, action: () => T): T;

  /**
   * Monitors an asynchronous dependency resolution
   *
   * @template T The type of the resolution result
   * @param typedSymbol The TypedSymbol being resolved
   * @param action The asynchronous resolution function to execute
   * @returns A promise that resolves to the result of the resolution function
   */
  monitorAsync<T>(
    typedSymbol: TypedSymbol<T>,
    action: () => Promise<T>,
  ): Promise<T>;
}

/**
 * Tracks dependency resolution and detects circular dependencies.
 */
export class CircularDependencyMonitor implements ResolutionMonitor {
  /**
   * Set of symbols currently being resolved.
   */
  private readonly resolutionSet: Set<symbol> = new Set();

  /**
   * The current resolution path.
   */
  private readonly resolutionStack: TypedSymbol<unknown>[] = [];

  private readonly numberOfPathsToPrint?: number;

  constructor(opts: {
    numberOfPathsToPrint?: number;
  }) {
    this.numberOfPathsToPrint = opts.numberOfPathsToPrint;
  }

  private add(typedSymbol: TypedSymbol<unknown>) {
    this.resolutionSet.add(typedSymbol.symbol);
    this.resolutionStack.push(typedSymbol);
  }

  private remove(typedSymbol: TypedSymbol<unknown>) {
    this.resolutionSet.delete(typedSymbol.symbol);
    this.resolutionStack.pop();
  }

  /**
   * Tracks a dependency resolution, detecting circular dependencies.
   *
   * @template T The type of the resolution result
   * @param typedSymbol The TypedSymbol being resolved
   * @param action The resolution function to execute
   * @returns The result of the resolution function
   * @throws Error if a circular dependency is detected
   */
  monitor<T>(typedSymbol: TypedSymbol<T>, action: () => T): T {
    // Check for circular dependency
    if (this.resolutionSet.has(typedSymbol.symbol)) {
      throw new TypeWireError({
        type: typedSymbol,
        reason: ReasonCircularDependency,
        paths: [...this.resolutionStack],
        numberOfPathsToPrint: this.numberOfPathsToPrint,
      });
    }

    try {
      // Add to resolution stack
      this.add(typedSymbol);

      // Execute the resolution action
      return action();
    } catch (err: unknown) {
      if (err instanceof InternalTypeWireError) {
        throw new TypeWireError({
          type: typedSymbol,
          reason: err.reason,
          paths: [...this.resolutionStack],
          numberOfPathsToPrint: this.numberOfPathsToPrint,
        });
      }

      throw err;
    } finally {
      // Remove from resolution stack when done
      this.remove(typedSymbol);
    }
  }

  /**
   * Tracks a dependency resolution, detecting circular dependencies.
   *
   * @template T The type of the resolution result
   * @param typedSymbol The TypedSymbol being resolved
   * @param action The resolution function to execute
   * @returns The result of the resolution function
   * @throws Error if a circular dependency is detected
   */
  async monitorAsync<T>(
    typedSymbol: TypedSymbol<T>,
    action: () => T | Promise<T>,
  ): Promise<T> {
    // Check for circular dependency
    if (this.resolutionSet.has(typedSymbol.symbol)) {
      throw new TypeWireError({
        type: typedSymbol,
        reason: ReasonCircularDependency,
        paths: [...this.resolutionStack],
        numberOfPathsToPrint: this.numberOfPathsToPrint,
      });
    }

    try {
      // Add to resolution stack
      this.add(typedSymbol);

      // Execute the resolution action
      return await action();
    } catch (err: unknown) {
      if (err instanceof InternalTypeWireError) {
        throw new TypeWireError({
          type: typedSymbol,
          reason: err.reason,
          paths: [...this.resolutionStack],
          numberOfPathsToPrint: this.numberOfPathsToPrint,
        });
      }

      throw err;
    } finally {
      // Remove from resolution stack when done
      this.remove(typedSymbol);
    }
  }

  /**
   * Checks if the tracker is currently resolving any dependencies.
   *
   * @returns True if any dependencies are being resolved, false otherwise
   */
  isResolving(): boolean {
    return this.resolutionStack.length > 0;
  }
}
