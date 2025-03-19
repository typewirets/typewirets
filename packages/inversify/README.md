# TypeWire Inversify Adapter

The InversifyJS adapter for TypeWire, allowing you to use TypeWire with InversifyJS containers.

## Installation

```bash
npm install @typewirets/inversify inversify
```

## Usage

The adapter allows you to use TypeWire definitions with an existing InversifyJS container:

```typescript
import { Container } from 'inversify';
import { createInversifyAdapter } from '@typewirets/inversify';
import { typeWireOf } from '@typewirets/core';

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

// Create an Inversify container
const container = new Container();

// Create an adapter to use with TypeWire
const adapter = createInversifyAdapter(container);

// Create TypeWire definitions
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

const userServiceWire = typeWireOf({
  token: 'UserService',
  creator: (ctx) => new UserService(loggerWire.getInstance(ctx))
});

// Register with the Inversify container (using async/await)
async function setup() {
  await loggerWire.apply(adapter);
  await userServiceWire.apply(adapter);
  
  // Resolve using the TypeWire API
  const userService = userServiceWire.getInstance(adapter);
  userService.getUser('123');
}

setup();
```

## Using with Existing Inversify Code

You can also use TypeWire alongside existing Inversify bindings:

```typescript
import { Container, injectable, inject } from 'inversify';
import { createInversifyAdapter, adaptToResolutionContext } from '@typewirets/inversify';
import { typeWireOf, typedSymbolOf } from '@typewirets/core';

// Existing Inversify setup
const TYPES = {
  Database: Symbol.for('Database')
};

@injectable()
class Database {
  connect() { /* ... */ }
}

// TypeWire definition
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

// Hybrid service that uses both
const userRepoWire = typeWireOf({
  token: 'UserRepository',
  creator: (ctx) => {
    // Get TypeWire dependency
    const logger = loggerWire.getInstance(ctx);
    
    // Get Inversify dependency (through the adapter)
    const db = ctx.get(typedSymbolOf('Database'));
    
    return new UserRepository(logger, db);
  }
});

// Setup (using async/await)
async function setup() {
  const container = new Container();
  container.bind(TYPES.Database).to(Database).inSingletonScope();

  const adapter = createInversifyAdapter(container);
  await loggerWire.apply(adapter);
  await userRepoWire.apply(adapter);
  
  // Use the repository
  const repo = userRepoWire.getInstance(adapter);
}

setup();
```

## Adapter Functions

The adapter provides three main functions:

### adaptToResolutionContext

Creates a TypeWire `ResolutionContext` adapter for an Inversify container:

```typescript
import { adaptToResolutionContext } from '@typewirets/inversify';

const resolutionContext = adaptToResolutionContext(container);
const logger = loggerWire.getInstance(resolutionContext);
```

### adaptToBindingContext

Creates a TypeWire `BindingContext` adapter for an Inversify container:

```typescript
import { adaptToBindingContext } from '@typewirets/inversify';

const bindingContext = adaptToBindingContext(container);
await loggerWire.apply(bindingContext);  // Note the await
```

### createInversifyAdapter

Creates a combined adapter that implements both `ResolutionContext` and `BindingContext`:

```typescript
import { createInversifyAdapter } from '@typewirets/inversify';

const adapter = createInversifyAdapter(container);
await loggerWire.apply(adapter);  // Note the await
const logger = loggerWire.getInstance(adapter);
```

## Scope Mapping and Behavior

The adapter automatically maps TypeWire scopes to Inversify binding scopes:

| TypeWire Scope | Inversify Scope    |
|----------------|-------------------|
| 'singleton'    | 'Singleton'       |
| 'transient'    | 'Transient'       |
| 'request'      | 'Request'         |

### Important Notes About Scoping:

- **Singleton and Transient Scopes**: These work as expected in all scenarios and are the recommended scopes to use with TypeWire. See the [core package documentation](../core/README.md) for more details on our recommended scoping strategy.

- **Request Scope**: While supported for compatibility, this requires special attention:
  - Request scope in Inversify is designed to work with container hierarchies
  - For request scope to work correctly, you must:
    1. Use Inversify's container hierarchy properly (typically with a parent container and child containers per request)
    2. Ensure your components using request-scoped dependencies are managed by Inversify (usually with `@injectable()` decorators)
  - In standalone applications (non-web) or when not using container hierarchies, request scope may behave like transient scope
  - We generally recommend using singleton scopes with explicit parameter passing instead of relying on request scopes

## License

MIT 