# Changelog

## 0.2.0

- Depends on `@typewirets/core` 0.2.0.
- **`useTypeWire` returns preloaded falsy values.** It ended with `if (value) return value`, so a preloaded `0`, `""`, `false` or `null` suspended as if it weren't ready, and the fallback showed. It now tells "not ready" apart from a falsy value.
- **New: `usePreload({ wires })`.** Suspends the calling component until every singleton in `wires` is created, in parallel, so components below it read them with `useTypeWire` without suspending: one fallback for a route or feature instead of one per wire. Skips wires that aren't singletons; a failed creation reaches the nearest error boundary. Works with any resolution context. New type: `UsePreloadOpts`.
- **New: `useTypeWire(wire, { suspend: false })`.** Throws a `TypeWireError` with reason `NotPreloaded`, naming the wire, instead of suspending when the value isn't created yet, so a forgotten preload shows up at once. The default still suspends. New type: `UseTypeWireOpts`.
- The README leads with preloading: `container.preload` before the first render, `usePreload` per route or feature, and Suspense for wires nobody preloaded.
- **`useTypeWire` creates a `createWith` singleton once on first mount.** With `@typewirets/core` before this release, one reader created it twice, two readers in one Suspense boundary three times, and one reader under `StrictMode` four times. The fix is in core; upgrade `@typewirets/core` and `@typewirets/react` together ([#21](https://github.com/typewirets/typewirets/issues/21)).
- **A component no longer gets a creation started before `unbind`.** `ReactResolutionContext` kept its own map of in-flight `get` calls. After `container.unbind(type)` and a re-apply, a component that mounted while the old creation was still pending got the old binding's value, or waited forever if that creation never finished. The map is gone; `@typewirets/core` already shares one in-flight creation per singleton and keeps creations from before `unbind` away from new callers. Two side effects:
  - A custom `ResolutionContext` passed to `ResolutionContextProvider` must now share one in-flight creation per singleton itself, or readers may get different instances. `TypeWireContainer` and the `@typewirets/inversify` adapter both do.
  - Concurrent `get` calls through `useContainer()` for a *transient* async wire no longer share one instance.
- **Re-rendering `ResolutionContextProvider` keeps cached errors and the context value.** The provider used to build a new `ReactResolutionContext` on every render. Any re-render cleared the error cache, so failing wires were created again, and every consumer got a new context value. With a Suspense boundary above the provider, a failing async wire was created again on every retry, forever. The provider now uses one wrapper per context.
- **New: `ReactResolutionContext.clearErrors(typeSymbol?)`.** A cached resolution error lasts until you clear it, including after `unbind` and a re-apply, because the cache can't tell that a binding changed. To retry, pass your own `ReactResolutionContext` to the provider, call `clearErrors` after replacing the binding, and reset the error boundary. A failure that settles after `clearErrors` is not cached. See "When a resolution fails" in the README.
- **Node.js 22 or later is required.** `engines.node` is now `>=22`, because Node.js 20 reached end-of-life on 30 April 2026. CI tests Node.js 22, 24 and 26.

### Also in this release: changes prepared as 0.1.1, which was never published

- **CommonJS `require()` works.** The package is `"type": "module"`, so Node loaded the CommonJS build in `dist/cjs` as an ES module: `require()` from plain Node (TypeScript compiled to CommonJS, ts-node) threw `ReferenceError: exports is not defined`. Bundlers, Jest and ESM `import` were not affected. The build now writes `dist/cjs/package.json` with `{"type":"commonjs"}`.

## 0.2.0-rc.1

Release candidate for 0.2.0, with the same changes. They are listed under 0.2.0.

## 0.1.0

- Initial release.
