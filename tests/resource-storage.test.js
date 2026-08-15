import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createLocalStorage } from "../lib/resources/storage/local.js";
import {
  createStorageKey,
  normalizeDownloadName,
} from "../lib/resources/files.js";

test("local storage round-trips bytes and metadata", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ktr3-resources-"));
  const storage = createLocalStorage({ root: directory });

  try {
    await storage.put("resources/demo/file.mid", Buffer.from("MThd"), "audio/midi");
    const stored = await storage.get("resources/demo/file.mid");

    assert.equal(stored.contentType, "audio/midi");
    assert.equal(stored.contentLength, 4);
    assert.equal((await readFile(path.join(directory, "resources/demo/file.mid"))).toString(), "MThd");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("local storage never resolves outside its configured root", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ktr3-resources-"));
  const storage = createLocalStorage({ root: directory });

  try {
    await assert.rejects(() => storage.get("../secret"), /storage key/i);
    await assert.rejects(() => storage.put("/absolute/file.mid", Buffer.from("x"), "audio/midi"), /storage key/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("storage keys are randomized and do not retain unsafe names", () => {
  const first = createStorageKey("resource-id", "download", "Mi Beat (final).zip");
  const second = createStorageKey("resource-id", "download", "Mi Beat (final).zip");

  assert.notEqual(first, second);
  assert.match(first, /^resources\/resource-id\/download\/[a-f0-9-]+\.zip$/);
  assert.equal(first.includes("Mi Beat"), false);
});

test("download names are safe Content-Disposition filenames", () => {
  assert.equal(normalizeDownloadName("  Mi Beat ñ 2026.zip"), "Mi-Beat-n-2026.zip");
  assert.equal(normalizeDownloadName("../../evil.mid"), "evil.mid");
});
