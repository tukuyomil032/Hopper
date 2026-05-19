import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";

const InstalledEntrySchema = z.object({
  name: z.string(),
  version: z.string(),
  fileName: z.string(),
  installedAt: z.string(),
});

const InstalledSchema = z.object({
  installed: z.array(InstalledEntrySchema).default([]),
});

export type InstalledEntry = z.infer<typeof InstalledEntrySchema>;

export const INSTALLED_DIR = ".hopper";
export const INSTALLED_FILENAME = "installed.json";

function installedPath(cwd: string) {
  return path.join(cwd, INSTALLED_DIR, INSTALLED_FILENAME);
}

export async function readInstalled(cwd: string): Promise<InstalledEntry[]> {
  let raw: string;
  try {
    raw = await readFile(installedPath(cwd), "utf8");
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = InstalledSchema.safeParse(parsed);
  return result.success ? result.data.installed : [];
}

export async function upsertInstalled(cwd: string, entry: InstalledEntry): Promise<void> {
  const entries = await readInstalled(cwd);
  const idx = entries.findIndex((e) => e.name === entry.name);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  await persist(cwd, entries);
}

export async function removeInstalled(cwd: string, name: string): Promise<void> {
  const entries = await readInstalled(cwd);
  const filtered = entries.filter((e) => e.name !== name);
  await persist(cwd, filtered);
}

async function persist(cwd: string, entries: InstalledEntry[]): Promise<void> {
  const dir = path.join(cwd, INSTALLED_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(
    installedPath(cwd),
    JSON.stringify({ installed: entries }, null, 2) + "\n",
    "utf8",
  );
}
