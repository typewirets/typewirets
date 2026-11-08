# typewirets development commands

# Install dependencies exactly as pnpm-lock.yaml pins them
install:
    pnpm install --frozen-lockfile

# Lint with Biome
lint:
    pnpm lint

# Format with Biome
fmt:
    pnpm fmt

# Build every package, dependencies first
build:
    pnpm build

# Type-check every package
check-types:
    pnpm check-types

# Run the package tests, then the release and setup script tests
test:
    pnpm test
    pnpm test:scripts

# Everything CI runs
check: install lint build check-types test
    node scripts/check-cjs-entry-points.mjs
