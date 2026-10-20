# Changelog

## 0.1.1

Fixes three singleton-cache behaviours that diverged from the typewire contract shared with the Python and Go ports.

- **A singleton whose value is falsy is still cached.** The cache lookup tested the stored value for truthiness, so a creator returning `0`, `""`, `false`, `null` or `undefined` ran again on every resolve. The lookup now checks whether an entry exists.
- **An override applied after the singleton is cached has no effect on that value.** `apply` (including `wire.withCreator(...).apply(container)`) unbound the existing token before binding the new wire, which also threw away the cached value. `apply` now only calls `bind`, and the container decides what happens to a value it already holds. `TypeWireContainer.bind` replaces the binding but keeps a value that already exists or is still being created, so the new binding only affects values not yet created in that container. An override applied before the first resolve still takes effect. To discard a cached value on purpose, call `container.unbind(wire.type)` before re-applying.
- **An override of an import applied after the importer is cached leaves the importer's value alone.** Because of the same `apply` change, the import keeps the instance already built through the importer, so callers that hold the importer and callers that resolve the import directly get the same value.

### Notes for `BindingContext` implementers

- `bind` must replace an existing binding for the same type, because `apply` no longer unbinds first. Its return type is now `void | Promise<void>`, and `apply` awaits it.
- The Inversify adapter's `bind` now does the unbind itself, so its behaviour is unchanged: re-applying still discards Inversify's cached instance.

## 0.1.0

- Initial release.
