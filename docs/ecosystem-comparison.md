# TypeWire Competitive Analysis

This document provides an objective comparison between TypeWire and other dependency injection solutions for TypeScript. The goal is to help developers understand the trade-offs and choose the right tool for their specific needs.

## Bundle Size Comparison

| Library     | Minified | Gzipped |
|-------------|----------|---------|
| TypeWire    | 4.9KB    | 1.6KB   |
| InversifyJS | 15KB     | 5KB     |
| tsyringe    | 6KB      | 2.5KB   |
| Awilix      | 8KB      | 3KB     |

## Comparison Table

| Feature | TypeWire | InversifyJS | tsyringe | Angular DI | NestJS |
|---------|----------|-------------|----------|------------|--------|
| **Type Safety** | Strong (TypeSymbol) | Strong | Strong | Strong | Strong |
| **Bundle Size** | 1.6KB gzipped | 5KB gzipped | 2.5KB gzipped | Large (part of Angular) | Large (part of NestJS) |
| **Decorator Usage** | None | Heavy | Heavy | Heavy | Heavy |
| **Container Required** | Optional | Required | Required | Required | Required |
| **Async Resolution** | Built-in | Requires plugin | No | No | Built-in |
| **Circular Dependency Detection** | Yes, with path | Yes | Limited | Yes | Yes |
| **Framework Coupling** | None | None | None | Angular | NestJS |
| **Reflection Required** | No | Yes | Yes | Yes | Yes |

## Detailed Comparisons

### TypeWire vs. InversifyJS

**Similarities:**
- Both offer strong type safety
- Both support different scopes for dependencies
- Both can detect circular dependencies

**Differences:**
- TypeWire doesn't require decorators on your classes
- TypeWire has a smaller bundle size
- TypeWire has built-in async support
- InversifyJS has a larger ecosystem and more extensions
- TypeWire separates binding definition from container usage
- TypeWire works with InversifyJS through an adapter

**Example: Defining a service**

TypeWire:
```typescript
// No decorators needed on your classes
class UserService {
  constructor(private logger: Logger) {}
}

// Definition is separate from the class
const userServiceWire = typeWireOf({
  token: 'UserService',
  creator: (ctx) => new UserService(loggerWire.getInstance(ctx))
});
```

InversifyJS:
```typescript
// Requires decorators
@injectable()
class UserService {
  constructor(@inject(TYPES.Logger) private logger: Logger) {}
}

// Registration uses the decorated class
container.bind<UserService>(TYPES.UserService).to(UserService);
```

### TypeWire vs. tsyringe

**Similarities:**
- Both aim for simplicity
- Both provide strong typing

**Differences:**
- tsyringe relies heavily on decorators
- TypeWire has explicit support for async dependencies
- TypeWire has a more functional approach to configuration
- TypeWire doesn't require metadata reflection
- tsyringe has deeper Microsoft ecosystem integration

**Example: Registering a singleton**

TypeWire:
```typescript
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger(),
  scope: 'singleton'
});

await loggerWire.apply(container);
```

tsyringe:
```typescript
@singleton()
class Logger {}

container.register("Logger", {useClass: Logger});
```

### TypeWire vs. Angular DI

**Similarities:**
- Both provide strong typing
- Both support hierarchical injection

**Differences:**
- Angular DI is tightly coupled to the Angular framework
- TypeWire is framework-agnostic
- Angular DI uses a more decorator-heavy approach
- TypeWire has explicit async support
- Angular DI has more specific features for component-based architecture

**Example: Service definition**

TypeWire:
```typescript
const loggerWire = typeWireOf({
  token: 'Logger',
  creator: () => new Logger()
});

const userServiceWire = typeWireOf({
  token: 'UserService',
  creator: (ctx) => new UserService(loggerWire.getInstance(ctx))
});
```

Angular:
```typescript
@Injectable({providedIn: 'root'})
class Logger {}

@Injectable({providedIn: 'root'})
class UserService {
  constructor(private logger: Logger) {}
}
```

## When to Choose Each Solution

### Choose TypeWire when:

- You want minimal bundle size
- You prefer not to use decorators
- You need container-agnostic DI
- You value explicit dependency management
- You need built-in async support
- You prefer a functional composition approach

### Choose InversifyJS when:

- You're comfortable with decorators
- You need a mature ecosystem with many extensions
- You value container features over minimal size
- You have an existing InversifyJS codebase

### Choose tsyringe when:

- You want a simple decorator-based solution
- You're working in the Microsoft ecosystem
- You don't need explicit async support
- Bundle size is less critical than convenience

### Choose Angular DI when:

- You're building an Angular application
- You need tight integration with Angular's change detection
- You want zone.js integration

### Choose NestJS when:

- You're building a NestJS application
- You need the full feature set of a backend framework
- You want excellent TypeScript integration in a full-stack context 