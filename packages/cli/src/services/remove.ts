import { unlink } from "node:fs/promises";
import * as path from "node:path";
import * as installedFs from "../fs/installed.js";
import * as lockFs from "../fs/lock.js";
import * as manifestFs from "../fs/manifest.js";
import { UserError } from "./errors.js";

export interface RemoveOptions {
  cwd: string;
  pluginsDir: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface RemoveResult {
  name: string;
  version: string;
  fileName: string;
}

export async function removePlugin(
  name: string,
  opts: RemoveOptions,
  onProgress?: (msg: string) => void,
): Promise<RemoveResult> {
  const installed = await installedFs.readInstalled(opts.cwd);
  const entry = installed.find((e) => e.name.toLowerCase() === name.toLowerCase());

  if (!entry) {
    throw new UserError(`Plugin "${name}" is not installed`);
  }

  const lock = await lockFs.readLock(opts.cwd);

  if (!opts.force && lock) {
    const dependents = Object.entries(lock.plugins)
      .filter(
        ([pName, pEntry]) =>
          pName !== entry.name &&
          entry.name.toLowerCase() in
            Object.fromEntries(
              Object.keys(pEntry.dependencies).map((k) => [k.toLowerCase(), true]),
            ),
      )
      .map(([pName]) => pName);

    if (dependents.length > 0) {
      throw new UserError(
        `Plugin "${entry.name}" is required by: ${dependents.join(", ")}. Use --force to remove anyway.`,
      );
    }
  }

  if (!opts.dryRun) {
    onProgress?.(`Removing ${entry.name}@${entry.version}...`);

    const jarPath = path.join(opts.pluginsDir, entry.fileName);
    try {
      await unlink(jarPath);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        throw e;
      }
    }

    if (lock) {
      const updated = lockFs.removePlugin(lock, entry.name);
      await lockFs.writeLock(opts.cwd, updated);
    }

    await installedFs.removeInstalled(opts.cwd, entry.name);
    await manifestFs.removePlugin(opts.cwd, entry.name);
  }

  return {
    name: entry.name,
    version: entry.version,
    fileName: entry.fileName,
  };
}
