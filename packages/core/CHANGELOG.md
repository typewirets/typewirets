# Changelog

## Unreleased

- **New: `container.preload(opts?)` creates singletons ahead of time,** so they can be read with `getInstanceSync` afterwards. Without options it creates every singleton bound at the time of the call; with `{ wires }`, only those wires and their imports. Creations run in parallel, wires that aren't singletons are skipped, and values already created are kept, so a later call creates only what is new. A failure rejects with that creation's own error, and the other creations still finish and are cached. New type: `PreloadOpts`. See "Preloading" in the README.
- **`container.getAllAsync()` is deprecated** in favour of `preload`. It resolves bindings one at a time and also creates a value for every transient binding. It still works.
- **A singleton is created once, even when `getSync` runs while it is being created.** `getSync` (and `getInstanceSync`) used to start a second creation when an async creation was already in flight, so early callers and later callers held different instances. It now throws `AsyncOnlyBinding`, marked `retriable` also when called as `container.getSync`, and leaves the in-flight creation alone. This mostly hit `createWith` wires, which always create asynchronously ([#21](https://github.com/typewirets/typewirets/issues/21)).
- **A creation started before `unbind` no longer touches the cache.** Its value still goes to the callers that asked for it, but the new binding's value is the one cached, and a failing old creation no longer clears the new binding's in-flight creation ([#21](https://github.com/typewirets/typewirets/issues/21)).
- **A failing creation started by `getSync` no longer causes an unhandled rejection.** When `getSync` or `getInstanceSync` started an async creation that later failed, and no `get` was waiting for it, Node reported an unhandled rejection, which ends the process by default. A `get` that joins the creation still receives the error.
- A test now pins that a value still being created when a wire is re-applied is kept ([#17](https://github.com/typewirets/typewirets/issues/17)).
- **Node.js 22 or later is required.** `engines.node` is now `>=22`, because Node.js 20 reached end-of-life on 30 April 2026. CI tests Node.js 22, 24 and 26.

## 0.1.1

Fixes three singleton-cache behaviours that diverged from the typewire contract shared with the Python and Go ports, and fixes loading the package with CommonJS `require()`.

- **A singleton whose value is falsy is still cached.** The cache lookup tested the stored value for truthiness, so a creator returning `0`, `""`, `false`, `null` or `undefined` ran again on every resolve. The lookup now checks whether an entry exists.
- **An override applied after the singleton is cached has no effect on that value.** `apply` (including `wire.withCreator(...).apply(container)`) unbound the existing token before binding the new wire, which also threw away the cached value. `apply` now only calls `bind`, and the container decides what happens to a value it already holds. `TypeWireContainer.bind` replaces the binding but keeps a value that already exists or is still being created, so the new binding only affects values not yet created in that container. An override applied before the first resolve still takes effect. To discard a cached value on purpose, call `container.unbind(wire.type)` before re-applying.
- **An override of an import applied after the importer is cached leaves the importer's value alone.** Because of the same `apply` change, the import keeps the instance already built through the importer, so callers that hold the importer and callers that resolve the import directly get the same value.
- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.

### Notes for `BindingContext` implementers

- `bind` must replace an existing binding for the same type, because `apply` no longer unbinds first. Its return type is now `void | Promise<void>`, and `apply` awaits it.
- The Inversify adapter's `bind` now does the unbind itself, so its behaviour is unchanged: re-applying still discards Inversify's cached instance.

## 0.1.0

- Initial release.
