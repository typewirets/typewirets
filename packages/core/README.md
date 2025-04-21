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

TypeWire is designed to create clear boundaries and explicit dependencies in your codebase. It helps you:

- **Build clear boundaries** - Separate behavior from construction and configuration
- **Make dependencies explicit** - No magic, no ambient context, just clear dependencies
- **Compose behaviors easily** - Build complex systems from simple, well-defined components
- **Keep testing simple** - Replace implementations without changing consumer code
- **Control side effects** - Manage where and how side effects occur in your system

The goal is to help you build systems that are clear, testable, and maintainable.

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

Defines how to create and manage instances of a specific type. Works with both classes and functions:

```typescript
import { typeWireOf } from '@typewirets/core';

// Class-based service
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

// Function-based service
const configWire = typeWireOf({
  token: 'Config',
  creator: async () => {
    const config = await loadConfig();
    return createConfig(config);
  }
});

// Service with dependencies
const userServiceWire = typeWireOf({
  token: 'UserService',
  imports: {
    logger: loggerWire,
    config: configWire
  },
  createWith: ({ logger, config }) => new UserService(logger, config)
});
```

### Managing Context

TypeWire helps you separate long-lived services from contextual state:

```typescript
// Long-lived service (use TypeWire)
const dbClientWire = typeWireOf({
  token: 'DbClient',
  creator: () => new DbClient()
});

// Contextual state (construct where needed)
class RequestContext {
  constructor(
    private userId: string,
    private dbClient: DbClient
  ) {}

  async getUser() {
    return this.dbClient.getUser(this.userId);
  }
}

const userServiceWire = typeWireOf({
  token: 'UserService',
  imports: {
    dbClient: dbClientWire
  },
  createWith: ({ dbClient }) => ({
    createContext: (userId: string) => new RequestContext(userId, dbClient)
  })
});
```

### Composing Services

TypeWire makes it easy to compose and override services:

```typescript
// Base configuration
const baseConfigWire = typeWireOf({
  token: 'Config',
  creator: () => ({ apiUrl: 'https://api.example.com' })
});

// Development override
const devConfigWire = baseConfigWire.withCreator(() => ({
  apiUrl: 'http://localhost:3000'
}));

// Testing override
const testConfigWire = baseConfigWire.withCreator(() => ({
  apiUrl: 'http://test-api'
}));

// Feature flags
const featureFlagsWire = typeWireOf({
  token: 'FeatureFlags',
  imports: { config: baseConfigWire },
  createWith: async ({ config }) => {
    const flags = await loadFlags(config.apiUrl);
    return createFeatureFlags(flags);
  }
});
```

### Testing

TypeWire makes testing straightforward:

```typescript
describe('UserService', () => {
  // Group related wires
  const baseWires = typeWireGroupOf([
    loggerWire,
    userServiceWire
  ]);

  it('logs user retrieval', async () => {
    // Override just what you need
    const testWires = baseWires.withExtraWires([
      loggerWire.withCreator(() => {
        const logger = new Logger();
        vi.spyOn(logger, 'log');
        return logger;
      })
    ]);

    const container = new TypeWireContainer();
    await testWires.apply(container);

    const userService = await userServiceWire.getInstance(container);
    const logger = await loggerWire.getInstance(container);

    await userService.getUser('123');
    expect(logger.log).toHaveBeenCalledWith('Getting user: 123');
  });
});
```

## Best Practices

1. **Clear Boundaries**:
   - Use TypeWire for long-lived services
   - Construct context where it's needed
   - Keep persistent data in proper storage
   - Make dependencies explicit

2. **Smart State Management**:
   - Separate services from state
   - Use proper storage for persistence
   - Keep context close to usage
   - Control state lifecycles

3. **Explicit Dependencies**:
   - No ambient context
   - Clear import declarations
   - Visible dependency paths
   - Easy to trace and test

4. **Composition Over Configuration**:
   - Build complex systems from simple parts
   - Override behavior where needed
   - Keep testing simple
   - Control side effects

## License

MIT 