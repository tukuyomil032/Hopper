import { mkdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as manifestFs from "../../src/fs/manifest.js";
import * as lockFs from "../../src/fs/lock.js";
import * as installedFs from "../../src/fs/installed.js";
import * as multi from "../../src/registries/multi.js";
import * as download from "../../src/services/download.js";
import { installPlugin, installFromManifest } from "../../src/services/install.js";
import { ResolveError } from "../../src/services/errors.js";

let tmpDir: string;
let pluginsDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `hopper-install-test-${Date.now()}`);
  pluginsDir = path.join(tmpDir, "plugins");
  await mkdir(pluginsDir, { recursive: true });
  vi.spyOn(multi, "resolve").mockResolvedValue({
    name: "luckperms",
    version: "5.4.145",
    downloadUrl: "https://example.com/lp.jar",
    fileName: "LuckPerms-Bukkit-5.4.145.jar",
    dependencies: [],
    source: "modrinth",
  });
  vi.spyOn(download, "downloadFile").mockResolvedValue({
    filePath: path.join(pluginsDir, "LuckPerms-Bukkit-5.4.145.jar"),
    sha256: "abc123",
    byteLength: 1000,
  });
});
afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const baseOpts = () => ({ cwd: tmpDir, pluginsDir });

describe("installPlugin", () => {
  it("resolves and downloads plugin", async () => {
    const result = await installPlugin("luckperms", baseOpts());
    expect(result.name).toBe("luckperms");
    expect(result.version).toBe("5.4.145");
    expect(result.skipped).toBe(false);
    expect(download.downloadFile).toHaveBeenCalledOnce();
  });

  it("skips when file already exists and no force", async () => {
    const jarPath = path.join(pluginsDir, "LuckPerms-Bukkit-5.4.145.jar");
    await writeFile(jarPath, "fake", "utf8");
    const result = await installPlugin("luckperms", baseOpts());
    expect(result.skipped).toBe(true);
    expect(download.downloadFile).not.toHaveBeenCalled();
  });

  it("re-downloads when --force and file exists", async () => {
    const jarPath = path.join(pluginsDir, "LuckPerms-Bukkit-5.4.145.jar");
    await writeFile(jarPath, "fake", "utf8");
    const result = await installPlugin("luckperms", { ...baseOpts(), force: true });
    expect(result.skipped).toBe(false);
    expect(download.downloadFile).toHaveBeenCalledOnce();
  });

  it("skips download on dry run", async () => {
    const result = await installPlugin("luckperms", { ...baseOpts(), dryRun: true });
    expect(result.skipped).toBe(false);
    expect(download.downloadFile).not.toHaveBeenCalled();
  });

  it("throws ResolveError when plugin not found", async () => {
    vi.spyOn(multi, "resolve").mockResolvedValue(null);
    await expect(installPlugin("unknown", baseOpts())).rejects.toBeInstanceOf(ResolveError);
  });

  it("writes lock entry after install", async () => {
    await installPlugin("luckperms", baseOpts());
    const lock = await lockFs.readLock(tmpDir);
    expect(lock?.plugins["luckperms"]?.version).toBe("5.4.145");
  });

  it("writes installed entry after install", async () => {
    await installPlugin("luckperms", baseOpts());
    const entries = await installedFs.readInstalled(tmpDir);
    expect(entries.find((e) => e.name === "luckperms")?.version).toBe("5.4.145");
  });

  it("prefers locked version when no explicit version given", async () => {
    const lock = lockFs.upsertPlugin(lockFs.createEmptyLock(), "luckperms", {
      version: "5.4.100",
      fileName: "LuckPerms-5.4.100.jar",
      downloadUrl: "https://example.com/old.jar",
      dependencies: {},
    });
    await lockFs.writeLock(tmpDir, lock);
    vi.spyOn(download, "downloadFile").mockResolvedValue({
      filePath: path.join(pluginsDir, "LuckPerms-5.4.100.jar"),
      sha256: "def",
      byteLength: 500,
    });

    const result = await installPlugin("luckperms", baseOpts());
    expect(result.version).toBe("5.4.100");
    expect(multi.resolve).not.toHaveBeenCalled();
  });
});

describe("installFromManifest", () => {
  it("installs all plugins listed in manifest", async () => {
    await writeFile(
      path.join(tmpDir, manifestFs.MANIFEST_FILENAME),
      JSON.stringify({
        name: "test",
        server: { platform: "paper", minecraftVersion: "1.21.1" },
        plugins: { luckperms: "^5.4.0" },
      }),
      "utf8",
    );
    const results = await installFromManifest(baseOpts());
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("luckperms");
  });

  it("throws ResolveError when manifest not found", async () => {
    await expect(installFromManifest(baseOpts())).rejects.toBeInstanceOf(ResolveError);
  });
});
