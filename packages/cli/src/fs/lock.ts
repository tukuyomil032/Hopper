import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { UserError } from "../services/errors.js";

const LockEntrySchema = z.object({
  version: z.string(),
  fileName: z.string(),
  downloadUrl: z.string(),
  integrity: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).default({}),
});

const LockSchema = z.object({
  lockfileVersion: z.literal(1),
  generatedAt: z.string(),
  server: z
    .object({
      platform: z.string(),
      minecraftVersion: z.string(),
    })
    .optional(),
  plugins: z.record(z.string(), LockEntrySchema).default({}),
});

export type Lock = z.infer<typeof LockSchema>;
export type LockEntry = z.infer<typeof LockEntrySchema>;

export const LOCK_FILENAME = "hopper-lock.yaml";

export async function readLock(cwd: string): Promise<Lock | null> {
  const filePath = path.join(cwd, LOCK_FILENAME);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw new UserError(`Failed to read ${LOCK_FILENAME}: ${(e as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = parse(raw) as unknown;
  } catch {
    throw new UserError(`${LOCK_FILENAME} is not valid YAML`);
  }

  const result = LockSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new UserError(`${LOCK_FILENAME} validation failed: ${issues}`);
  }

  return result.data;
}

export async function writeLock(cwd: string, lock: Lock): Promise<void> {
  const updated: Lock = { ...lock, generatedAt: new Date().toISOString() };
  const filePath = path.join(cwd, LOCK_FILENAME);
  await writeFile(filePath, stringify(updated), "utf8");
}

export function createEmptyLock(server?: { platform: string; minecraftVersion: string }): Lock {
  return {
    lockfileVersion: 1,
    generatedAt: new Date().toISOString(),
    server,
    plugins: {},
  };
}

export function upsertPlugin(lock: Lock, name: string, entry: LockEntry): Lock {
  return {
    ...lock,
    plugins: { ...lock.plugins, [name]: entry },
  };
}

export function removePlugin(lock: Lock, name: string): Lock {
  const plugins = { ...lock.plugins };
  delete plugins[name];
  return { ...lock, plugins };
}
