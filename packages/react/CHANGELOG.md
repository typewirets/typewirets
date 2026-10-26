# Changelog

## Unreleased

- **Node.js 22 or later is required.** `engines.node` is now `>=22`, because Node.js 20 reached end-of-life on 30 April 2026. CI tests Node.js 22, 24 and 26.

## 0.1.1

- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.
- Depends on `@typewirets/core` 0.1.1.

## 0.1.0

- Initial release.
