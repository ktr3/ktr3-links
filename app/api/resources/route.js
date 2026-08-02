import { listPublicResources } from "../../../lib/resources/repository.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { resources: await listPublicResources() },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Unable to list resources", error);
    return Response.json(
      { error: "resources_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
