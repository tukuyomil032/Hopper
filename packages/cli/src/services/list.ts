import * as gt from "semver";
import * as installedFs from "../fs/installed.js";
import * as lockFs from "../fs/lock.js";
import * as multi from "../registries/multi.js";

export interface ListOptions {
  cwd: string;
  outdated?: boolean;
}

export interface ListEntry {
  name: string;
  version: string;
  fileName: string;
  source?: string;
  installedAt: string;
  latestVersion?: string;
  upToDate?: boolean;
}

function detectSource(downloadUrl: string): string {
  if (downloadUrl.includes("modrinth.com")) return "modrinth";
  if (downloadUrl.includes("hangar.papermc.io")) return "hangar";
  return "unknown";
}

export async function listPlugins(
  opts: ListOptions,
  onProgress?: (msg: string) => void,
): Promise<ListEntry[]> {
  const installed = await installedFs.readInstalled(opts.cwd);
  if (installed.length === 0) return [];

  const lock = await lockFs.readLock(opts.cwd);

  const entries: ListEntry[] = installed.map((e) => {
    const lockEntry = lock?.plugins[e.name];
    const source = lockEntry ? detectSource(lockEntry.downloadUrl) : undefined;
    return {
      name: e.name,
      version: e.version,
      fileName: e.fileName,
      source,
      installedAt: e.installedAt,
    };
  });

  if (!opts.outdated) return entries;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    onProgress?.(`Checking ${entry.name}...`);
    try {
      const detail = await multi.getDetail(entry.name);
      if (detail) {
        entry.latestVersion = detail.latestVersion;
        entry.upToDate = !gt.gt(detail.latestVersion, entry.version);
      }
    } catch {
      // best-effort: leave latestVersion undefined
    }
  }

  return entries;
}
