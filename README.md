<div align="center">

# hopper

**Minecraft plugin manager — the npm for your server.**

[![npm version](https://img.shields.io/npm/v/hopper)](https://www.npmjs.com/package/hopper) [![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

Hopper is a CLI plugin manager for Minecraft Java Edition servers. It queries [Modrinth](https://modrinth.com) and [Hangar](https://hangar.papermc.io) simultaneously, letting you declare, install, update, and lock plugins the same way npm manages packages.

- Parallel search across Modrinth and Hangar with deduplication
- Modrinth-first resolution with automatic Hangar fallback
- Reproducible installs via `hopper-plmanifest.json` + `hopper-lock.yaml`
- SHA-256 integrity verification on every downloaded `.jar`
- `--dry-run` mode on install, update, and remove
- Machine-readable `--json` output for scripting and CI

## Requirements

- **Node.js >= 18** (uses the built-in `fetch` API)
- **Java** — optional, but checked by `hopper doctor`
- macOS, Linux, and Windows are supported

> [!NOTE]
> Hopper relies on the `fetch` API introduced in Node.js 18. Earlier versions are not supported.

## Installation

```sh
# npm
npm install -g hopper

# pnpm
pnpm add -g hopper

# Try without installing
npx hopper --help
```

The CLI is available under five aliases: `hopper`, `hop`, `ho`, `h`, and `hr`.

## Quick Start

```sh
# 1. Go to your server root (the directory that contains plugins/)
cd /path/to/my-minecraft-server

# 2. Initialize a manifest
hopper init

# 3. Search for plugins
hopper search economy

# 4. Install the latest version of a plugin
hopper install essentialsx

# 5. Install a specific version
hopper install luckperms@v5.5.42

# 6. Install everything listed in hopper-plmanifest.json
hopper install

# 7. Check for available updates
hopper list --outdated

# 8. Update all plugins
hopper update
```

## Commands

### init

Create `hopper-plmanifest.json` in the current directory. Prompts for project name, server platform, and Minecraft version (fetched from Mojang).

```sh
hopper init           # interactive
hopper init --yes     # non-interactive, use defaults
```

| Option | Description |
|--------|-------------|
| `--yes` | Skip prompts and use defaults |

---

### install

Install one or more plugins. With no arguments, installs everything in the manifest.

```sh
hopper install                            # install from manifest
hopper install luckperms                  # latest version
hopper install luckperms@v5.5.42          # pinned version
hopper install worldedit worldguard       # multiple plugins at once
hopper install essentialsx --dry-run      # preview without writing
```

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing `.jar` files |
| `--no-deps` | Skip automatic dependency installation |
| `--dry-run` | Preview actions without writing any files |

> [!NOTE]
> Every install updates `hopper-plmanifest.json` with the resolved version and writes `hopper-lock.yaml` with the exact download URL and SHA-256 integrity hash.

---

### search

Search both Modrinth and Hangar simultaneously. Results are deduplicated and displayed in a unified list.

```sh
hopper search economy
hopper search permissions --minecraft 1.21.4 --platform paper --limit 5
hopper search vault --json
```

| Option | Description |
|--------|-------------|
| `--limit <n>` | Maximum number of results (default: 20) |
| `--minecraft <version>` | Filter by Minecraft version |
| `--platform <platform>` | Filter by platform (`paper`, `spigot`, `folia`, …) |

---

### info

Show detailed information about a plugin, including available versions and metadata.

```sh
hopper info luckperms
hopper info essentialsx --json
```

---

### list

List all installed plugins.

```sh
hopper list
hopper list --outdated    # check registries for newer versions
```

| Option | Description |
|--------|-------------|
| `--outdated` | Fetch latest versions and flag plugins that can be updated |

---

### update

Update one or all installed plugins.

```sh
hopper update                   # update all plugins
hopper update luckperms         # update a single plugin
hopper update --latest          # ignore manifest version range
hopper update --dry-run         # preview without applying
```

| Option | Description |
|--------|-------------|
| `--latest` | Force upgrade even if the manifest pins an older range |
| `--dry-run` | Preview updates without applying them |
| `--yes` | Skip confirmation prompts |

---

### remove

Remove an installed plugin and update the manifest and lock file.

```sh
hopper remove viaversion
hopper remove viaversion --yes       # skip the "Remove? (y/N)" prompt
hopper remove viaversion --dry-run   # preview removal
```

| Option | Description |
|--------|-------------|
| `--force` | Remove even if other plugins depend on this one |
| `--yes` | Skip confirmation prompt |
| `--dry-run` | Preview removal without deleting any files |

---

### doctor

Diagnose the current environment. Checks Node.js, Java, API reachability, and the manifest and lock files.

```sh
hopper doctor
hopper doctor --json   # machine-readable output for CI
```

Example output:

```
✔ Node.js v22.0.0
✔ Java 21.0.1
✔ plugins/ directory found (/srv/mc/plugins)
✔ Modrinth API reachable (134ms)
✔ Hangar API reachable (201ms)
✔ hopper-plmanifest.json found
✔ hopper-lock.yaml found
────────────────────────────────
✅ All checks passed (7/7)
```

## Global Options

These options work with every command and can be placed before or after the subcommand.

| Option | Description |
|--------|-------------|
| `--cwd <path>` | Run as if in this directory |
| `--plugins-dir <path>` | Plugins folder path (default: `<cwd>/plugins`) |
| `--json` | Output machine-readable JSON on stdout |
| `--silent` | Suppress all output |
| `--verbose` | Enable verbose logging |
| `--yes` | Skip all confirmation prompts |

```sh
hopper --cwd /srv/mc --plugins-dir /srv/mc/plugins install luckperms
hopper --json list | jq '.[].name'
```

## File Formats

### hopper-plmanifest.json

The project manifest — declare your server's plugins here, similar to `package.json`. Edit this file by hand or let `hopper install` and `hopper remove` keep it up to date.

```json
{
  "name": "my-server",
  "server": {
    "platform": "paper",
    "minecraftVersion": "1.21.4"
  },
  "plugins": {
    "luckperms": "v5.5.42",
    "essentialsx": "2.21.2",
    "worldedit": "7.4.3"
  }
}
```

| Field | Description |
|-------|-------------|
| `name` | Project name |
| `server.platform` | Server platform: `paper`, `spigot`, or `folia` |
| `server.minecraftVersion` | Target Minecraft version |
| `plugins` | Map of plugin slug to version string |

> [!TIP]
> Commit `hopper-plmanifest.json` to version control. Anyone who clones your server configuration can run `hopper install` to reproduce the exact plugin set.

---

### hopper-lock.yaml

Auto-generated lock file with resolved download URLs and integrity hashes, similar to `pnpm-lock.yaml`. Commit this file alongside the manifest for fully reproducible installs.

```yaml
lockfileVersion: 1
generatedAt: 2026-05-20T04:24:30.006Z
server:
  platform: paper
  minecraftVersion: "1.21.4"
plugins:
  luckperms:
    version: v5.5.42
    fileName: LuckPerms-Bukkit-5.5.42.jar
    downloadUrl: https://cdn.modrinth.com/data/Vebnzrzj/versions/fTIdfb46/LuckPerms-Bukkit-5.5.42.jar
    integrity: sha256-7751bd843e143b081e60744d886bd5bf411ccd3be8dedf1782768fbca2115cec
    dependencies: {}
```

| Field | Description |
|-------|-------------|
| `version` | Resolved version string |
| `fileName` | Name of the downloaded `.jar` |
| `downloadUrl` | Direct download URL |
| `integrity` | `sha256-<hex>` hash verified on download |
| `dependencies` | Map of dependency slugs to version ranges |

> [!WARNING]
> Do not edit `hopper-lock.yaml` by hand. It is generated and validated by Hopper; manual edits will corrupt the integrity hashes.

## Registries

Hopper queries Modrinth and Hangar in parallel using `Promise.allSettled`, so a single registry outage does not block the command. For `install` and `info`, Modrinth is tried first and Hangar is used as a fallback. Search results from both registries are merged and deduplicated by normalized slug.

- [Modrinth](https://modrinth.com) — `api.modrinth.com/v2`
- [Hangar](https://hangar.papermc.io) — `hangar.papermc.io/api/v1`

## JSON Output

Every command supports `--json` for scripting and CI pipelines. Human-readable output (spinners, colors) goes to stderr; JSON always goes to stdout.

```sh
# List installed plugin names
hopper --json list | jq '.[].name'

# Search and pick a plugin interactively
hopper --json search permissions | jq -r '.[].name' | fzf
```

## Development

```sh
git clone https://github.com/<org>/hopper.git
cd hopper
pnpm install

just dev              # start tsx watch mode (hot reload)
just run search luckperms   # run the CLI without building first
just build            # compile TypeScript to dist/
just test             # run Vitest
just lint             # oxlint
just fmt              # oxfmt
just hooks            # install lefthook git hooks
```

Source layout:

```
packages/cli/src/
├── commands/     # Commander.js command registration
├── services/     # Business logic (install, update, remove, list)
├── registries/   # Modrinth & Hangar API clients
├── fs/           # File I/O (manifest, lock, installed)
├── formatter/    # Output formatters (human, json-output)
└── index.ts      # Entry point + ASCII logo
```

> [!NOTE]
> Git hooks are managed by lefthook. Run `just hooks` after cloning to enable pre-commit lint and format checks.

## Architecture

<details>
<summary>Layer overview</summary>

**Command layer** (`commands/`) — parses CLI arguments, manages spinners and progress bars, delegates to services. Reads global options via `cmd.parent?.opts()`. Writes JSON when `--json` is set.

**Service layer** (`services/`) — pure business logic. Accepts an `onProgress` callback for spinner integration. Skips file I/O when `dryRun: true`. Throws typed errors (`UserError`, `ResolveError`, `NetworkError`, `FileSystemError`, `RegistryError`).

**Registry layer** (`registries/`) — `modrinth.ts` and `hangar.ts` each implement the same interface. `multi.ts` fans out to both registries with `Promise.allSettled` and merges/deduplicates the results.

**fs layer** (`fs/`) — `manifest.ts`, `lock.ts`, and `installed.ts` are validated with Zod schemas. Returns `null` on ENOENT; throws `UserError` on parse failures.

</details>
