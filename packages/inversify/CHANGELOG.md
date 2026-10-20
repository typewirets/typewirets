# Changelog

## 0.1.1

- `InversifyAdapter.bind` now replaces an existing binding for the same type itself, because `@typewirets/core` 0.1.1's `apply` no longer unbinds before binding. Re-applying a wire still replaces its Inversify binding and discards Inversify's cached instance, as in 0.1.0.
- Upgrade this adapter together with `@typewirets/core` 0.1.1. Adapter 0.1.0 with wires from core 0.1.1 adds a second Inversify binding when a wire is re-applied, because neither side unbinds.
- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.

## 0.1.0

- Initial release.
