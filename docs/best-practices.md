# TypeWire Best Practices

Conventions for wire naming, creator patterns, file organization, and testing in TypeWire TypeScript projects.

## 1. Wire Naming

Wire instances are the primary way other modules reference dependencies. Use clear, public names.

### Exported wires: PascalCase with `Wire` suffix

```typescript
// ✅ Clear, discoverable names
export const LoggerWire = typeWireOf({ token: "Logger", creator: () => new Logger() });
export const UserServiceWire = typeWireOf({
  token: "UserService",
  imports: { logger: LoggerWire },
  createWith({ logger }) { return new UserService(logger); },
});
```

```typescript
// ❌ Avoid unclear or private-style names for exported wires
export const _loggerWire = typeWireOf({ token: "Logger", creator: () => new Logger() });
export const logger = typeWireOf({ token: "Logger", creator: () => new Logger() });
```

### Token strings: match the service name

Use concise, descriptive token strings that match the concept they represent (e.g., `"Logger"`, `"UserService"`, `"DbConfig"`). This makes dependency graphs and error messages readable.

### Module-internal dependencies: skip the wire

If a dependency is purely internal to a single module and nothing external needs to reference, override, or manage its lifecycle, use a plain instance instead of a wire.

```typescript
// ✅ Internal-only — no wire needed
const retryPolicy = new RetryPolicy({ maxRetries: 3 });

export const HttpClientWire = typeWireOf({
  token: "HttpClient",
  creator: () => new HttpClient(retryPolicy),
});
```

## 2. Creator Patterns

Ordered from most to least recommended:

### `createWith` + `imports` (preferred)

Achieves maximum decoupling. Dependencies are declared explicitly and injected automatically.

```typescript
export const UserServiceWire = typeWireOf({
  token: "UserService",
  imports: { logger: LoggerWire, db: DatabaseWire },
  createWith({ logger, db }) {
    return new UserService(logger, db);
  },
});
```

### Factory function as `creator`

Appropriate when the wire has zero dependencies or only depends on simple configuration.

```typescript
export const ConfigWire = typeWireOf({
  token: "Config",
  creator: () => loadConfig(),
});
```

### Constructor directly in `creator`

Acceptable for simple value types. Note that this couples the wire layer to the concrete class and its constructor signature.

```typescript
export const LoggerWire = typeWireOf({
  token: "Logger",
  creator: () => new Logger(),
});
```

### Avoid

- Calling `ctx.getSync()` or `ctx.get()` manually inside creators — use `imports` instead
- Complex logic inside `creator` lambdas — extract to a named factory function

## 3. File Organization

### Recommended: separate wires from implementations

```
features/
  auth/
    auth-service.ts          # AuthService class, interfaces, factory functions
    auth-service.wire.ts     # Wire declarations only
  billing/
    billing-service.ts
    billing-service.wire.ts
```

- **`auth-service.ts`** contains the implementation: classes, interfaces, types, and factory functions.
- **`auth-service.wire.ts`** is a thin file that imports from `auth-service.ts` and declares wires.

This separation keeps domain code free of DI concerns and makes it easy to test implementations independently.

### Group related wires

Use `typeWireGroupOf` to bundle related wires for batch registration and testing:

```typescript
// auth/auth.wires.ts
import { AuthServiceWire } from "./auth-service.wire";
import { TokenServiceWire } from "./token-service.wire";

export const AuthWireGroup = typeWireGroupOf([AuthServiceWire, TokenServiceWire]);
```

### Co-locate wires with features

Place wire files next to the code they configure, not in a central `wires/` directory. This makes it obvious which feature owns which wires.

## 4. Scoping

### Default to singleton

TypeWire uses singleton scope by default, and this is intentional (see [Design Philosophy](./design-philosophy.md)). Singletons create a clearer mental model: one instance per service, shared across the application.

### Use transient sparingly

Reserve `transient` scope for cases where each consumer genuinely needs a fresh instance — e.g., stateful per-request objects or instances that hold mutable internal state.

```typescript
export const RequestHandlerWire = typeWireOf({
  token: "RequestHandler",
  scope: "transient",
  imports: { logger: LoggerWire },
  createWith({ logger }) { return new RequestHandler(logger); },
});
```

