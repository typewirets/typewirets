# Contributing to TypeWire

## Prerequisites

- **Node.js** >= 22 (a supported LTS line; the dev shell and the release use 26, the active LTS)
- **pnpm** 12 or later, installed any way you like (for example `npm install -g pnpm`). Any pnpm 12 switches to the exact version in `package.json`'s `packageManager` field, after checking it against npm's signature and the hashes in `pnpm-lock.yaml`. Corepack is not used: Node.js 25 and later no longer bundle it.

Or let [Nix](https://nixos.org/download) with flakes provide all of it: `nix develop --no-pure-eval` (or `direnv allow`, with [nix-direnv](https://github.com/nix-community/nix-direnv)) gives you Node.js 26, pnpm, `just`, `gh` and `git`. The dev shell is built with [devenv](https://devenv.sh), which needs `--no-pure-eval` to find the project directory, the same as in [typewirego](https://github.com/typewirego/typewirego) and [typewirepy](https://github.com/typewirepy/typewirepy).

To update pnpm, run `pnpm self-update <version>`: it rewrites `packageManager` and the pnpm entries in `pnpm-lock.yaml` together.

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
| `pnpm test:scripts` | Test the release scripts and the publish workflow's rules (`node --test`) |

These commands invoke `turbo run <task>` under the hood (see `package.json` scripts), except `pnpm test:scripts`, which runs Node's test runner directly.

With `just` (in the dev shell, or `nix develop --no-pure-eval -c just check`), `just check` runs everything CI runs: a frozen install, lint, build, type checks, the tests and the CommonJS entry point check. `just install`, `just lint`, `just fmt`, `just build`, `just check-types` and `just test` run one step each.

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
