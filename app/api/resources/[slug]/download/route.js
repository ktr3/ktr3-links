import { getDatabase } from "../../../../../lib/db/client.js";
import { resourceFileResponse } from "../../../../../lib/resources/http.js";
import {
  getPublicResourceBySlug,
  getResourceFile,
} from "../../../../../lib/resources/repository.js";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  const { slug } = await context.params;
  const resource = await getPublicResourceBySlug(slug);
  if (!resource || resource.accessModel !== "open") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  const file = await getResourceFile(resource.id, "download");
  if (!file) return Response.json({ error: "not_found" }, { status: 404 });

  const sql = getDatabase();
  await sql`
    insert into resource_downloads (resource_id, resource_file_id, channel)
    values (${resource.id}, ${file.id}, 'open')
  `;
  return resourceFileResponse(file, { download: true });
}