### Pass request-scoped data as method parameters

Instead of creating request-scoped wires, pass contextual data explicitly:

```typescript
// ✅ Explicit context via method parameters
class UserService {
  async getUser(requestId: string, userId: string): Promise<User> { /* ... */ }
}

// ❌ Avoid: request-scoped wire per HTTP request
const RequestContextWire = typeWireOf({ token: "RequestContext", scope: "transient", /* ... */ });
```

## 5. Testing Patterns

### Use `withCreator` to mock individual wires

```typescript
const MockLoggerWire = LoggerWire.withCreator(() => ({
  log: vi.fn(),
}));
```

### Use `withExtraWires` on groups to swap implementations

```typescript
const testGroup = AppWireGroup.withExtraWires([MockLoggerWire, MockDbWire]);
```

### Create a shared `setup()` helper

```typescript
async function setup(wireGroup: Applicable) {
  const container = new TypeWireContainer();
  await wireGroup.apply(container);
  return container;
}

test("user service resolves", async () => {
  const container = await setup(testGroup);
  const userService = await UserServiceWire.getInstance(container);
  expect(userService).toBeDefined();
});
```

### Validate mocks with `satisfies`

Use TypeScript's `satisfies` operator to ensure mock implementations match the real type:

```typescript
const mockUser = {
  id: "test",
  name: "Test User",
  email: "test@example.com",
} satisfies User;
```

## 6. TypeScript Conventions

- **Annotate wire types explicitly** when the inferred type is complex or when the wire is part of a public API
- **Use interfaces for services** to make mocking straightforward — a mock only needs to implement the interface, not extend the class
- **Prefer `unknown` over `any`** — see [MAINTAINING.md](../MAINTAINING.md) for type system conventions
- **Include TSDoc on all public wires and factory functions** — this improves autocomplete and AI tool suggestions

## 7. React Integration

- **Initialize wires before rendering** — use an async `main()` function to apply wire groups before calling `createRoot`
- **Wrap the app root in `ResolutionContextProvider`** — this provides the container to the entire tree
- **Use `<Suspense>` boundaries** around components that use `useTypeWire` with async creators
- **Pair TypeWire with state management** (Zustand, Redux, MobX) for reactive UI state — TypeWire manages service instantiation, not UI state

```tsx
async function main() {
  const container = new TypeWireContainer();
  await AppWireGroup.apply(container);

  createRoot(document.getElementById("root")!).render(
    <ResolutionContextProvider resolutionContext={container}>
      <Suspense fallback={<Loading />}>
        <App />
      </Suspense>
    </ResolutionContextProvider>
  );
}
```

## 8. Anti-Patterns to Avoid

| Anti-Pattern | Why | Instead |
|---|---|---|
| Resolving wires inside React render | Causes repeated resolution on every render | Use `useTypeWire` hook |
| Circular wire dependencies | Deadlocks resolution | Use circular dependency detection to catch these early |
| Overly broad wire groups | Makes it hard to test features in isolation | Group wires by feature |
| Using `getSync` for async creators | Throws if the instance hasn't been resolved yet | Use async `getInstance` or `useTypeWire` with Suspense |
| Manual `ctx.get()` inside creators | Bypasses the `imports` graph, hiding dependencies | Declare dependencies in `imports` |
| Putting all wires in one file | Couples unrelated features together | Co-locate wires with their feature |

## Summary

| Topic | Recommended | Avoid |
|---|---|---|
| Wire naming | `UserServiceWire` (PascalCase + Wire suffix) | `_userServiceWire`, `userService` |
| Internal dependencies | Plain instances (no wire) | `_internalWire = typeWireOf(...)` |
| Creator pattern | `createWith` + `imports` | Manual `ctx.get()` inside creators |
| Simple creators | `creator: () => new Logger()` | Over-engineered factory for trivial cases |
| File layout | `service.ts` + `service.wire.ts` | Everything in one file |
| Scoping | Singleton (default) | Request-scoped wires for per-request data |
| Testing | `withCreator` + `withExtraWires` | Direct container manipulation |
