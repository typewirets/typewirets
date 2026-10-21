# Changelog

## Unreleased

- **Requires Node.js 24 or later.** `engines.node` is now `>=24` (was `>=20`), following the active LTS line. Node 20 reached end of life in April 2026, and Node 22 is in maintenance until April 2027.

## 0.1.1

- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.
- Depends on `@typewirets/core` 0.1.1.

## 0.1.0

- Initial release.
