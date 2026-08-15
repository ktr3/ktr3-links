import { getRequestAdmin } from "../../../../../lib/auth/server.js";
import { undergroundAnalyticsSummary } from "../../../../../lib/underground/analytics-repository.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const admin = await getRequestAdmin(request);
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const range = new URL(request.url).searchParams.get("days");
    return Response.json(await undergroundAnalyticsSummary(range), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load Underground analytics summary", error);
    return Response.json(
      { error: "analytics_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
