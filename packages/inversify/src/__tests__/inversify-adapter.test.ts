import { describe, test, expect, beforeEach } from "vitest";
import { Container } from "inversify";
import { typeWireOf, type TypeWire } from "@typewirets/core";
import { InversifyAdapter, createInversifyAdapter, adoptScope } from "../index";

interface ILogger {
  isDebug: boolean;
  log(message: string): void;
}

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
    expect(adoptScope(undefined)).toBe("Singleton");
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
    const iLoggerWire = typeWireOf<ILogger>({
      token: "ILogger",
      creator: () => {
        return {
          isDebug: true,
          log() {},
        };
      },
    });

    // Register the debugLoggerWire
    await iLoggerWire.apply(inversifyAdapter);
    const logger1 = await iLoggerWire.getInstance(inversifyAdapter);
    expect(logger1.isDebug).toBe(true);

    // Register the second logger with the same symbol
    const iLogger2 = iLoggerWire.withCreator(() => {
      return {
        isDebug: false,
        log() {},
      };
    });
    await iLogger2.apply(inversifyAdapter);
    const logger2 = await iLoggerWire.getInstance(inversifyAdapter);
    expect(logger2.isDebug).toBe(false);
  });
});
