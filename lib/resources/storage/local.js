import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

function resolveStoragePath(root, key) {
  if (typeof key !== "string" || !key || path.isAbsolute(key) || key.includes("\0")) {
    throw new Error("Invalid storage key");
  }

  const normalized = path.posix.normalize(key.replaceAll("\\", "/"));
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Invalid storage key");
  }

  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, normalized);
  if (filePath === rootPath || !filePath.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error("Invalid storage key");
  }
  return filePath;
}

export function createLocalStorage({ root }) {
  if (!root) throw new Error("Local resource storage requires a root directory");

  return {
    driver: "local",

    async put(key, bytes, contentType = "application/octet-stream") {
      const filePath = resolveStoragePath(root, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, bytes);
      await writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }));
      return { key };
    },

    async get(key) {
      const filePath = resolveStoragePath(root, key);
      const fileStats = await stat(filePath);
      let metadata = {};
      try {
        metadata = JSON.parse(await readFile(`${filePath}.meta.json`, "utf8"));
      } catch {
        metadata = {};
      }
      return {
        body: createReadStream(filePath),
        contentType: metadata.contentType || "application/octet-stream",
        contentLength: fileStats.size,
      };
    },

    async delete(key) {
      const filePath = resolveStoragePath(root, key);
      await Promise.all([
        rm(filePath, { force: true }),
        rm(`${filePath}.meta.json`, { force: true }),
      ]);
    },

    async signedDownloadUrl() {
      return null;
    },
  };
}
