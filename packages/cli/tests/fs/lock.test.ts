import { mkdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LOCK_FILENAME,
  type Lock,
  type LockEntry,
  createEmptyLock,
  readLock,
  removePlugin,
  upsertPlugin,
  writeLock,
} from "../../src/fs/lock.js";
import { UserError } from "../../src/services/errors.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `hopper-lock-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});
afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const sampleLock: Lock = {
  lockfileVersion: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  server: { platform: "paper", minecraftVersion: "1.21.1" },
  plugins: {},
};

const sampleEntry: LockEntry = {
  version: "5.4.145",
  fileName: "LuckPerms-Bukkit-5.4.145.jar",
  downloadUrl: "https://example.com/luckperms.jar",
  dependencies: {},
};

describe("readLock", () => {
  it("returns null when file does not exist", async () => {
    expect(await readLock(tmpDir)).toBeNull();
  });

  it("reads valid lock file", async () => {
    await writeFile(path.join(tmpDir, LOCK_FILENAME), JSON.stringify(sampleLock), "utf8");
    const result = await readLock(tmpDir);
    expect(result?.lockfileVersion).toBe(1);
    expect(result?.server?.platform).toBe("paper");
  });

  it("throws UserError on invalid JSON", async () => {
    await writeFile(path.join(tmpDir, LOCK_FILENAME), "bad", "utf8");
    await expect(readLock(tmpDir)).rejects.toBeInstanceOf(UserError);
  });
});

describe("writeLock", () => {
  it("writes lock and updates generatedAt", async () => {
    const before = Date.now();
    await writeLock(tmpDir, sampleLock);
    const result = await readLock(tmpDir);
    expect(result).not.toBeNull();
    expect(new Date(result!.generatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("createEmptyLock", () => {
  it("creates lock with lockfileVersion 1", () => {
    const lock = createEmptyLock();
    expect(lock.lockfileVersion).toBe(1);
    expect(lock.plugins).toEqual({});
  });

  it("includes server when provided", () => {
    const lock = createEmptyLock({ platform: "paper", minecraftVersion: "1.21.1" });
    expect(lock.server?.platform).toBe("paper");
  });
});

describe("upsertPlugin / removePlugin", () => {
  it("upserts a plugin entry", () => {
    const lock = upsertPlugin(sampleLock, "luckperms", sampleEntry);
    expect(lock.plugins["luckperms"]?.version).toBe("5.4.145");
  });

  it("removes a plugin entry", () => {
    const withPlugin = upsertPlugin(sampleLock, "luckperms", sampleEntry);
    const removed = removePlugin(withPlugin, "luckperms");
    expect(removed.plugins["luckperms"]).toBeUndefined();
  });
});
