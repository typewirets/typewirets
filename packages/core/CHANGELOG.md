# Changelog

## 0.1.1

Fixes three singleton-cache behaviours that diverged from the typewire contract shared with the Python and Go ports. The only API change is the new optional `BindingContext.replacesOnBind` flag. Existing binders that don't set it behave as before.

- **A singleton whose value is falsy is still cached.** The cache lookup tested the stored value for truthiness, so a creator returning `0`, `""`, `false`, `null` or `undefined` ran again on every resolve. The lookup now checks whether an entry exists.
- **An override applied after the singleton is cached has no effect on that value.** `apply` (including `wire.withCreator(...).apply(container)`) unbound the existing token before binding the new wire, which also threw away the cached value. On a binder whose new optional `BindingContext.replacesOnBind` flag is true, re-applying now replaces the binding but keeps a value that already exists or is still being created, so the new binding only affects values not yet created in that container. An override applied before the first resolve still takes effect. `TypeWireContainer` sets the flag to true. Binders that leave it unset (or set it to false, like the Inversify adapter) are still unbound before binding, because their `bind` may add a second binding. To discard a cached value on purpose, call `container.unbind(wire.type)` before re-applying.
- **An override of an import applied after the importer is cached leaves the importer's value alone.** Because of the same `apply` change, the import keeps the instance already built through the importer, so callers that hold the importer and callers that resolve the import directly get the same value.

## 0.1.0

- Initial release.
