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
export const loggerWire = typeWireOf({ token: "Logger", creator: () => new Logger() });
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

- Complex logic inside `creator` lambdas — extract to a named factory function
- Using `ctx.get()` for dependencies that are known at declaration time — declare them in `imports` so the dependency graph stays explicit and visible. `ctx.get()` is appropriate for dynamic or conditional resolution.

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

### Wire groups as capability contracts

A wire group should represent a **protocol** — a set of wires that together fulfill a capability. It is not a barrel file that re-exports every wire in a directory.

Think of a wire group the way you think of an interface: it declares what a module *provides*, not how it's built internally.

```typescript
// config/config.wires.ts
// This group provides the "config" capability.
// Consumers depend on this group, not on the individual wires.
export const ConfigWires = typeWireGroupOf([
  JsoncConfigRecordWire,
  ConfigServiceWire,
]);
```

The consumer imports `ConfigWires` and gets a working config system. If the implementation changes later (swap JSONC for YAML), the group still provides the same protocol — only the internal wires change.

```typescript
// main.wires.ts — composes capabilities, not individual wires
export const AppWires = combineWireGroups([
  ConfigWires,
  AuthWires,
  UserWires,
]);
```

**When to create a wire group:**

- The wires form a coherent capability that other modules depend on as a unit
- Multiple apps or entry points share the same set of wires (e.g., a shared `config` package used by both a server and a CLI)
- You want to swap an entire capability in tests with `withExtraWires`

**When not to create a wire group:**

- The wires are unrelated and just happen to live in the same directory
- The app is small enough that a flat `main.wires.ts` listing every wire is clear and manageable

Individual wires should still be exported alongside the group — consumers may need to reference them for overrides or testing.

### Co-locate wires with features

Place wire files next to the code they configure, not in a central `wires/` directory. This makes it obvious which feature owns which wires and which capability group they belong to.

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

### Test the implementation, not the wiring

Unit tests should test your service logic directly. You don't need wires to test a class — just instantiate it with test doubles:

```typescript
describe("UserService", () => {
  it("should return a user by id", async () => {
    const mockDb = { findById: vi.fn().mockResolvedValue({ id: "1", name: "Alice" }) };
    const service = new UserService(mockDb);

    const user = await service.getUserById("1");

    expect(user).toEqual({ id: "1", name: "Alice" });
    expect(mockDb.findById).toHaveBeenCalledWith("1");
  });
});
```

This keeps tests fast, focused, and free of DI ceremony. If your service is hard to instantiate without wires, that's a signal the constructor has too many dependencies.

### Use wires for integration tests

When you need to test how services work together through the DI graph, use wires with a real container:

```typescript
describe("UserService integration", () => {
  let container: TypeWireContainer;

  beforeEach(async () => {
    container = new TypeWireContainer();
    await InMemoryUserServiceWire.apply(container);
    await UserServiceWire.apply(container);
  });

  it("should save and retrieve a user", async () => {
    const userService = await UserServiceWire.getInstance(container);
    await userService.save({ id: "1", name: "Alice", age: 30 });

    const retrieved = await userService.getUserById("1");
    expect(retrieved).toEqual({ id: "1", name: "Alice", age: 30 });
  });
});
```

### Use `withCreator` to replace a single wire

When an integration test needs to swap one dependency (e.g., replace a real database with an in-memory fake), use `withCreator`:

```typescript
const MockLoggerWire = LoggerWire.withCreator(() => ({
  log: vi.fn(),
}));
```

### Use `withExtraWires` on groups to swap multiple implementations

```typescript
const testGroup = AppWireGroup.withExtraWires([MockLoggerWire, MockDbWire]);
```

This replaces wires by token — the group's original wires are overridden by the new ones. This is how you swap an entire capability in tests.

### Spy on the original implementation

Use the two-argument form of `withCreator` to wrap the original creator with a spy:

```typescript
const SpiedLoggerWire = LoggerWire.withCreator(async (ctx, originalCreator) => {
  const logger = await originalCreator(ctx);
  vi.spyOn(logger, "log");
  return logger;
});
```

This is useful when you want to verify interactions without replacing the real implementation.

### Create a shared `setup()` helper

Avoid repeating container setup in every test file:

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

Use TypeScript's `satisfies` operator to ensure mock implementations match the real type at compile time:

```typescript
const mockUser = {
  id: "test",
  name: "Test User",
  email: "test@example.com",
} satisfies User;
```

### Summary: when to use what

| Scenario | Approach |
|---|---|
| Testing service logic in isolation | Instantiate directly with test doubles — no wires needed |
| Testing wired services together | Use a container with `apply` + `getInstance` |
| Replacing one dependency | `withCreator` on the wire |
| Replacing multiple dependencies | `withExtraWires` on the group |
| Spying without replacing | Two-argument `withCreator` with `originalCreator` |

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
