import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { NetworkError } from "./errors.js";

export interface DownloadResult {
  filePath: string;
  sha256: string;
  byteLength: number;
}

export async function downloadFile(
  url: string,
  destDir: string,
  fileName: string,
): Promise<DownloadResult> {
  await mkdir(destDir, { recursive: true });

  const response = await fetch(url).catch((e: unknown) => {
    throw new NetworkError(`Failed to connect to ${url}: ${(e as Error).message}`);
  });

  if (!response.ok) {
    throw new NetworkError(`Download failed: ${response.status} ${response.statusText} (${url})`);
  }

  if (!response.body) {
    throw new NetworkError(`No response body from ${url}`);
  }

  const filePath = path.join(destDir, fileName);
  const hash = createHash("sha256");
  let byteLength = 0;

  const nodeReadable = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);

  const hashTransform = new (await import("node:stream")).Transform({
    transform(chunk: Buffer, _enc, cb) {
      hash.update(chunk);
      byteLength += chunk.length;
      cb(null, chunk);
    },
  });

  const writeStream = createWriteStream(filePath);
  await pipeline(nodeReadable, hashTransform, writeStream);

  return { filePath, sha256: hash.digest("hex"), byteLength };
}
