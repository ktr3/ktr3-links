import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.js", import.meta.url);

test("the latest YouTube release refreshes from the same-origin feed endpoint", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.doesNotMatch(page, /LATEST_RELEASE_YOUTUBE_ID/);
  assert.match(page, /fetch\("\/api\/latest-youtube"/);
  assert.match(page, /setLatestRelease\(youtubeResult\.value\.video\)/);
  assert.match(page, /src=\{latestRelease\.embedUrl\}/);
  assert.match(page, /window\.open\(latestRelease\.url, "_blank"\)/);
  assert.match(page, /latestReleaseUrl=\{latestRelease\.url\}/);
});
