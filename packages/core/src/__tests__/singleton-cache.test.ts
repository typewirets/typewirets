import { describe, it, expect } from "vitest";
import { TypeWireContainer, typeWireOf } from "../index";
import type { BindingContext, ResolutionContext } from "../index";

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

    it("keeps a creation in flight when an override is applied during it", async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const original = typeWireOf({
        token: "t.W",
        creator: async () => {
          await gate;
          return { from: "original" };
        },
      });
      let overrideCalls = 0;
      const container = new TypeWireContainer();
      await original.apply(container);

      const inFlight = original.getInstance(container);
      await original
        .withCreator(() => {
          overrideCalls += 1;
          return { from: "override" };
        })
        .apply(container);
      release();

      const first = await inFlight;
      expect(first).toEqual({ from: "original" });
      expect(await original.getInstance(container)).toBe(first);
      expect(overrideCalls).toBe(0);
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
});
