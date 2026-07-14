const SOUNDCLOUD_HOSTS = new Set([
  "soundcloud.com",
  "www.soundcloud.com",
  "on.soundcloud.com",
]);

export function isSoundCloudUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && SOUNDCLOUD_HOSTS.has(url.hostname.toLocaleLowerCase("en"));
  } catch {
    return false;
  }
}

export function soundCloudOEmbedUrl(value) {
  if (!isSoundCloudUrl(value)) return null;

  const endpoint = new URL("https://soundcloud.com/oembed");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", value);
  endpoint.searchParams.set("maxheight", "166");
  endpoint.searchParams.set("color", "ff5500");
  endpoint.searchParams.set("auto_play", "false");
  endpoint.searchParams.set("show_comments", "false");
  return endpoint.toString();
}

export function extractSoundCloudEmbedUrl(html) {
  const source = String(html || "").match(/\bsrc=["']([^"']+)["']/i)?.[1];
  if (!source) return null;

  try {
    const url = new URL(source.replaceAll("&amp;", "&"));
    return url.protocol === "https:" && url.hostname === "w.soundcloud.com"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
