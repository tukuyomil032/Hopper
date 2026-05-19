# hopper — task runner
# Usage: just <recipe>

_default:
    @just --list --unsorted

# ── Development ────────────────────────────────────────────────────────────
# Start CLI in watch mode (hot reload)
dev:
    cd packages/cli && pnpm dev

# Run CLI directly (e.g. just run search economy)
run *args:
    cd packages/cli && pnpm tsx src/index.ts {{args}}

# ── Build ──────────────────────────────────────────────────────────────────
# Compile TypeScript
build:
    cd packages/cli && pnpm build

# Clean build artifacts
clean:
    rm -rf packages/cli/dist packages/cli/node_modules node_modules

# ── Tests ──────────────────────────────────────────────────────────────────
# Run all tests once
test:
    pnpm -r test

# Run tests in watch mode
test-watch:
    cd packages/cli && pnpm test:watch

# ── Lint & Format ──────────────────────────────────────────────────────────
# Lint with oxlint
lint:
    npx oxlint packages/cli/src

# Lint and auto-fix
lint-fix:
    npx oxlint packages/cli/src --fix

# Check formatting (no writes)
fmt-check:
    npx oxfmt packages/cli/src --check

# Format source files
fmt:
    npx oxfmt packages/cli/src

# ── Git hooks ──────────────────────────────────────────────────────────────
# Install lefthook git hooks
hooks:
    npx lefthook install

# ── Install ────────────────────────────────────────────────────────────────
# Install all workspace dependencies
install:
    pnpm install
