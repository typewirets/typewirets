# Changelog

## 0.2.0-rc.1

- Depends on `@typewirets/core` 0.2.0-rc.1.

- **Node.js 22 or later is required.** `engines.node` is now `>=22`, because Node.js 20 reached end-of-life on 30 April 2026. CI tests Node.js 22, 24 and 26.
- **Re-applying a wire after it was resolved builds a fresh value, by design.** The adapter replaces the Inversify binding, and Inversify discards its cached instance, so caching stays Inversify's job. `@typewirets/core`'s `TypeWireContainer` keeps the cached value instead. The README and `bind`'s TSDoc now say so, and a test pins it.
- **Always `await` `bind` and `apply`.** Inversify 7 has no synchronous unbind, so on an already-bound type the new binding is registered only after the old one is removed. Until then, resolving the type returns the old binding's value.
- Release this adapter together with `@typewirets/core` and `@typewirets/react`. It pins core exactly, so an adapter released on its own can be installed next to a core whose `BindingContext` contract it does not match. See the release checklist in `MAINTAINING.md`.

### Also in this release: changes prepared as 0.1.1, which was never published

- `InversifyAdapter.bind` now replaces an existing binding for the same type itself, because `@typewirets/core`'s `apply` no longer unbinds before binding. Re-applying a wire still replaces its Inversify binding and discards Inversify's cached instance, as in 0.1.0.
- Upgrade this adapter together with `@typewirets/core` 0.2.0-rc.1. Adapter 0.1.0 with wires from this core adds a second Inversify binding when a wire is re-applied, because neither side unbinds.
- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.

## 0.1.0

- Initial release.
