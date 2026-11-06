# Changelog

## Unreleased

- **`useTypeWire` creates a `createWith` singleton once on first mount.** With `@typewirets/core` before this release, one reader created it twice, two readers in one Suspense boundary three times, and one reader under `StrictMode` four times. The fix is in core; upgrade `@typewirets/core` and `@typewirets/react` together ([#21](https://github.com/typewirets/typewirets/issues/21)).
- **A component no longer gets a creation started before `unbind`.** `ReactResolutionContext` kept its own map of in-flight `get` calls. After `container.unbind(type)` and a re-apply, a component that mounted while the old creation was still pending got the old binding's value, or waited forever if that creation never finished. The map is gone; `@typewirets/core` already shares one in-flight creation per singleton and keeps creations from before `unbind` away from new callers. One side effect: concurrent `get` calls for a *transient* async wire through `useContainer()` no longer share one instance.
- **A cached resolution error lasts until `ResolutionContextProvider` re-renders or remounts, including after `unbind`.** This is how it already worked, and it is now documented. The cache stops a failing async wire from being created again on every Suspense retry, but it can't tell that a binding was replaced. Resetting an error boundary, or calling `unbind` and re-applying, shows the same error until the provider re-renders. See "When a resolution fails" in the README.
- **Node.js 22 or later is required.** `engines.node` is now `>=22`, because Node.js 20 reached end-of-life on 30 April 2026. CI tests Node.js 22, 24 and 26.

## 0.1.1

- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.
- Depends on `@typewirets/core` 0.1.1.

## 0.1.0

- Initial release.
