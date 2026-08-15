import {
  fetchLatestYouTubeVideo,
  youtubeVideo,
} from "../../../lib/content/latest-youtube.js";

export const dynamic = "force-dynamic";

const fallback = youtubeVideo("3e33unFCCc8", {
  title: "Avril Lavigne – Complicated (Jerk Remix / Type Beat) | Prod. KTR3",
});

export async function GET() {
  try {
    const video = await fetchLatestYouTubeVideo();
    return Response.json(
      { video, stale: false },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Unable to refresh latest YouTube video", error);
    return Response.json(
      { video: fallback, stale: true },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } },
    );
  }
}
