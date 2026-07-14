import {
  extractSoundCloudEmbedUrl,
  isSoundCloudUrl,
  soundCloudOEmbedUrl,
} from "../../../../lib/underground/soundcloud";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const sourceUrl = new URL(request.url).searchParams.get("url");
  if (!isSoundCloudUrl(sourceUrl)) {
    return Response.json(
      { error: "invalid_soundcloud_url" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(soundCloudOEmbedUrl(sourceUrl), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`SoundCloud oEmbed returned ${response.status}`);

    const payload = await response.json();
    const embedUrl = extractSoundCloudEmbedUrl(payload.html);
    if (!embedUrl) throw new Error("SoundCloud oEmbed did not return an approved player URL");

    return Response.json(
      {
        embedUrl,
        height: Number(payload.height) || 166,
        title: payload.title || "SoundCloud",
      },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Unable to resolve SoundCloud oEmbed", error);
    return Response.json(
      { error: "soundcloud_embed_unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
