# TypeWire

TypeWire is a lightweight, container-agnostic dependency injection library for TypeScript that provides strong typing with minimal overhead.

## Features

- 🔒 **Strongly typed** - Full TypeScript support with no type casting
- 🌱 **Lightweight** - Small bundle size with no external dependencies
- 🔌 **Container-agnostic** - Works with any container through adapters
- 🧩 **Immutable definitions** - Functional API for composing and reusing definitions
- ⚡ **Async support** - First-class support for asynchronous dependency resolution
- 🔍 **Circular dependency detection** - Automatically detects circular dependencies
- 🧠 **Smart scoping** - Support for singleton, transient, and request scopes

## Packages

- [@typewirets/core](./packages/core/README.md) - Core TypeWire functionality
- [@typewirets/inversify](./packages/inversify/README.md) - InversifyJS adapter

## Documentation

In addition to the README files in each package, we provide several documents that explain the design philosophy and usage patterns of TypeWire:

- [**Design Philosophy**](./docs/design-philosophy.md) - Understand the principles and decisions behind TypeWire
- [**DI Solution Guide**](./docs/di-solution-guide.md) - Compare TypeWire with other dependency injection solutions
- [**Value Proposition**](./docs/value-proposition.md) - Learn about the unique benefits TypeWire offers

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
async function setup() {
  await loggerWire.apply(container);
  await userServiceWire.apply(container);
  
  // Resolve and use a service
  const userService = userServiceWire.getInstance(container);
  userService.getUser('123');
}

setup();
```

## License

MIT
