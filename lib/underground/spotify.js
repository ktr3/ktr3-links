const SPOTIFY_RESOURCE_PATTERN = /open\.spotify\.com\/(artist|track|album|playlist)\/([^/?#]+)/;

export function spotifyResource(url) {
  if (!url) return null;
  const match = url.match(SPOTIFY_RESOURCE_PATTERN);
  if (!match) return null;

  return { type: match[1], id: match[2] };
}

export function spotifyEmbedUrl(url) {
  const resource = spotifyResource(url);
  return resource
    ? `https://open.spotify.com/embed/${resource.type}/${resource.id}`
    : null;
}

export function spotifyEmbedType(url) {
  return spotifyResource(url)?.type || null;
}

export function spotifyUri(url) {
  const resource = spotifyResource(url);
  return resource ? `spotify:${resource.type}:${resource.id}` : null;
}

export function formatPlaybackTime(milliseconds) {
  const safeMilliseconds = Number.isFinite(milliseconds) && milliseconds > 0
    ? milliseconds
    : 0;
  const totalSeconds = Math.floor(safeMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function loadSpotifyUriIfChanged(controller, loadedUri, nextUri) {
  if (!controller || !nextUri || loadedUri === nextUri) return loadedUri;
  controller.loadUri(nextUri);
  return nextUri;
}
