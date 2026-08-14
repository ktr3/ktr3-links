export const KTR3_YOUTUBE_CHANNEL_ID = "UCjaeh5ikkZ6hyAjJkEVGypQ";
export const KTR3_YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${KTR3_YOUTUBE_CHANNEL_ID}`;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .trim();
}

function tag(entry, name) {
  const match = entry.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function alternateUrl(entry) {
  const link = entry.match(/<link\s+[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
  return link ? decodeXml(link[1]) : "";
}

export function youtubeVideo(videoId, input = {}) {
  if (!VIDEO_ID.test(videoId)) throw new Error("Invalid YouTube video ID");
  const url = input.url || `https://www.youtube.com/watch?v=${videoId}`;
  return {
    videoId,
    title: input.title || "Último trabajo de KTR3",
    publishedAt: input.publishedAt || null,
    kind: url.includes("/shorts/") ? "short" : "video",
    url,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}

export function latestYouTubeVideoFromFeed(feedXml) {
  const entries = String(feedXml || "").match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  for (const entry of entries) {
    const videoId = tag(entry, "yt:videoId");
    if (!VIDEO_ID.test(videoId)) continue;
    const url = alternateUrl(entry);
    if (!url.startsWith("https://www.youtube.com/")) continue;
    return youtubeVideo(videoId, {
      title: tag(entry, "title"),
      publishedAt: tag(entry, "published") || null,
      url,
    });
  }
  throw new Error("YouTube feed does not contain a valid video");
}

export async function fetchLatestYouTubeVideo({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(KTR3_YOUTUBE_FEED_URL, {
    headers: { Accept: "application/atom+xml, application/xml;q=0.9" },
    next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error(`YouTube feed responded ${response.status}`);
  return latestYouTubeVideoFromFeed(await response.text());
}
