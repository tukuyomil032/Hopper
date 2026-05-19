import { mkdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MANIFEST_FILENAME,
  type Manifest,
  addPlugin,
  readManifest,
  writeManifest,
} from "../../src/fs/manifest.js";
import { UserError } from "../../src/services/errors.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmp();
});
afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function mkTmp() {
  const dir = path.join(os.tmpdir(), `hopper-test-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

const baseManifest: Manifest = {
  name: "test-server",
  server: { platform: "paper", minecraftVersion: "1.21.1" },
  plugins: {},
};

describe("readManifest", () => {
  it("returns null when file does not exist", async () => {
    expect(await readManifest(tmpDir)).toBeNull();
  });

  it("reads valid manifest", async () => {
    await writeFile(
      path.join(tmpDir, MANIFEST_FILENAME),
      JSON.stringify(baseManifest),
      "utf8",
    );
    const result = await readManifest(tmpDir);
    expect(result?.name).toBe("test-server");
    expect(result?.server.platform).toBe("paper");
  });

  it("throws UserError on invalid JSON", async () => {
    await writeFile(path.join(tmpDir, MANIFEST_FILENAME), "not json", "utf8");
    await expect(readManifest(tmpDir)).rejects.toBeInstanceOf(UserError);
  });

  it("throws UserError on schema mismatch", async () => {
    await writeFile(
      path.join(tmpDir, MANIFEST_FILENAME),
      JSON.stringify({ name: 123 }),
      "utf8",
    );
    await expect(readManifest(tmpDir)).rejects.toBeInstanceOf(UserError);
  });
});

describe("writeManifest", () => {
  it("writes and can be read back", async () => {
    await writeManifest(tmpDir, { ...baseManifest, plugins: { luckperms: "^5.4.0" } });
    const result = await readManifest(tmpDir);
    expect(result?.plugins["luckperms"]).toBe("^5.4.0");
  });
});

describe("addPlugin", () => {
  it("adds plugin to existing manifest", async () => {
    await writeManifest(tmpDir, baseManifest);
    await addPlugin(tmpDir, "essentialsx", "^2.20.0");
    const result = await readManifest(tmpDir);
    expect(result?.plugins["essentialsx"]).toBe("^2.20.0");
  });

  it("throws UserError when manifest does not exist", async () => {
    await expect(addPlugin(tmpDir, "essentialsx", "^2.20.0")).rejects.toBeInstanceOf(UserError);
  });
});
