import { describe, it, expect } from "vitest";
import { TypeWireContainer, typeWireOf } from "../index";
import type { BindingContext, ResolutionContext } from "../index";
import { TypeWireError } from "../index";

function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function catchSync(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected the call to throw");
}

// A binder that is not a TypeWireContainer instance, as when the wire and the
// container come from two copies of the package.
function delegatingBinder(
  container: TypeWireContainer,
): BindingContext & ResolutionContext {
  return {
    bind: (wire) => container.bind(wire),
    unbind: (type) => container.unbind(type),
    isBound: (type) => container.isBound(type),
    get: (type) => container.get(type),
    getSync: (type) => container.getSync(type),
  };
}

// Regression tests for the singleton-cache rules shared by the typewire ports.
// P3: a singleton's value is cached once created, whatever the value is.
// P6: a container's cache is stable once a value exists.

describe("singleton cache", () => {
  describe("P3: falsy singleton values are cached", () => {
    it.each([0, "", false, null, undefined])(
      "creates %o only once through getInstance",
      async (value) => {
        let calls = 0;
        const wire = typeWireOf<unknown, never>({
          token: "t.Falsy",
          creator: () => {
            calls += 1;
            return value;
          },
        });
        const container = new TypeWireContainer();
        await wire.apply(container);

        expect(await wire.getInstance(container)).toBe(value);
        expect(await wire.getInstance(container)).toBe(value);
        expect(calls).toBe(1);
      },
    );

    it("creates a falsy value only once through getInstanceSync", async () => {
      let calls = 0;
      const wire = typeWireOf<number, never>({
        token: "t.Zero",
        creator: () => {
          calls += 1;
          return 0;
        },
      });
      const container = new TypeWireContainer();
      await wire.apply(container);

      expect(wire.getInstanceSync(container)).toBe(0);
      expect(wire.getInstanceSync(container)).toBe(0);
      expect(calls).toBe(1);
    });

    it("caches a falsy value produced by an async creator", async () => {
      let calls = 0;
      const wire = typeWireOf<number, never>({
        token: "t.AsyncZero",
        creator: async () => {
          calls += 1;
          return 0;
        },
      });
      const container = new TypeWireContainer();
      await wire.apply(container);

      expect(await wire.getInstance(container)).toBe(0);
      expect(await wire.getInstance(container)).toBe(0);
      expect(wire.getInstanceSync(container)).toBe(0);
      expect(calls).toBe(1);
    });
  });

  describe("P6: re-applying a wire keeps the cached value", () => {
    it("ignores an override applied after the singleton is cached", async () => {
      const original = typeWireOf({
        token: "t.W",
        creator: () => ({ from: "original" }),
      });
      const container = new TypeWireContainer();
      await original.apply(container);
      const first = await original.getInstance(container);
      expect(first).toEqual({ from: "original" });

      await original.withCreator(() => ({ from: "override" })).apply(container);

      expect(await original.getInstance(container)).toBe(first);
    });

    it("leaves the importer and its import alone when the import is overridden later", async () => {
      const dep = typeWireOf({
        token: "t.Dep",
        creator: () => ({ from: "original" }),
      });
      const svc = typeWireOf({
        token: "t.Svc",
        imports: { dep },
        createWith: ({ dep: built }) => ({ built }),
      });
      const container = new TypeWireContainer();
      await svc.apply(container);
      const first = await svc.getInstance(container);

      await dep.withCreator(() => ({ from: "override" })).apply(container);

      expect(await dep.getInstance(container)).toEqual({ from: "original" });
      expect(await dep.getInstance(container)).toBe(first.built);
      expect(await svc.getInstance(container)).toBe(first);
    });

    it("applies an override made before the first resolve", async () => {
      const original = typeWireOf({
        token: "t.W",
        creator: () => ({ from: "original" }),
      });
      const container = new TypeWireContainer();
      await original.apply(container);
      await original.withCreator(() => ({ from: "override" })).apply(container);

      expect(await original.getInstance(container)).toEqual({
        from: "override",
      });
    });

    it("applies an override of an import made before the importer resolves", async () => {
      const dep = typeWireOf({
        token: "t.Dep",
        creator: () => ({ from: "original" }),
      });
      const svc = typeWireOf({
        token: "t.Svc",
        imports: { dep },
        createWith: ({ dep: built }) => ({ built }),
      });
      const container = new TypeWireContainer();
      await svc.apply(container);
      await dep.withCreator(() => ({ from: "override" })).apply(container);

      expect(await svc.getInstance(container)).toEqual({
        built: { from: "override" },
      });
    });

    it("leaves the cache to the container, not to apply", async () => {
      const original = typeWireOf({
        token: "t.W",
        creator: () => ({ from: "original" }),
      });
      const binder = delegatingBinder(new TypeWireContainer());
      await original.apply(binder);
      const first = await original.getInstance(binder);

      await original.withCreator(() => ({ from: "override" })).apply(binder);

      expect(await original.getInstance(binder)).toBe(first);
    });

    it("keeps a value that is still being created when the wire is re-applied", async () => {
      const gate = deferred();
      let overrideRan = false;
      const original = typeWireOf({
        token: "t.W",
        creator: async () => {
          await gate.promise;
          return { from: "original" };
        },
      });
      const container = new TypeWireContainer();
      await original.apply(container);
      const inFlight = original.getInstance(container);

      await original
        .withCreator(() => {
          overrideRan = true;
          return { from: "override" };
        })
        .apply(container);
      const duringReapply = original.getInstance(container);
      gate.resolve();

      const first = await inFlight;
      expect(first).toEqual({ from: "original" });
      expect(await duringReapply).toBe(first);
      expect(await original.getInstance(container)).toBe(first);
      expect(overrideRan).toBe(false);
    });

    it("discards the cached value on an explicit unbind", async () => {
      const original = typeWireOf({
        token: "t.W",
        creator: () => ({ from: "original" }),
      });
      const container = new TypeWireContainer();
      await original.apply(container);
      await original.getInstance(container);

      await container.unbind(original.type);
      await original.withCreator(() => ({ from: "override" })).apply(container);

      expect(await original.getInstance(container)).toEqual({
        from: "override",
      });
    });
  });

  describe("one creation per singleton", () => {
    it("does not start a second creation when getSync runs while one is in flight", async () => {
      const gate = deferred();
      let calls = 0;
      const wire = typeWireOf({
        token: "t.Db",
        creator: async () => {
          calls += 1;
          await gate.promise;
          return { id: calls };
        },
      });
      const container = new TypeWireContainer();
      await wire.apply(container);
      const first = wire.getInstance(container);

      const err = catchSync(() => wire.getInstanceSync(container));
      expect(err).toBeInstanceOf(TypeWireError);
      expect((err as TypeWireError).reason).toBe("AsyncOnlyBinding");
      expect((err as TypeWireError).retriable).toBe(true);

      gate.resolve();
      const value = await first;
      expect(calls).toBe(1);
      expect(await wire.getInstance(container)).toBe(value);
      expect(wire.getInstanceSync(container)).toBe(value);
    });

    it("creates a synchronous createWith wire once when getSync is retried before it settles", async () => {
      let calls = 0;
      const wire = typeWireOf({
        token: "t.Svc",
        createWith: () => {
          calls += 1;
          return { id: calls };
        },
      });
      const container = new TypeWireContainer();
      await wire.apply(container);

      // createWith runs behind an async creator, so the first reads cannot be sync.
      catchSync(() => wire.getInstanceSync(container));
      catchSync(() => wire.getInstanceSync(container));
      const value = await wire.getInstance(container);

      expect(calls).toBe(1);
      expect(wire.getInstanceSync(container)).toBe(value);
    });

    it("marks the in-flight error retriable on container.getSync too", async () => {
      const gate = deferred();
      const wire = typeWireOf({
        token: "t.Slow",
        creator: async () => {
          await gate.promise;
          return { ready: true };
        },
      });
      const container = new TypeWireContainer();
      await wire.apply(container);

      // The first read starts the creation; the second finds it in flight.
      const starting = catchSync(() => container.getSync(wire.type));
      const inFlight = catchSync(() => container.getSync(wire.type));
      for (const err of [starting, inFlight]) {
        expect((err as TypeWireError).reason).toBe("AsyncOnlyBinding");
        expect((err as TypeWireError).retriable).toBe(true);
      }

      gate.resolve();
      expect(await wire.getInstance(container)).toEqual({ ready: true });
    });

    describe("a creation started by getSync that fails", () => {
      async function expectNoUnhandledRejection(run: () => Promise<void>) {
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => unhandled.push(reason);
        process.on("unhandledRejection", onUnhandled);
        try {
          await run();
          await new Promise((resolve) => setTimeout(resolve, 10));
        } finally {
          process.off("unhandledRejection", onUnhandled);
        }
        expect(unhandled).toEqual([]);
      }

      it("does not leave an unhandled rejection, and get reports the error", async () => {
        await expectNoUnhandledRejection(async () => {
          const gate = deferred();
          const wire = typeWireOf({
            token: "t.Failing",
            creator: async () => {
              await gate.promise;
              return { ok: true };
            },
          });
          const container = new TypeWireContainer();
          await wire.apply(container);

          catchSync(() => wire.getInstanceSync(container));
          const joined = wire.getInstance(container);
          gate.reject(new Error("boom"));

          await expect(joined).rejects.toThrow("boom");
        });
      });

      it("does not leave an unhandled rejection when nobody asks again", async () => {
        await expectNoUnhandledRejection(async () => {
          const gate = deferred();
          const wire = typeWireOf({
            token: "t.Failing",
            creator: async () => {
              await gate.promise;
              return { ok: true };
            },
          });
          const container = new TypeWireContainer();
          await wire.apply(container);

          catchSync(() => wire.getInstanceSync(container));
          await container.unbind(wire.type);
          gate.reject(new Error("boom"));
        });
      });
    });

    describe("a creation started before unbind", () => {
      // The first creation waits on `gate`; later ones wait on `freshGate`,
      // which is open unless a test holds it.
      async function setup({ holdFresh = false } = {}) {
        const gate = deferred();
        const freshGate = deferred();
        if (!holdFresh) {
          freshGate.resolve();
        }
        let calls = 0;
        const wire = typeWireOf({
          token: "t.Gated",
          creator: async () => {
            calls += 1;
            const id = calls;
            await (id === 1 ? gate.promise : freshGate.promise);
            return { id };
          },
        });
        const container = new TypeWireContainer();
        await wire.apply(container);
        const stale = wire.getInstance(container);
        await container.unbind(wire.type);
        await wire.apply(container);
        return { gate, freshGate, wire, container, stale, calls: () => calls };
      }

      it("gives its value to its own caller but never caches it", async () => {
        const { gate, wire, container, stale } = await setup();
        gate.resolve();
        expect(await stale).toEqual({ id: 1 });

        const fresh = await wire.getInstance(container);
        expect(fresh).toEqual({ id: 2 });
        expect(await wire.getInstance(container)).toBe(fresh);
      });

      it("does not overwrite a value the new binding already cached", async () => {
        const { gate, wire, container, stale, calls } = await setup();
        const fresh = await wire.getInstance(container);
        gate.resolve();
        await stale;

        expect(await wire.getInstance(container)).toBe(fresh);
        expect(calls()).toBe(2);
      });

      it("does not drop the new binding's in-flight creation when it fails", async () => {
        const { gate, freshGate, wire, container, stale, calls } = await setup({
          holdFresh: true,
        });
        const staleResult = stale.catch((err: Error) => err.message);
        const fresh = wire.getInstance(container);
        gate.reject(new Error("boom"));
        expect(await staleResult).toBe("boom");

        const next = wire.getInstance(container);
        freshGate.resolve();
        expect(await next).toBe(await fresh);
        expect(calls()).toBe(2);
      });
    });
  });
});
