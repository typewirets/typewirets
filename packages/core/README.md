# TypeWire Core

A lightweight, container-agnostic dependency injection library for TypeScript that provides strong typing with minimal overhead.

## Features

- 🔒 **Strongly typed** - Full TypeScript support with no type casting
- 🌱 **Lightweight** - Small bundle size with no external dependencies
- 🔌 **Container-agnostic** - Works with any container through adapters
- 🧩 **Immutable definitions** - Functional API for composing and reusing definitions
- ⚡ **Async support** - First-class support for asynchronous dependency resolution
- 🔍 **Circular dependency detection** - Automatically detects circular dependencies
- 🧠 **Smart scoping** - Support for singleton, and transient scopes

## Installation

```bash
npm install @typewirets/core
```

## Basic Usage

```typescript
import { typeWireOf, TypeWireContainer } from '@typewirets/core';

// Define your services
class Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

class UserService {
  constructor(private logger: Logger) {}

  getUser(id: string): void {
    this.logger.log(`Getting user with id: ${id}`);
    // Implementation...
  }
}

// Create TypeWire definitions
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

const userServiceWire = typeWireOf({
  token: 'UserService',
  creator: (ctx) => new UserService(loggerWire.getInstance(ctx))
});

// Create a container
const container = new TypeWireContainer();

// Register the dependencies (using async/await)
async function setupContainer() {
  await loggerWire.apply(container);
  await userServiceWire.apply(container);
  
  // Resolve and use a service
  const userService = userServiceWire.getInstance(container);
  userService.getUser('123');
}

setupContainer();
```

## Scopes and Recommended Strategy

TypeWire supports different scopes to control the lifecycle of your dependencies:

```typescript
// Singleton scope (default) - one instance for all resolutions
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger(),
  scope: 'singleton'
});

// Transient scope - new instance for each resolution
const transientLogger = typeWireOf({
  token: 'Logger',
  creator: () => new Logger(),
  scope: 'transient'
});
```

### Recommended Scoping Strategy

While TypeWire supports various scoping options, we recommend focusing primarily on:

1. **Singleton scope** (default) for most dependencies
2. **Transient scope** for specific use cases where isolation is required

### Why We Encourage Singleton-First Approach:

- **Reasoning Simplicity**: Singleton services create a clearer mental model of your application, making code easier to reason about and debug
  
- **Clean Separation of Concerns**: 
  - Singleton services are ideal for encapsulating non-declarative, side-effect producing code
  - This allows the rest of your application to remain more declarative and functional
  
- **Resource Management**: Singleton services better manage resources like connections, caches, and other expensive resources
  
- **Testability**: Services with explicit dependencies are easier to mock and test compared to those that rely on contextual information

- **Domain Logic Isolation**: Singleton services provide natural boundaries for domain logic, improving maintainability

### When to Use Transient Scope:

- When a service must maintain internal state that cannot be shared
- For factories that produce objects with different configurations
- During testing to ensure isolation between test cases

### Avoiding Request/Context Scopes:

While other DI frameworks emphasize request-scoped dependencies, we believe this often leads to:

1. Hidden dependencies on request context
2. Harder-to-test code that relies on runtime context
3. Less reusable components with implicit environmental requirements
4. Blurred boundaries between application layers

Instead, we recommend passing contextual information explicitly as method parameters when needed, keeping your dependency graph clean and explicit.

## Async Dependencies

TypeWire has first-class support for asynchronous dependencies:

```typescript
const databaseWire = typeWireOf({
  token: 'Database',
  creator: async () => {
    const connection = await connectToDatabase();
    return new Database(connection);
  }
});

// Apply the definition (must use await)
await databaseWire.apply(container);

// Resolve asynchronously
const database = await databaseWire.getInstanceAsync(container);
```

## Composing Definitions

TypeWire definitions are immutable, allowing for easy composition. This is particularly useful for testing scenarios where you need to replace real implementations with mocks or add instrumentation:

```typescript
// Start with a basic definition
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

// For tests: Replace with a mock implementation
const mockLoggerWire = loggerWire.withCreator(() => new MockLogger());

// For tests: Add spy to monitor calls
const spyLoggerWire = loggerWire.withCreator((ctx, original) => {
  const logger = original(ctx);
  jest.spyOn(logger, 'log');
  return logger;
});

// Change scope for testing isolation
const transientLoggerWire = loggerWire.withScope('transient');
```

**Important Note**: These definitions all share the same symbol (type identifier). When applied to a container, the last one applied will override any previous bindings with the same symbol:

