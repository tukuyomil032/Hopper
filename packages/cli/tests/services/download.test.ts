import { mkdir, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "../../src/services/download.js";
import { NetworkError } from "../../src/services/errors.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `hopper-dl-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});
afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function mockFetch(body: string, status = 200) {
  const readable = Readable.toWeb(Readable.from([Buffer.from(body)]));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      body: readable,
    }),
  );
}

describe("downloadFile", () => {
  it("downloads and returns correct sha256", async () => {
    mockFetch("hello world");
    const result = await downloadFile("https://example.com/test.jar", tmpDir, "test.jar");
    expect(result.filePath).toBe(path.join(tmpDir, "test.jar"));
    expect(result.sha256).toHaveLength(64);
    expect(result.byteLength).toBe(11);
    const content = await readFile(result.filePath, "utf8");
    expect(content).toBe("hello world");
  });

  it("throws NetworkError on non-2xx response", async () => {
    mockFetch("not found", 404);
    await expect(downloadFile("https://example.com/bad.jar", tmpDir, "bad.jar")).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it("throws NetworkError when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(downloadFile("https://example.com/fail.jar", tmpDir, "fail.jar")).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});
