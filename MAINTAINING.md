# Maintaining TypeWire

This document captures policies and guidelines for maintaining the TypeWire monorepo. It is intended for human contributors and AI-assisted development tools alike.

## TypeScript Version Policy

- **Pinned version**: All packages pin the same TypeScript version in `devDependencies` (currently `5.8.x`).
- **Upgrade cadence**: Bump TypeScript within 4 weeks of a new stable minor release (e.g., 5.9, 5.10). Patch releases can be adopted immediately.
- **Upgrade process**:
  1. Update `typescript` in every `packages/*/package.json` to the new version.
  2. Run `pnpm install` from the root.
  3. Run `pnpm turbo check-types` to surface any new diagnostics.
  4. Run `pnpm turbo test` to verify runtime behavior.
  5. Review the [TypeScript release notes](https://devblogs.microsoft.com/typescript/) for breaking changes or new strict options worth enabling.

## Dependency Guidelines

### Core (`@typewirets/core`)

Core must have **zero runtime dependencies**. It is container-agnostic by design. If you find a dependency listed under `dependencies` in `packages/core/package.json`, it is almost certainly a mistake — move or remove it.

### Adapter Packages (`@typewirets/inversify`, etc.)

Adapters bridge TypeWire to a specific container or framework. The container library itself (e.g., `inversify`) should be a **`peerDependency`** so that consumers control the version. List the same package in `devDependencies` for local development and testing.

### Framework Integrations (`@typewirets/react`, etc.)

Framework packages should declare the framework as a **`peerDependency`** with a wide range covering supported major versions. Type packages (e.g., `@types/react`) should also be listed as **optional `peerDependencies`** for consumers on framework versions that don't bundle types.

### General Rules

| Category | Where to list | Notes |
|---|---|---|
| Build tools (`rimraf`, `typescript`, `vitest`) | `devDependencies` | Never ship to consumers |
| Workspace siblings (`@typewirets/core`) | `dependencies` | Use `workspace:*` protocol |
| Shared config (`@typewirets/typescript-config`) | `devDependencies` | Build-time only |
| External containers/frameworks | `peerDependencies` | Let consumers control versions |

## Package Metadata Checklist

Every publishable package (`packages/core`, `packages/inversify`, `packages/react`) should include:

- `"sideEffects": false` — enables tree-shaking in bundlers
- `"engines": { "node": ">=22" }` — documents the minimum supported Node.js version (the oldest Node.js LTS line still in support; raise it when that line reaches end-of-life, and keep the CI matrix in `.github/workflows/ci.yml` on every supported LTS line)
- `"exports"` with `types`, `import`, and `require` conditions — supports both ESM and CJS consumers
- `"files"` array — limits what gets published to npm

## Releasing

All publishable packages are released together at one version by the **Publish to npm** workflow (`.github/workflows/publish.yml`). Package versions stay at `0.0.0` in git; the workflow writes the release version into each package at release time.

The workflow publishes with npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so there is no npm token in GitHub. It uses [staged publishing](https://docs.npmjs.com/staged-publishing): CI uploads each package to a private staging area, and nothing is public until a maintainer approves it on npm with 2FA.

### Releasing a version

1. On `main`, give each publishable package's `CHANGELOG.md` a `## <version>` section. The workflow refuses to run without one, and the GitHub release notes are built from these sections.
2. Run **Publish to npm** from the Actions tab on `main` with the version and **dry-run** checked. It runs CI, builds, packs and checks every tarball, and stages nothing.
3. Run it again with **dry-run** unchecked. When the **Stage on npm** job finishes, its summary lists one `npm stage approve <stage-id>` command per package.
4. Approve each package with 2FA, `@typewirets/core` first, because the other packages pin it to the exact version:
   - on npmjs.com, in the **Staged Packages** tab, or
   - from a terminal where you are logged in: `npm stage approve <stage-id>` (npm prompts for your one-time code).

   You can inspect a staged tarball first with `npm stage download <stage-id>`, or discard it with `npm stage reject <stage-id>`.
5. The **Wait for approval on npm** job checks the public registry every minute. Once every package is live, **Tag and GitHub release** creates the `v<version>` tag on the commit the run built from, along with the GitHub release.

Versions with a pre-release suffix (e.g. `0.2.0-rc.1`) are published under the `next` dist-tag and marked as pre-releases on GitHub. Plain `X.Y.Z` versions are published under `latest`.

### If something goes wrong

- **The wait job timed out (after 3 hours).** Approve the packages on npm, then use **Re-run failed jobs** on the run. That re-runs only the wait and release jobs; nothing is staged again.
- **You don't want to release what was staged.** Reject each stage (`npm stage reject <stage-id>`) and cancel the run. No tag or GitHub release is created until every package is live.
- **Staging failed partway.** Reject the packages that did get staged before starting a new run.

### One-time setup

- **GitHub:** create the environments `npm` and `dry-run` (Settings → Environments). Limit `npm` to the `main` branch under deployment branches.
- **npm:** for each publishable package, open Settings → Trusted publishing on npmjs.com and add a GitHub Actions publisher: organization `typewirets`, repository `typewirets`, workflow `publish.yml`, environment `npm`. Leave the allowed actions at `npm stage publish` only. A new configuration expires unless it is used for a successful publish within 2 days, so add it right before the first release that uses it.
- **npm, after the first successful release:** set each package's publishing access to **Require two-factor authentication and disallow tokens**. Trusted publishing keeps working.
- **New packages:** trusted publishing can only be set up for a package that already exists on npm, so publish a new package's first version by hand, then add the trusted publisher.

## Type System Conventions

- Use **`unknown`** over `any` wherever possible. The `AnyType` alias exists as a targeted escape hatch and should not spread.
- The `scope` field on `TypeWire` is typed as `string` intentionally. The built-in scopes are `'singleton'` and `'transient'`, but the type is left open so consumers can define custom scopes (e.g., `'request'` for HTTP request-scoped DI).
- `TypeSymbol<T>` uses a phantom/branded type pattern intentionally. Do not simplify it to a plain `symbol` alias — see the TSDoc on the type for the rationale.
- All public interfaces and types should have TSDoc comments. Include `@template`, `@param`, `@returns`, and `@example` tags where they add value. This directly improves autocomplete and inline documentation in editors and AI tools.

## tsconfig Conventions

- The shared base config lives in `packages/typescript-config/base.json`.
- `strict: true` is always on. Do not disable individual strict flags.
- `noUncheckedIndexedAccess: true` is enabled — handle `undefined` when indexing arrays/records.
- `verbatimModuleSyntax` is **not yet enabled** because the current triple-build approach (`tsc --module Commonjs` for CJS output) is incompatible with it. When the build is migrated to a bundler like `tsup`, enable this option and use `import type` / `export type` for type-only imports.
- Only include `DOM` libs in packages that actually target the browser (e.g., `react`). The base config uses `es2022` only; the `react-library.json` preset adds `DOM` and `DOM.Iterable`.

## Documentation

Documentation lives in-repo as markdown files:

- `/docs/` — Design documents, guides, and comparisons
- `/packages/*/README.md` — Per-package API docs and usage examples
- TSDoc comments in source — Primary API reference, consumed by editors and tooling

There is no hosted documentation site at this time. The docs are structured so that one could be added later (e.g., via VitePress or Starlight) without reorganization.

### Writing for AI/VA Consumption

When writing TSDoc or markdown documentation, keep in mind that AI coding assistants are a primary consumer:

- Use precise, unambiguous language in `@param` and `@returns` descriptions
- Include short `@example` blocks — they are heavily weighted by AI tools for suggesting usage
- Document constraints and invariants explicitly (e.g., "this method throws if..." rather than implying it)
- Keep type names descriptive — `TypeWireScope` is better than `Scope` for global discoverability
