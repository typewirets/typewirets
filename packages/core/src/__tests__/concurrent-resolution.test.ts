import { describe, it, expect } from "vitest";
import {
  type AnyTypeWire,
  type ResolutionRequest,
  type TypeWire,
  TypeWireContainer,
  TypeWireError,
  typeWireGroupOf,
  typeWireOf,
} from "../index";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((ok, no) => {
    resolve = ok;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function containerWith(...wires: AnyTypeWire[]) {
  const container = new TypeWireContainer();
  for (const wire of wires) {
    await wire.apply(container);
  }
  return container;
}

function resolutionPath(err: unknown): string | undefined {
  return (err as Error).message
    .split("\n")
    .find((line) => line.startsWith("Resolution Path: "))
    ?.slice("Resolution Path: ".length);
}

describe("concurrent resolution", () => {
  describe("each branch keeps its own chain", () => {
    const client = typeWireOf({
      token: "Client",
      creator: async () => {
        await sleep(5);
        return "client";
      },
    });
    const reader = typeWireOf({
      token: "Reader",
      imports: { client },
      createWith: ({ client }) => `reader(${client})`,
    });
    const writer = typeWireOf({
      token: "Writer",
      imports: { client },
      createWith: ({ client }) => `writer(${client})`,
    });

    it("resolves sibling imports concurrently inside one creator", async () => {
      const app = typeWireOf({
        token: "App",
        creator: async (ctx) =>
          (await typeWireGroupOf([reader, writer]).getAllInstances(ctx)).join(
            " + ",
          ),
      });
      const container = await containerWith(app, reader, writer);

      expect(await app.getInstance(container)).toBe(
        "reader(client) + writer(client)",
      );
    });

    it("resolves siblings with Promise.all inside one creator", async () => {
      let created = 0;
      const shared = typeWireOf({
        token: "Shared",
        creator: async () => {
          created += 1;
          await sleep(5);
          return { created };
        },
      });
      const left = typeWireOf({
        token: "Left",
        creator: async (ctx) => shared.getInstance(ctx),
      });
      const right = typeWireOf({
        token: "Right",
        creator: async (ctx) => shared.getInstance(ctx),
      });
      const root = typeWireOf({
        token: "Root",
        creator: async (ctx) =>
          Promise.all([left.getInstance(ctx), right.getInstance(ctx)]),
      });
      const container = await containerWith(root, left, right, shared);

      const [l, r] = await root.getInstance(container);
      expect(l).toBe(r);
      expect(created).toBe(1);
    });

    it("reports the failing branch's own path", async () => {
      const missing = typeWireOf<string>({ token: "Missing" });
      const slow = typeWireOf({
        token: "Slow",
        creator: async () => {
          await sleep(5);
          return "slow";
        },
      });
      const broken = typeWireOf({
        token: "Broken",
        creator: async (ctx) => {
          await sleep(1);
          return ctx.get(missing.type);
        },
      });
      const root = typeWireOf({
        token: "Root",
        creator: async (ctx) =>
          Promise.all([slow.getInstance(ctx), broken.getInstance(ctx)]),
      });
      const container = await containerWith(root, slow, broken);

      const err = await root.getInstance(container).catch((e) => e);
      expect(err).toBeInstanceOf(TypeWireError);
      expect(err.reason).toBe("BindingNotFound");
      expect(resolutionPath(err)).toBe("Root -> Broken -> [Missing]");
    });
  });

  describe("cycles", () => {
    it("still detects an async cycle within one request", async () => {
      const a: TypeWire<string> = typeWireOf({
        token: "A",
        creator: async (ctx) => `a(${await b.getInstance(ctx)})`,
      });
      const b: TypeWire<string> = typeWireOf({
        token: "B",
        creator: async (ctx) => `b(${await a.getInstance(ctx)})`,
      });
      const container = await containerWith(a, b);

      const err = await a.getInstance(container).catch((e) => e);
      expect(err.reason).toBe("CircularDependency");
      expect(resolutionPath(err)).toBe("A -> B -> [A]");
    });

    it("throws instead of hanging when a cycle is entered from both ends", async () => {
      const a: TypeWire<string> = typeWireOf({
        token: "A",
        creator: async (ctx) => {
          await sleep(5);
          return `a(${await b.getInstance(ctx)})`;
        },
      });
      const b: TypeWire<string> = typeWireOf({
        token: "B",
        creator: async (ctx) => {
          await sleep(5);
          return `b(${await a.getInstance(ctx)})`;
        },
      });
      const container = await containerWith(a, b);

      const results = await Promise.race([
        Promise.allSettled([
          a.getInstance(container),
          b.getInstance(container),
        ]),
        sleep(1000).then(() => "pending"),
      ]);

      expect(results).not.toBe("pending");
      for (const result of results as PromiseSettledResult<string>[]) {
        expect(result.status).toBe("rejected");
        const reason = (result as PromiseRejectedResult).reason;
        expect(reason.reason).toBe("CircularDependency");
      }
    });

    it("throws for a cycle that runs through three requests", async () => {
      const wires: Record<string, TypeWire<string>> = {};
      const link = (token: string, next: string) =>
        typeWireOf({
          token,
          creator: async (ctx) => {
            await sleep(5);
            return `${token}(${await (wires[next] as TypeWire<string>).getInstance(ctx)})`;
          },
        });
      wires.A = link("A", "B");
      wires.B = link("B", "C");
      wires.C = link("C", "A");
      const all = Object.values(wires);
      const container = await containerWith(...all);

      const results = await Promise.race([
        Promise.allSettled(all.map((wire) => wire.getInstance(container))),
        sleep(1000).then(() => "pending"),
      ]);

      expect(results).not.toBe("pending");
      const reasons = (results as PromiseSettledResult<string>[]).map(
        (result) => (result as PromiseRejectedResult).reason?.reason,
      );
      expect(reasons).toEqual([
        "CircularDependency",
        "CircularDependency",
        "CircularDependency",
      ]);
    });

    it("waits for another request's creation when there is no cycle", async () => {
      let created = 0;
      const shared = typeWireOf({
        token: "Shared",
        creator: async () => {
          created += 1;
          await sleep(5);
          return "shared";
        },
      });
      const a = typeWireOf({
        token: "A",
        imports: { shared },
        createWith: ({ shared }) => `a(${shared})`,
      });
      const b = typeWireOf({
        token: "B",
        imports: { shared },
        createWith: ({ shared }) => `b(${shared})`,
      });
      const container = await containerWith(a, b);

      expect(
        await Promise.all([a.getInstance(container), b.getInstance(container)]),
      ).toEqual(["a(shared)", "b(shared)"]);
      expect(created).toBe(1);
    });

    it("lets a creator keep its context and resolve through it later", async () => {
      // A breaks its cycle with B by resolving B lazily, after A is created.
      const a: TypeWire<{ b(): string }> = typeWireOf({
        token: "A",
        creator: (ctx) => ({ b: () => b.getInstanceSync(ctx) }),
      });
      const b: TypeWire<string> = typeWireOf({
        token: "B",
        creator: (ctx) => {
          a.getInstanceSync(ctx);
          return "b";
        },
      });
      const container = await containerWith(a, b);

      const instance = await a.getInstance(container);
      expect(instance.b()).toBe("b");
    });

    it("lets a creator start a resolve it does not await", async () => {
      // The logger resolves the service after the service's creator returned.
      const service: TypeWire<{ logger: Promise<string> }> = typeWireOf({
        token: "Service",
        creator: (ctx) => ({ logger: logger.getInstance(ctx) }),
      });
      const logger: TypeWire<string> = typeWireOf({
        token: "Logger",
        creator: async (ctx) => {
          await sleep(1);
          await service.getInstance(ctx);
          return "logger";
        },
      });
      const container = await containerWith(service, logger);

      const instance = await service.getInstance(container);
      expect(await instance.logger).toBe("logger");
    });

    it("detects a cycle through a kept context while the outer creation runs", async () => {
      const inner: TypeWire<() => unknown> = typeWireOf({
        token: "Inner",
        creator: (ctx) => () => outer.getInstanceSync(ctx),
      });
      const outer: TypeWire<unknown> = typeWireOf({
        token: "Outer",
        creator: (ctx) => inner.getInstanceSync(ctx)(),
      });
      const container = await containerWith(inner, outer);

      expect(() => outer.getInstanceSync(container)).toThrow(
        expect.objectContaining({ reason: "CircularDependency" }),
      );
    });
  });

  describe("monitors", () => {
    it("tags errors with the request id of the default monitor", async () => {
      const missing = typeWireOf<string>({ token: "Missing" });
      const root = typeWireOf({
        token: "Root",
        creator: (ctx) => ctx.get(missing.type),
      });
      const container = await containerWith(root);

      const err = await root.getInstance(container).catch((e) => e);
      expect(typeof err.requestId).toBe("symbol");
    });

    it("detects cycles whatever monitor is configured", async () => {
      const requests: ResolutionRequest[] = [];
      const container = new TypeWireContainer({
        resolutionRequestMonitorFactory: (request) => {
          requests.push(request);
          return {
            monitor: (_type, action) => action(),
            monitorAsync: async (_type, action) => action(),
          };
        },
      });
      const a: TypeWire<string> = typeWireOf({
        token: "A",
        creator: async (ctx) => `a(${await b.getInstance(ctx)})`,
      });
      const b: TypeWire<string> = typeWireOf({
        token: "B",
        creator: async (ctx) => `b(${await a.getInstance(ctx)})`,
      });
      await a.apply(container);
      await b.apply(container);

      const err = await a.getInstance(container).catch((e) => e);
      expect(err.reason).toBe("CircularDependency");
      expect(resolutionPath(err)).toBe("A -> B -> [A]");
      expect(requests).toHaveLength(1);
    });
  });
});

describe("singleton creation in flight", () => {
  it("getSync does not run the creator again while a creation is in flight", async () => {
    let created = 0;
    const db = typeWireOf({
      token: "Db",
      creator: async () => {
        created += 1;
        const id = created;
        await sleep(5);
        return { id };
      },
    });
    const container = await containerWith(db);

    const first = db.getInstance(container);
    expect(() => db.getInstanceSync(container)).toThrow(
      expect.objectContaining({ reason: "AsyncOnlyBinding", retriable: true }),
    );

    const firstValue = await first;
    expect(await db.getInstance(container)).toBe(firstValue);
    expect(db.getInstanceSync(container)).toBe(firstValue);
    expect(created).toBe(1);
  });

  it("getSync starts one creation that a later get shares", async () => {
    let created = 0;
    const db = typeWireOf({
      token: "Db",
      imports: {},
      createWith: () => {
        created += 1;
        return { created };
      },
    });
    const container = await containerWith(db);

    // createWith runs through an async creator, so the first getSync starts
    // the creation and throws; the second one must not start another.
    expect(() => db.getInstanceSync(container)).toThrow(
      expect.objectContaining({ reason: "AsyncOnlyBinding" }),
    );
    expect(() => db.getInstanceSync(container)).toThrow(
      expect.objectContaining({ reason: "AsyncOnlyBinding" }),
    );
    const value = await db.getInstance(container);

    expect(db.getInstanceSync(container)).toBe(value);
    expect(created).toBe(1);
  });

  it("does not report a rejected creation started by getSync as unhandled", async () => {
    let calls = 0;
    const flaky = typeWireOf({
      token: "Flaky",
      creator: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("boom");
        }
        return "ok";
      },
    });
    const container = await containerWith(flaky);

    expect(() => flaky.getInstanceSync(container)).toThrow(
      expect.objectContaining({ reason: "AsyncOnlyBinding" }),
    );
    await sleep(1);

    // vitest fails the run on an unhandled rejection; the next get retries.
    expect(await flaky.getInstance(container)).toBe("ok");
  });

  describe("unbind while a creation is in flight", () => {
    function gatedWire() {
      let created = 0;
      const gate = deferred();
      const wire = typeWireOf({
        token: "Gated",
        creator: async () => {
          created += 1;
          const id = created;
          if (id === 1) {
            await gate.promise;
          } else {
            await sleep(5);
          }
          return { id };
        },
      });
      return { wire, gate, created: () => created };
    }

    it("does not cache the value of a creation started before unbind", async () => {
      const { wire, gate, created } = gatedWire();
      const container = await containerWith(wire);

      const old = wire.getInstance(container);
      await container.unbind(wire.type);
      await wire.apply(container);
      const fresh = wire.getInstance(container);

      gate.resolve();
      expect((await old).id).toBe(1);
      expect((await wire.getInstance(container)).id).toBe(2);
      expect((await fresh).id).toBe(2);
      expect(created()).toBe(2);
    });

    it("does not let a rejected pre-unbind creation remove the newer one", async () => {
      const { wire, gate, created } = gatedWire();
      const container = await containerWith(wire);

      const old = wire.getInstance(container).catch((e: Error) => e.message);
      await container.unbind(wire.type);
      await wire.apply(container);
      const fresh = wire.getInstance(container);

      gate.reject(new Error("boom"));
      expect(await old).toBe("boom");
      const next = wire.getInstance(container);

      expect((await fresh).id).toBe(2);
      expect(await next).toBe(await fresh);
      expect(created()).toBe(2);
    });
  });
});
