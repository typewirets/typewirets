# Changelog

## 0.1.1

- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.
- **`useTypeWire` creates a wire's value once on first render.** With core 0.1.0, a `createWith` wire read through `useTypeWire` was created two to four times on first mount (more readers or `StrictMode` meant more creations), and every reader ended with the last one. The fix is in core 0.1.1's `getSync`; tests here pin one creation for one reader, two readers in one `Suspense` boundary, and one reader under `StrictMode`.
- Depends on `@typewirets/core` 0.1.1.

## 0.1.0

- Initial release.
