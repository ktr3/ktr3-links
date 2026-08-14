import assert from "node:assert/strict";
import test from "node:test";

import {
  latestYouTubeVideoFromFeed,
  youtubeVideo,
} from "../lib/content/latest-youtube.js";
import { normalizeBeatStarsPlayerUrl } from "../lib/content/beatstars.js";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>l6YgJPUQX30</yt:videoId>
    <title>THX Bass &amp; Serum — KTR3</title>
    <link rel="alternate" href="https://www.youtube.com/shorts/l6YgJPUQX30"/>
    <published>2026-08-14T12:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>3e33unFCCc8</yt:videoId>
    <title>Último beat completo</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=3e33unFCCc8"/>
    <published>2026-08-13T12:00:00+00:00</published>
  </entry>
</feed>`;

test("YouTube feed selects the newest valid upload and decodes its title", () => {
  assert.deepEqual(latestYouTubeVideoFromFeed(FEED), {
    videoId: "l6YgJPUQX30",
    title: "THX Bass & Serum — KTR3",
    publishedAt: "2026-08-14T12:00:00+00:00",
    kind: "short",
    url: "https://www.youtube.com/shorts/l6YgJPUQX30",
    embedUrl: "https://www.youtube.com/embed/l6YgJPUQX30",
  });
});

test("YouTube video helper rejects malformed identifiers", () => {
  assert.throws(() => youtubeVideo("../../evil"), /video id/i);
});

test("BeatStars player accepts only the official Blaze host and numeric store ID", () => {
  assert.equal(
    normalizeBeatStarsPlayerUrl("https://player.beatstars.com/?storeId=12345&utm_source=test"),
    "https://player.beatstars.com/?storeId=12345",
  );
  assert.equal(normalizeBeatStarsPlayerUrl(""), null);
  assert.throws(
    () => normalizeBeatStarsPlayerUrl("https://beatstars.example/?storeId=12345"),
    /BeatStars player URL/i,
  );
  assert.throws(
    () => normalizeBeatStarsPlayerUrl("https://player.beatstars.com/?storeId=abc"),
    /storeId/i,
  );
});
