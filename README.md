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

// Define your domain types
interface User {
  id: string;
  name: string;
  email: string;
}

// Define your services
class Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

class UserService {
  constructor(private logger: Logger) {}

  async getUser(id: string): Promise<User | undefined> {
    this.logger.log(`Getting user with id: ${id}`);
    // Simulate database lookup
    if (id === '123') {
      return {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      };
    }
    return undefined;
  }
}

// Create TypeWire definitions
// Note: Logger is a singleton by default
const LoggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

// UserService depends on Logger and is also a singleton
const UserServiceWire = typeWireOf({
  token: 'UserService',
  // Specify dependencies using imports
  imports: {
    logger: LoggerWire,
  },
  // Dependencies are automatically injected with createWith
  createWith({ logger }) {
    return new UserService(logger);
  },
});

// Create and use the container
async function main() {
  const container = new TypeWireContainer();

  // Register all dependencies (including nested ones)
  await UserServiceWire.apply(container);

  // Resolve and use services
  const userService = await UserServiceWire.getInstance(container);
  const user = await userService.getUser('123');
}

main();
```

### Testing

TypeWire makes testing easy with its flexible wire system. Here are some common testing patterns:

```typescript
// Group related wires for testing
const testWires = typeWireGroupOf([
  LoggerWire,
  UserServiceWire,
]);

async function setup(testWireFragment: Applicable) {
  const container = new TypeWireContainer();
  await testWireFragment.apply(container);
  return container;
}

test('userService returns mock user for known ID', async () => {

  const mockUser = {
    id: 'known',
    name: 'Mock User',
    email: 'mock@example.com'
  } satisfies User;

  const mockedWires = testWires.withExtraWires([
    UserServiceWire.withCreator(() => {
      return {
        async getUser(id: string): Promise<User | undefined> {
          if (id === 'known') {
            return mockUser;
          }
          return undefined;
        }
      };
    })
  ]);

  const container = await setup(mockedWires);
  const userService = await UserServiceWire.getInstance(container);
  const user = await userService.getUser('known');
  
  expect(user).toBeDefined();
  expect(user).toBe(mockUser);
});

test('userService logs when retrieving user', async () => {
  const mockedWires = testWires.withExtraWires([
    LoggerWire.withCreator(async (ctx, originalCreator) => {
      const original = await originalCreator(ctx);
      // Spy on the original instance
      vi.spyOn(original, 'log');
      return original;
    })
  ]);

  const container = await setup(mockedWires);
  const userService = await UserServiceWire.getInstance(container);
  const logger = await LoggerWire.getInstance(container);
  
  await userService.getUser('123');
  
  expect(logger.log).toHaveBeenCalled();
  expect(logger.log).toHaveBeenCalledWith('Getting user with id: 123');
});

```

## License

MIT
