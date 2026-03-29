# Contributing to TypeWire

## Prerequisites

- **Node.js** >= 20 (active LTS)
- **Corepack** enabled — this auto-installs the correct pnpm version:
  ```bash
  corepack enable
  ```

## Getting Started

```bash
git clone https://github.com/typewirets/typewirets.git
cd typewirets
pnpm install
pnpm build
pnpm test
```

## Project Structure

```
typewirets/
├── packages/
│   ├── core/           # Core DI library (zero runtime dependencies)
│   ├── inversify/      # InversifyJS adapter
│   ├── react/          # React hooks and context provider
│   └── typescript-config/  # Shared tsconfig presets
├── recipes/            # Example applications
│   ├── express-example/
│   └── react-trpc-fastify/
├── docs/               # Design documents and guides
├── MAINTAINING.md      # Maintenance policies and conventions
└── turbo.json          # Turborepo build orchestration
```

The monorepo is managed by **pnpm workspaces** and **Turborepo**.

## Development Commands

All build and test tasks are orchestrated by [Turborepo](https://turborepo.dev). Turbo understands the dependency graph between packages (defined by `dependsOn` in `turbo.json`) — for example, `@typewirets/inversify` and `@typewirets/react` depend on `@typewirets/core`, so `turbo run build` builds core first, then its dependents in parallel.

### Running tasks across all packages

| Command | Description |
|---|---|
| `pnpm build` | Build all packages (respects dependency order) |
| `pnpm test` | Run all tests (vitest) |
| `pnpm lint` | Lint with Biome |
| `pnpm fmt` | Format with Biome |
| `pnpm check-types` | TypeScript type checking across all packages |

These commands invoke `turbo run <task>` under the hood (see `package.json` scripts).

### Build caching

Turbo caches task results locally based on file inputs, environment variables, and task configuration. When source files haven't changed since the last run, turbo replays the cached output instead of re-executing. You'll see `cache hit` in the output for individual cached tasks, and `>>> FULL TURBO` when every task was cached.

To bypass the cache and force re-execution of all tasks:

```bash
pnpm build -- --force
```

### Running tasks for a single package

For faster iteration during development, use turbo's `--filter` flag to target a specific package:

```bash
pnpm build -- --filter=@typewirets/core
pnpm test -- --filter=@typewirets/react
pnpm check-types -- --filter=@typewirets/inversify
```

You can also use pnpm's `--filter` to run any script directly in a specific package, bypassing turbo:

```bash
pnpm --filter @typewirets/core test
```

The turbo `--filter` approach is preferred when you want caching and dependency-aware execution. Use pnpm `--filter` when you want to run a script directly without turbo orchestration.

## Code Style

- **Biome** handles both linting and formatting (no ESLint or Prettier)
- Run `pnpm fmt` before committing to ensure consistent formatting
- See `biome.jsonc` at the repo root for the full configuration

## Type Checking

- `strict: true` is always enabled
- `noUncheckedIndexedAccess: true` — handle `undefined` when indexing arrays or records
- See [MAINTAINING.md](./MAINTAINING.md) for full tsconfig conventions and type system guidelines

## Writing Tests

- Tests use **vitest**
- Place test files in `__tests__/` directories adjacent to source code
- Follow existing test patterns in each package

## Documentation

- All public APIs must have **TSDoc comments**
- Include `@param`, `@returns`, `@throws`, and `@example` tags where they add value
- Write for AI/VA consumption: precise language, short examples, explicit constraints
- See [MAINTAINING.md § Documentation](./MAINTAINING.md#documentation) for the full style guide

## Pull Request Guidelines

1. **Branch from `main`**
2. **One logical change per PR** — keep changes focused
3. **Ensure CI passes**: lint, build, type checking, and tests
4. **Update documentation** if behavior changes
5. **Add TSDoc** for any new public API surface
6. Follow the project's [Best Practices](./docs/best-practices.md) conventions
