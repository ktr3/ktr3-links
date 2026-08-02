import { resourceFileResponse } from "../../../../../../lib/resources/http.js";
import {
  getPublicResourceBySlug,
  getResourceFile,
} from "../../../../../../lib/resources/repository.js";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { slug, kind } = await context.params;
  if (!["cover", "preview"].includes(kind)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const resource = await getPublicResourceBySlug(slug);
  if (!resource) return Response.json({ error: "not_found" }, { status: 404 });
  const file = await getResourceFile(resource.id, kind);
  if (!file) return Response.json({ error: "not_found" }, { status: 404 });
  return resourceFileResponse(file);
}
