import { normalizeBeatStarsPlayerUrl } from "../../../lib/content/beatstars.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const playerUrl = normalizeBeatStarsPlayerUrl(process.env.BEATSTARS_PLAYER_URL);
    if (!playerUrl) return new Response(null, { status: 204 });
    return Response.json(
      { playerUrl },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Invalid BeatStars player configuration", error);
    return Response.json({ error: "beatstars_player_unavailable" }, { status: 503 });
  }
}
