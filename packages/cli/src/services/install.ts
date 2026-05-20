import { access } from "node:fs/promises";
import * as path from "node:path";
import * as manifestFs from "../fs/manifest.js";
import * as lockFs from "../fs/lock.js";
import * as installedFs from "../fs/installed.js";
import * as multi from "../registries/multi.js";
import type { ResolvedPlugin } from "../registries/types.js";
import { downloadFile } from "./download.js";
import { ResolveError } from "./errors.js";

export interface InstallOptions {
  cwd: string;
  pluginsDir: string;
  version?: string;
  platform?: string;
  minecraft?: string;
  force?: boolean;
  dryRun?: boolean;
  save?: boolean;
  noDeps?: boolean;
}

export interface InstallResult {
  name: string;
  version: string;
  fileName: string;
  skipped: boolean;
}

export async function installPlugin(
  name: string,
  opts: InstallOptions,
  onProgress?: (msg: string) => void,
): Promise<InstallResult> {
  const lock = await lockFs.readLock(opts.cwd);

  const lockedEntry = lock?.plugins[name];
  if (lockedEntry && !opts.version) {
    return installResolved(
      {
        name,
        version: lockedEntry.version,
        downloadUrl: lockedEntry.downloadUrl,
        fileName: lockedEntry.fileName,
        dependencies: [],
        source: "modrinth",
      },
      opts,
      lock,
      onProgress,
    );
  }

  onProgress?.(`Resolving ${name}...`);
  const resolved = await multi.resolve(name, {
    version: opts.version,
    platform: opts.platform,
    minecraft: opts.minecraft,
  });

  if (!resolved) {
    throw new ResolveError(`Plugin "${name}" not found in any registry`);
  }

  return installResolved(resolved, opts, lock, onProgress);
}

async function installResolved(
  resolved: ResolvedPlugin,
  opts: InstallOptions,
  existingLock: lockFs.Lock | null,
  onProgress?: (msg: string) => void,
): Promise<InstallResult> {
  const destFile = path.join(opts.pluginsDir, resolved.fileName);

  if (!opts.force) {
    const exists = await fileExists(destFile);
    if (exists) {
      return {
        name: resolved.name,
        version: resolved.version,
        fileName: resolved.fileName,
        skipped: true,
      };
    }
  }

  if (!opts.dryRun) {
    onProgress?.(`Downloading ${resolved.name}@${resolved.version}...`);
    const dl = await downloadFile(resolved.downloadUrl, opts.pluginsDir, resolved.fileName);

    const lock = existingLock ?? lockFs.createEmptyLock(await readServerInfo(opts.cwd));
    const updated = lockFs.upsertPlugin(lock, resolved.name, {
      version: resolved.version,
      fileName: resolved.fileName,
      downloadUrl: resolved.downloadUrl,
      integrity: `sha256-${dl.sha256}`,
      dependencies: flattenDeps(resolved.dependencies),
    });
    await lockFs.writeLock(opts.cwd, updated);

    await installedFs.upsertInstalled(opts.cwd, {
      name: resolved.name,
      version: resolved.version,
      fileName: resolved.fileName,
      installedAt: new Date().toISOString(),
    });

    if (opts.save) {
      await manifestFs.addPlugin(opts.cwd, resolved.name, resolved.version);
    }

    if (!opts.noDeps) {
      for (const dep of resolved.dependencies) {
        if (dep.optional) continue;
        await installPlugin(
          dep.name,
          { ...opts, version: dep.range, save: false },
          onProgress,
        ).catch(() => {
          console.error(
            `Failed to install dependency ${dep.name}@${dep.range} for ${resolved.name}`,
          );
        });
      }
    }
  }

  return {
    name: resolved.name,
    version: resolved.version,
    fileName: resolved.fileName,
    skipped: false,
  };
}

export async function installFromManifest(
  opts: InstallOptions,
  onProgress?: (msg: string) => void,
): Promise<InstallResult[]> {
  const manifest = await manifestFs.readManifest(opts.cwd);
  if (!manifest) {
    throw new ResolveError(`hopper-plugin.json not found in ${opts.cwd}`);
  }

  const lock = await lockFs.readLock(opts.cwd);
  const results: InstallResult[] = [];

  for (const [name, range] of Object.entries(manifest.plugins)) {
    const lockedEntry = lock?.plugins[name];
    const version = lockedEntry?.version ?? range;
    const result = await installPlugin(name, { ...opts, version }, onProgress);
    results.push(result);
  }

  return results;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readServerInfo(cwd: string) {
  const manifest = await manifestFs.readManifest(cwd);
  return manifest?.server;
}

function flattenDeps(deps: ResolvedPlugin["dependencies"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const d of deps) {
    result[d.name] = d.range;
  }
  return result;
}
