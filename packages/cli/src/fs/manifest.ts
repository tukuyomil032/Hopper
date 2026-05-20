import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { UserError } from "../services/errors.js";

const ManifestSchema = z.object({
  name: z.string().min(1),
  server: z.object({
    platform: z.enum(["paper", "spigot", "folia"]),
    minecraftVersion: z.string().min(1),
  }),
  plugins: z.record(z.string(), z.string()).default({}),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export const MANIFEST_FILENAME = "hopper-plmanifest.json";

export async function readManifest(cwd: string): Promise<Manifest | null> {
  const filePath = path.join(cwd, MANIFEST_FILENAME);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw new UserError(`Failed to read ${MANIFEST_FILENAME}: ${(e as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new UserError(`${MANIFEST_FILENAME} is not valid JSON`);
  }

  const result = ManifestSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new UserError(`${MANIFEST_FILENAME} validation failed: ${issues}`);
  }

  return result.data;
}

export async function writeManifest(cwd: string, manifest: Manifest): Promise<void> {
  const filePath = path.join(cwd, MANIFEST_FILENAME);
  await writeFile(filePath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export async function addPlugin(cwd: string, name: string, range: string): Promise<void> {
  const manifest = await readManifest(cwd);
  if (manifest === null) {
    throw new UserError(`${MANIFEST_FILENAME} not found in ${cwd}`);
  }
  manifest.plugins[name] = range;
  await writeManifest(cwd, manifest);
}

export async function removePlugin(cwd: string, name: string): Promise<void> {
  const manifest = await readManifest(cwd);
  if (manifest === null) return;
  delete manifest.plugins[name];
  await writeManifest(cwd, manifest);
}
