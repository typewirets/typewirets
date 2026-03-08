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
- `"engines": { "node": ">=20" }` — documents the minimum supported Node.js version (track active LTS releases)
- `"exports"` with `types`, `import`, and `require` conditions — supports both ESM and CJS consumers
- `"files"` array — limits what gets published to npm

## Type System Conventions

- Use **`unknown`** over `any` wherever possible. The `AnyType` alias exists as a targeted escape hatch and should not spread.
- The `scope` field on `TypeWire` uses the `TypeWireScope` union type (`'singleton' | 'transient'`). Do not widen it to `string`.
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
