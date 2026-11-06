import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TypeWireContainer,
  TypeWireError,
  typeWireGroupOf,
  typeWireOf,
} from "../index";

// An app waits for its async wires once per phase (startup, login, a route),
// then reads them synchronously. These tests prove what a caller can rely on
// after a preload.

function counted<T>(token: string, make: () => T | Promise<T>) {
  const calls = { count: 0 };
  const wire = typeWireOf({
    token,
    creator: async () => {
      calls.count += 1;
      return await make();
    },
  });
  return { wire, calls };
}

let unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => {
  unhandled.push(reason);
};

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
});

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("preloading a named set with group.getAllInstances", () => {
  it("lets every wire and its imports be read synchronously, created once", async () => {
    const config = counted("Config", () => ({ url: "https://api" }));
    let apiCreated = 0;
    const apiWire = typeWireOf({
      token: "Api",
      imports: { config: config.wire },
      createWith: ({ config }) => {
        apiCreated += 1;
        return { base: config.url };
      },
    });
    const container = new TypeWireContainer();
    const group = typeWireGroupOf([apiWire]);
    await group.apply(container);

    const [api] = await group.getAllInstances(container);

    expect(apiWire.getInstanceSync(container)).toBe(api);
    expect(config.wire.getInstanceSync(container)).toEqual({
      url: "https://api",
    });
    expect(apiCreated).toBe(1);
    expect(config.calls.count).toBe(1);
  });
});

describe("container.preload()", () => {
  it("creates every bound singleton, so each reads synchronously", async () => {
    const a = counted("A", () => "a");
    const b = counted("B", () => 0);
    const container = new TypeWireContainer();
    await a.wire.apply(container);
    await b.wire.apply(container);

    await container.preload();

    expect(a.wire.getInstanceSync(container)).toBe("a");
    expect(b.wire.getInstanceSync(container)).toBe(0);
    expect(a.calls.count).toBe(1);
    expect(b.calls.count).toBe(1);
  });

  it("creates no transient values", async () => {
    let transientCreated = 0;
    const transientWire = typeWireOf({
      token: "Request",
      scope: "transient",
      creator: async () => {
        transientCreated += 1;
        return {};
      },
    });
    const container = new TypeWireContainer();
    await transientWire.apply(container);

    await container.preload();
    await container.preload({ wires: [transientWire] });

    expect(transientCreated).toBe(0);
  });

  it("does not create a wire bound after the call", async () => {
    const early = counted("Early", () => 1);
    const late = counted("Late", () => 2);
    const container = new TypeWireContainer();
    await early.wire.apply(container);

    const preloading = container.preload();
    await late.wire.apply(container);
    await preloading;

    expect(early.calls.count).toBe(1);
    expect(late.calls.count).toBe(0);
  });

  it("creates the same instance getInstance later returns", async () => {
    const service = counted("Service", () => ({ id: Math.random() }));
    const container = new TypeWireContainer();
    await service.wire.apply(container);

    await container.preload();

    const sync = service.wire.getInstanceSync(container);
    expect(await service.wire.getInstance(container)).toBe(sync);
  });
});

describe("container.preload({ wires })", () => {
  it("creates those wires and their imports, and nothing else", async () => {
    const config = counted("Config", () => ({ region: "eu" }));
    const other = counted("Other", () => "other");
    const apiWire = typeWireOf({
      token: "Api",
      imports: { config: config.wire },
      createWith: ({ config }) => ({ region: config.region }),
    });
    const container = new TypeWireContainer();
    await apiWire.apply(container);
    await other.wire.apply(container);

    await container.preload({ wires: [apiWire] });

    expect(apiWire.getInstanceSync(container)).toEqual({ region: "eu" });
    expect(config.wire.getInstanceSync(container)).toEqual({ region: "eu" });
    expect(other.calls.count).toBe(0);
  });

  it("accepts a group's wires", async () => {
    const a = counted("A", () => "a");
    const b = counted("B", () => "b");
    const group = typeWireGroupOf([a.wire, b.wire]);
    const container = new TypeWireContainer();
    await group.apply(container);

    await container.preload({ wires: group.wires });

    expect(group.getAllInstancesSync(container)).toEqual(["a", "b"]);
  });

  it("rejects with BindingNotFound for a wire that isn't bound", async () => {
    const unbound = counted("Unbound", () => 1);
    const container = new TypeWireContainer();

    const err = await container
      .preload({ wires: [unbound.wire] })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TypeWireError);
    expect((err as TypeWireError).reason).toBe("BindingNotFound");
  });
});

describe("a failing preload", () => {
  it("rejects with the creation's own error and still caches the healthy wires", async () => {
    const failure = new Error("config service down");
    const broken = counted("Broken", () => Promise.reject(failure));
    const healthy = counted("Healthy", () => "ok");
    const container = new TypeWireContainer();
    await broken.wire.apply(container);
    await healthy.wire.apply(container);

    await expect(container.preload()).rejects.toBe(failure);

    await settle();
    expect(healthy.wire.getInstanceSync(container)).toBe("ok");
  });

  it("causes no unhandled rejection when several creations fail", async () => {
    const first = counted("First", () =>
      Promise.reject(new Error("first down")),
    );
    const second = counted(
      "Second",
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("second down")), 5),
        ),
    );
    const container = new TypeWireContainer();
    await first.wire.apply(container);
    await second.wire.apply(container);

    await expect(container.preload()).rejects.toThrow("first down");

    await settle();
    expect(unhandled).toEqual([]);
  });
});

describe("preloading again", () => {
  it("creates only the wires added since the last preload", async () => {
    const shell = counted("Shell", () => "shell");
    const reports = counted("Reports", () => "reports");
    const container = new TypeWireContainer();
    await shell.wire.apply(container);
    await container.preload();

    await reports.wire.apply(container);
    await container.preload();

    expect(shell.calls.count).toBe(1);
    expect(reports.calls.count).toBe(1);
    expect(reports.wire.getInstanceSync(container)).toBe("reports");
  });

  it("creates a fresh instance after unbind and apply", async () => {
    let next = 0;
    const sessionWire = typeWireOf({
      token: "Session",
      creator: async () => ({ id: ++next }),
    });
    const container = new TypeWireContainer();
    await sessionWire.apply(container);
    await container.preload();
    const before = sessionWire.getInstanceSync(container);

    await container.unbind(sessionWire.type);
    await sessionWire.apply(container);
    await container.preload({ wires: [sessionWire] });

    const after = sessionWire.getInstanceSync(container);
    expect(after).not.toBe(before);
    expect(after).toEqual({ id: 2 });
  });
});
