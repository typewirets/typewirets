# TypeWire Core

A lightweight, container-agnostic dependency injection library for TypeScript that provides strong typing with minimal overhead.

## Features

- 🔒 **Strongly typed** - Full TypeScript support with no type casting
- 🌱 **Lightweight** - Small bundle size with no external dependencies
- 🔌 **Container-agnostic** - Works with any container through adapters
- 🧩 **Immutable definitions** - Functional API for composing and reusing definitions
- ⚡ **Async support** - First-class support for asynchronous dependency resolution
- 🔍 **Circular dependency detection** - Automatically detects circular dependencies
- 🧠 **Smart scoping** - Support for singleton and transient scopes

## Why TypeWire?

TypeWire is designed to shift focus from object creation to behavior composition. By abstracting away the complexities of instantiation, developers can:

- **Focus on behavior rather than construction** - Write code that uses objects for what they do, not how they're created
- **Compose behaviors more easily** - Build complex systems by combining simpler, well-defined components
- **Separate concerns more cleanly** - Decouple what an object does from how it's created and configured
- **Improve testability** - Replace real implementations with test doubles without changing consumer code

The goal is to let you think more about interactions between components and less about their instantiation details, making your code more maintainable and your architecture more flexible.

## Installation

```bash
npm install @typewirets/core
```

## Core Concepts

### TypeSymbol

A typed wrapper around JavaScript's Symbol that preserves type information at compile time.

```typescript
import { typeSymbolOf } from '@typewirets/core';

const userSymbol = typeSymbolOf<User>('User');
```

### TypeWire

Defines how to create and manage instances of a specific type.

```typescript
import { typeWireOf } from '@typewirets/core';

const userWire = typeWireOf({
  token: 'User',
  creator: (ctx) => new User()
});
```

### TypeWireGroup

A collection of TypeWire instances that can be managed together.

```typescript
import { typeWireGroupOf, combineWireGroups } from '@typewirets/core';

// Create a group of wires
const serviceWires = typeWireGroupOf([userWire, loggerWire]);

// Apply all wires in the group
await serviceWires.apply(container);

// Combine multiple groups
const allWires = combineWireGroups([coreWires, featureWires]);
```

### TypeWireContainer

The default implementation of both ResolutionContext and BindingContext.

```typescript
import { TypeWireContainer } from '@typewirets/core';

const container = new TypeWireContainer();

// Register dependencies
await userWire.apply(container);

// Resolve instances
const user = await userWire.getInstance(container);
const syncUser = userWire.getInstanceSync(container);
```

## Best Practices

1. **Singleton-First Approach**:
   - Use singleton scope for most services
   - Makes code easier to reason about
   - Better resource management
   - Clearer separation of concerns
   - **Encourages behavior abstraction** - When working with singletons, developers naturally focus on what objects do rather than how they're constructed
   - **Promotes composition** - Singletons make it easier to compose behaviors by providing stable references to components
   - **Shifts focus from creation to usage** - The emphasis moves from object instantiation to object interaction and behavior

2. **Explicit Dependencies**:
   - Pass dependencies explicitly
   - Avoid request/context scopes
   - Makes testing easier
   - Improves code maintainability

3. **Async Initialization**:
   - Handle async setup in creators
   - Use getAllInstances for parallel loading
   - Cache results for better performance

4. **Type Safety**:
   - Define clear interfaces
   - Use type inference where possible
   - Leverage TypeScript's type system

## License

MIT 