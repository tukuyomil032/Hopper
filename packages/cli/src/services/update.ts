import { unlink } from "node:fs/promises";
import * as path from "node:path";
import * as semver from "semver";
import * as installedFs from "../fs/installed.js";
import * as lockFs from "../fs/lock.js";
import * as multi from "../registries/multi.js";
import { installPlugin } from "./install.js";
import { UserError } from "./errors.js";

export interface UpdateOptions {
  cwd: string;
  pluginsDir: string;
  dryRun?: boolean;
  latest?: boolean;
}

export interface UpdateResult {
  name: string;
  fromVersion: string;
  toVersion: string;
  fileName: string;
  skipped: boolean;
}

export async function updatePlugin(
  name: string,
  opts: UpdateOptions,
  onProgress?: (msg: string) => void,
): Promise<UpdateResult> {
  const installed = await installedFs.readInstalled(opts.cwd);
  const entry = installed.find((e) => e.name.toLowerCase() === name.toLowerCase());

  if (!entry) {
    throw new UserError(`Plugin "${name}" is not installed`);
  }

  onProgress?.(`Checking ${entry.name}...`);
  const resolved = await multi.resolve(entry.name, {});

  if (!resolved) {
    throw new UserError(`Could not resolve latest version for "${entry.name}"`);
  }

  const latestVersion = resolved.version;

  if (!opts.latest && !semver.gt(latestVersion, entry.version)) {
    return {
      name: entry.name,
      fromVersion: entry.version,
      toVersion: latestVersion,
      fileName: entry.fileName,
      skipped: true,
    };
  }

  if (!opts.dryRun) {
    onProgress?.(`Updating ${entry.name} ${entry.version} → ${latestVersion}...`);

    const oldJar = path.join(opts.pluginsDir, entry.fileName);
    try {
      await unlink(oldJar);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }

    await installPlugin(
      entry.name,
      {
        cwd: opts.cwd,
        pluginsDir: opts.pluginsDir,
        version: latestVersion,
        force: true,
      },
      onProgress,
    );
  }

  const lock = await lockFs.readLock(opts.cwd);
  const newFileName = lock?.plugins[entry.name]?.fileName ?? resolved.fileName;

  return {
    name: entry.name,
    fromVersion: entry.version,
    toVersion: latestVersion,
    fileName: newFileName,
    skipped: false,
  };
}

export async function updateAll(
  opts: UpdateOptions,
  onProgress?: (msg: string) => void,
): Promise<UpdateResult[]> {
  const installed = await installedFs.readInstalled(opts.cwd);
  if (installed.length === 0) return [];

  const results: UpdateResult[] = [];
  for (const entry of installed) {
    const result = await updatePlugin(entry.name, opts, onProgress);
    results.push(result);
  }
  return results;
}
