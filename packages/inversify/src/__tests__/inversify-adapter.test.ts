import { describe, test, expect, beforeEach } from "vitest";
import { Container } from "inversify";
import { typeWireOf, type TypeWire } from "@typewirets/core";
import { InversifyAdapter, createInversifyAdapter, adoptScope } from "../index";

// Mock classes for testing
class Logger {
  log(_message: string): void {}
}

class Database {
  constructor(private logger: Logger) {}
}

class UserService {
  constructor(
    private db: Database,
    private logger: Logger,
  ) {}
}

describe("Inversify Adapter", () => {
  let container: Container;
  let inversifyAdapter: InversifyAdapter;
  let loggerWire: TypeWire<Logger>;
  let dbWire: TypeWire<Database>;
  let userServiceWire: TypeWire<UserService>;

  beforeEach(() => {
    container = new Container();
    inversifyAdapter = new InversifyAdapter(container);

    // Create TypeWire definitions
    loggerWire = typeWireOf({
      token: "Logger",
      creator: () => new Logger(),
    });

    dbWire = typeWireOf({
      token: "Database",
      creator: (ctx) => new Database(loggerWire.getInstanceSync(ctx)),
    });

    userServiceWire = typeWireOf({
      token: "UserService",
      creator: (ctx) =>
        new UserService(
          dbWire.getInstanceSync(ctx),
          loggerWire.getInstanceSync(ctx),
        ),
    });
  });

  test("InversifyAdapter should implement both contexts", async () => {
    // Apply definition using TypeWire API
    await loggerWire.apply(inversifyAdapter);

    // Verify resolution using TypeWire API
    const logger = await loggerWire.getInstance(inversifyAdapter);
    expect(logger).toBeInstanceOf(Logger);
  });

  test("createInversifyAdapter should return a combined adapter", async () => {
    // Get a combined adapter
    const adapter = createInversifyAdapter(container);

    // Apply definition using TypeWire API
    await loggerWire.apply(adapter);

    // Verify resolution using TypeWire API
    const logger = await loggerWire.getInstance(adapter);
    expect(logger).toBeInstanceOf(Logger);
  });

  test("should respect scope settings", async () => {
    // Create a singleton provider
    const singletonLoggerWire = loggerWire.withScope("singleton");

    // Apply definition
    await singletonLoggerWire.apply(inversifyAdapter);

    // Get the instance twice
    const logger1 = await singletonLoggerWire.getInstance(inversifyAdapter);
    const logger2 = await singletonLoggerWire.getInstance(inversifyAdapter);

    // Should be the same instance
    expect(logger1).toBe(logger2);

    // Now with transient scope
    const transientDbWire = dbWire.withScope("transient");

    // Apply definition
    // This will unbind singletonLoggerWire as it uses the same symbol
    await transientDbWire.apply(inversifyAdapter);

    const db1 = await transientDbWire.getInstance(inversifyAdapter);
    const db2 = await transientDbWire.getInstance(inversifyAdapter);

    // Should be different instances
    expect(db1).not.toBe(db2);
    expect(db1).toBeInstanceOf(Database);
    expect(db2).toBeInstanceOf(Database);
  });

  test("adoptScope should convert to correct Inversify scope", () => {
    expect(adoptScope("singleton")).toBe("Singleton");
    expect(adoptScope("transient")).toBe("Transient");
    expect(adoptScope("request")).toBe("Request");
    expect(adoptScope(undefined)).toBeUndefined();
    expect(adoptScope("unknown")).toBeUndefined();
  });

  test("should unbind correctly", async () => {
    // Apply definition
    await loggerWire.apply(inversifyAdapter);
    expect(inversifyAdapter.isBound(loggerWire.type)).toBe(true);

    // Unbind it
    await inversifyAdapter.unbind(loggerWire.type);
    expect(inversifyAdapter.isBound(loggerWire.type)).toBe(false);

    // Should throw when trying to resolve
    expect(() => loggerWire.getInstance(inversifyAdapter)).rejects.toThrow();
  });

  test("should handle async resolution", async () => {
    // Create an async provider
    const asyncLoggerWire = typeWireOf({
      token: "Logger",
      creator: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new Logger();
      },
    });

    // Apply definition
    await asyncLoggerWire.apply(inversifyAdapter);

    // Resolve asynchronously using TypeWire API
    const logger = await asyncLoggerWire.getInstance(inversifyAdapter);
    expect(logger).toBeInstanceOf(Logger);
  });

  test("should correctly build a dependency tree", async () => {
    // Apply all definitions in order
    await loggerWire.apply(inversifyAdapter);
    await dbWire.apply(inversifyAdapter);
    await userServiceWire.apply(inversifyAdapter);

    // Resolve the service with dependencies
    const userService = await userServiceWire.getInstance(inversifyAdapter);
    expect(userService).toBeInstanceOf(UserService);
  });

  test("hasInstance should return false for unloaded dependencies", () => {
    // Register but don't instantiate
    loggerWire.apply(inversifyAdapter);

    // Should not be loaded yet
    expect(inversifyAdapter.hasInstance(loggerWire)).toBe(false);
  });

  test("hasInstance should return true after resolution for singletons", async () => {
    // Create a singleton provider
    const singletonLoggerWire = loggerWire.withScope("singleton");

    // Register
    await singletonLoggerWire.apply(inversifyAdapter);

    // Not loaded yet
    expect(inversifyAdapter.hasInstance(singletonLoggerWire)).toBe(false);

    // Instantiate
    await singletonLoggerWire.getInstance(inversifyAdapter);

    // Should be loaded now
    expect(inversifyAdapter.hasInstance(singletonLoggerWire)).toBe(true);
  });

  test("hasInstance should always return false for transient dependencies", async () => {
    // Create a transient provider
    const transientLoggerWire = loggerWire.withScope("transient");

    // Register
    await transientLoggerWire.apply(inversifyAdapter);

    // Not loaded yet
    expect(inversifyAdapter.hasInstance(transientLoggerWire)).toBe(false);

    // Instantiate
    await transientLoggerWire.getInstance(inversifyAdapter);

    // Should still not be considered loaded (transient)
    expect(inversifyAdapter.hasInstance(transientLoggerWire)).toBe(false);
  });

  test("findInstance should return undefined for uninstantiated dependencies", () => {
    // Register but don't instantiate
    loggerWire.apply(inversifyAdapter);

    // Should return undefined
    expect(inversifyAdapter.findInstance(loggerWire)).toBeUndefined();
  });

  test("findInstance should return instance for instantiated singletons", async () => {
    // Create a singleton provider
    const singletonLoggerWire = loggerWire.withScope("singleton");

    // Register
    await singletonLoggerWire.apply(inversifyAdapter);

    // Instantiate
    const original = await singletonLoggerWire.getInstance(inversifyAdapter);

    // Should return the same instance
    const found = inversifyAdapter.findInstance(singletonLoggerWire);
    expect(found).toBe(original);
  });

  test("error handling - getSync should throw for unbound dependencies", () => {
    // Try to get an unbound dependency
    expect(() => inversifyAdapter.getSync(loggerWire.type)).toThrow();
  });

  test("error handling - get should throw for unbound dependencies", async () => {
    // Try to get an unbound dependency
    await expect(inversifyAdapter.get(loggerWire.type)).rejects.toThrow();
  });

  test("multiple binds should replace previous bindings", async () => {
    // Create two different logger implementations
    const debugLoggerWire = typeWireOf({
      token: "Logger",
      creator: () => {
        const logger = new Logger();
        // Add some debug property to distinguish it
        Object.assign(logger, { isDebug: true });
        return logger;
      },
    });

    // Register the first logger
    await loggerWire.apply(inversifyAdapter);
    const logger1 = await loggerWire.getInstance(inversifyAdapter);
    expect((logger1 as any).isDebug).toBeUndefined();

    // Register the second logger with the same symbol
    await debugLoggerWire.apply(inversifyAdapter);
    const logger2 = await debugLoggerWire.getInstance(inversifyAdapter);
    expect((logger2 as any).isDebug).toBe(true);
  });
});
