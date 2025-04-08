import { describe, test, expect, beforeEach } from "vitest";
import { Container } from "inversify";
import { typeWireOf, type TypeWire } from "@typewirets/core";
import {
  adaptToResolutionContext,
  adaptToBindingContext,
  createInversifyAdapter,
  InversifyAdapter,
  adoptScope,
} from "../index";

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

  test("adaptToResolutionContext should provide a valid ResolutionContext", async () => {
    // Create the context adapter
    const bindingContext = adaptToBindingContext(container);
    const resolutionContext = adaptToResolutionContext(container);

    // Apply definition using the TypeWire API
    await loggerWire.apply(bindingContext);

    // Verify it can resolve using the TypeWire API
    const logger = await loggerWire.getInstance(resolutionContext);
    expect(logger).toBeInstanceOf(Logger);
  });

  test("adaptToBindingContext should provide a valid BindingContext", async () => {
    // Create the binding context adapter
    const context = adaptToBindingContext(container);

    // Apply definition using TypeWire API
    await loggerWire.apply(context);

    // Verify binding using TypeWire API through isBound check
    expect(context.isBound(loggerWire.type)).toBe(true);

    // Verify resolution using TypeWire API
    const resolutionContext = adaptToResolutionContext(container);
    const logger = await loggerWire.getInstance(resolutionContext);
    expect(logger).toBeInstanceOf(Logger);
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
});