```typescript
// In production code
await loggerWire.apply(container);

// In test code - this will replace the original binding
await mockLoggerWire.apply(container);
```

If you need different bindings to coexist in the same container, you should create them with different tokens:

```typescript
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

const debugLoggerWire = typeWireOf({
  token: 'DebugLogger', // Different token = different symbol
  creator: () => {
    const logger = new Logger();
    logger.level = 'debug';
    return logger;
  }
});

// Both can be registered without conflict
await loggerWire.apply(container);
await debugLoggerWire.apply(container);
```

## Core Interfaces

### TypeWire<T>

The central interface defining how to create and manage an instance of type `T`:

```typescript
interface TypeWire<T> {
  readonly type: TypeSymbol<T>;
  readonly scope?: string;
  readonly creator: Creator<T>;
  
  apply(binder: BindingContext): Promise<void>;
  getInstance(resolver: ResolutionContext): T;
  getInstanceAsync(resolver: ResolutionContext): Promise<T>;
  withScope(scope: string): TypeWire<T>;
  withCreator(create: CreatorDecorator<T>): TypeWire<T>;
}
```

### ResolutionContext

Provides methods to resolve dependencies:

```typescript
interface ResolutionContext {
  get<T>(symbol: TypedSymbol<T>): T;
  getAsync<T>(symbol: TypedSymbol<T>): Promise<T>;
}
```

### BindingContext

Provides methods to register dependencies:

```typescript
interface BindingContext {
  bind(typeWire: TypeWireDefinition<unknown>): void | Promise<void>;
  unbind(symbol: TypedSymbol<unknown>): void;
  isBound(symbol: TypedSymbol<unknown>): boolean;
}
```

### TypeWireGroup

A group of TypeWire instances that can be managed together. This interface extends `Applicable`, allowing you to apply all wires in the group at once.

```typescript
interface TypeWireGroup<T> extends Applicable {
  /**
   * The array of TypeWire instances in this group.
   */
  wires: TypeWire<T>[];
}
```

The library provides a standard implementation through `StandardTypeWireGroup`:

```typescript
class StandardTypeWireGroup<T> implements TypeWireGroup<T> {
  constructor(readonly wires: TypeWire<T>[]) {}

  async apply(binder: BindingContext) {
    for (const wire of this.wires) {
      await wire.apply(binder);
    }
  }
}
```

You can create groups of wires using `typeWireGroupOf`:

```typescript
// Define a base type for your components
interface Service {
  start(): Promise<void>;
}

// Create typed wires for each service
const DatabaseServiceWire = typeWireOf({
  token: 'DatabaseService',
  creator: () => new DatabaseService()
});

const CacheServiceWire = typeWireOf({
  token: 'CacheService',
  creator: () => new CacheService()
});

// Create a group of service wires
const serviceWires = typeWireGroupOf([
  DatabaseServiceWire,
  CacheServiceWire
]);

// Apply all wires in the group at once
await serviceWires.apply(container);
```

You can also combine multiple groups using `combineWireGroups`:

```typescript
// Define your wire groups in separate files
// core.wires.ts
export const CoreWires = typeWireGroupOf([
  UserServiceWire,
  AuthServiceWire
]);

// feature.wires.ts
export const FeatureWires = typeWireGroupOf([
  FeatureServiceWire,
  FeatureControllerWire
]);

// Combine them in your app setup
const allWires = combineWireGroups([
  CoreWires,
  FeatureWires
]);

// Apply all wires at once
await allWires.apply(container);
```

The `TypeWireGroup` interface provides several benefits:
1. **Type Safety**: All wires in the group must create instances of the same type
2. **Convenience**: Apply all wires in a group with a single call
3. **Organization**: Group related wires together for better code organization
4. **Composition**: Combine multiple groups into larger groups as needed
5. **Debugging**: The standard implementation makes it easy to debug wire groups

## Error Handling

TypeWire provides clear error messages to help with debugging dependency issues. The error messages follow this format:

```
[Error Type] Error resolving [ServiceName]
Path: ServiceA -> ServiceB -> ServiceC
Resolution: [Specific instructions based on error type]
```

The error messages are designed to be:
- Clear and actionable
- Include the full dependency path
- Provide specific resolution instructions
- Easy to parse for error tracking tools

You can customize how many path items are shown in error messages:

```typescript
const container = new TypeWireContainer({
  numberOfPathsToPrint: 5 // Limit path length in error messages
});
```

## Ecosystem Comparison

For a detailed comparison of TypeWire with other DI solutions, including bundle size comparisons and key differentiators, see our [Ecosystem Comparison](docs/ecosystem-comparison.md) documentation.

## License

MIT 