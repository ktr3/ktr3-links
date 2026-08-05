import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.js", import.meta.url);

test("the latest YouTube release is configured from one video ID", async () => {
  const page = await readFile(pagePath, "utf8");
  const configuredId = page.match(/const LATEST_RELEASE_YOUTUBE_ID = "([\w-]{11})";/);

  assert.ok(configuredId, "define one LATEST_RELEASE_YOUTUBE_ID constant");
  assert.equal(page.split(configuredId[1]).length - 1, 1, "write the raw video ID only once");
  assert.match(page, /const LATEST_RELEASE_YOUTUBE_URL = `https:\/\/www\.youtube\.com\/watch\?v=\$\{LATEST_RELEASE_YOUTUBE_ID\}`;/);
  assert.match(page, /const LATEST_RELEASE_YOUTUBE_EMBED_URL = `https:\/\/www\.youtube\.com\/embed\/\$\{LATEST_RELEASE_YOUTUBE_ID\}`;/);
  assert.match(page, /src=\{LATEST_RELEASE_YOUTUBE_EMBED_URL\}/);
  assert.match(page, /window\.open\(LATEST_RELEASE_YOUTUBE_URL, "_blank"\)/);
});
