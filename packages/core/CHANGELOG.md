# Changelog

## 0.1.1

Fixes singleton-cache and concurrent-resolution behaviours that diverged from the typewire contract shared with the Python and Go ports, and fixes loading the package with CommonJS `require()`.

- **A singleton whose value is falsy is still cached.** The cache lookup tested the stored value for truthiness, so a creator returning `0`, `""`, `false`, `null` or `undefined` ran again on every resolve. The lookup now checks whether an entry exists.
- **An override applied after the singleton is cached has no effect on that value.** `apply` (including `wire.withCreator(...).apply(container)`) unbound the existing token before binding the new wire, which also threw away the cached value. `apply` now only calls `bind`, and the container decides what happens to a value it already holds. `TypeWireContainer.bind` replaces the binding but keeps a value that already exists or is still being created, so the new binding only affects values not yet created in that container. An override applied before the first resolve still takes effect. To discard a cached value on purpose, call `container.unbind(wire.type)` before re-applying.
- **An override of an import applied after the importer is cached leaves the importer's value alone.** Because of the same `apply` change, the import keeps the instance already built through the importer, so callers that hold the importer and callers that resolve the import directly get the same value.
- **A singleton is created once while its first creation is in flight.** `getSync` (and so `getInstanceSync`) checked only the cache, so while an async creator's first run was pending it ran the creator again and the second value replaced the first in the cache. Every `createWith` wire hit this through `useTypeWire`, because `createWith` runs through an async creator: one reader created the value twice, two readers three times, one reader under `StrictMode` four times. `getSync` now throws `AsyncOnlyBinding` without running the creator when a creation is in flight, and the value that creation produces is the one every caller gets. A creation started by `getSync` that rejects is no longer reported as an unhandled rejection.
- **A creation started before `unbind` no longer touches the cache.** When it settled after `unbind` and a new `apply`, it cached its value for the new binding, and if it rejected it removed the newer in-flight creation, so the next resolve started a third one. Only the current in-flight creation for a type may now cache its value or remove its entry, and it caches only if no value is cached yet. Callers already waiting on the old creation still get its result.
- **Resolving several imports at once inside one creator no longer raises a false `CircularDependency`.** One request shared a single resolution stack, so sibling resolves (`Promise.all`, or `TypeWireGroup.getAllInstances(ctx)` inside a creator) saw each other's entries, and the printed path mixed the siblings. The `createWith` path resolves imports one at a time and was not affected. Each creation now has its own link in a resolution chain, and its creator receives a context bound to that link.
- **A cycle entered from both ends at once throws instead of hanging.** With `A -> B -> A`, requesting `A` and `B` at the same time made each request await the other's in-flight creation, and neither settled. Before awaiting another request's in-flight creation, the container now follows what that creation is waiting on; if that leads back into the caller's own chain, it throws `CircularDependency`, with the path through the wait (for example `B -> A -> [B]`).
- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.

### Notes for `BindingContext` implementers

- `bind` must replace an existing binding for the same type, because `apply` no longer unbinds first. Its return type is now `void | Promise<void>`, and `apply` awaits it.
- The Inversify adapter's `bind` now does the unbind itself, so its behaviour is unchanged: re-applying still discards Inversify's cached instance.

### Notes for custom resolution monitors

- Circular dependency detection moved from `CircularDependencyMonitor` into the container, so it works whatever `resolutionRequestMonitorFactory` returns, and resolution paths in error messages are always filled in. `CircularDependencyMonitor` (the default monitor) now only tags errors with the request id.
- A monitor still receives every resolution of its request, but concurrent branches of one request now call it concurrently, so it must not assume that calls are nested.

## 0.1.0

- Initial release.
