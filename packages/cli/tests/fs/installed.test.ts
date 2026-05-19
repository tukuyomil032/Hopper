import { mkdir, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type InstalledEntry,
  readInstalled,
  removeInstalled,
  upsertInstalled,
} from "../../src/fs/installed.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `hopper-installed-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});
afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const sampleEntry: InstalledEntry = {
  name: "luckperms",
  version: "5.4.145",
  fileName: "LuckPerms-Bukkit-5.4.145.jar",
  installedAt: "2026-01-01T00:00:00.000Z",
};

describe("readInstalled", () => {
  it("returns empty array when file does not exist", async () => {
    expect(await readInstalled(tmpDir)).toEqual([]);
  });
});

describe("upsertInstalled", () => {
  it("adds a new entry", async () => {
    await upsertInstalled(tmpDir, sampleEntry);
    const entries = await readInstalled(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe("luckperms");
  });

  it("updates existing entry by name", async () => {
    await upsertInstalled(tmpDir, sampleEntry);
    await upsertInstalled(tmpDir, { ...sampleEntry, version: "5.4.200" });
    const entries = await readInstalled(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.version).toBe("5.4.200");
  });

  it("creates .hopper directory automatically", async () => {
    await upsertInstalled(tmpDir, sampleEntry);
    const entries = await readInstalled(tmpDir);
    expect(entries).toHaveLength(1);
  });
});

describe("removeInstalled", () => {
  it("removes entry by name", async () => {
    await upsertInstalled(tmpDir, sampleEntry);
    await removeInstalled(tmpDir, "luckperms");
    expect(await readInstalled(tmpDir)).toEqual([]);
  });

  it("is a no-op when entry does not exist", async () => {
    await removeInstalled(tmpDir, "nonexistent");
    expect(await readInstalled(tmpDir)).toEqual([]);
  });
});
