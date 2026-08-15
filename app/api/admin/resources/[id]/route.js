import { assertTrustedMutation } from "../../../../../lib/auth/request.js";
import { getRequestAdmin } from "../../../../../lib/auth/server.js";
import {
  getAdminResourceById,
  updateResourceRecord,
} from "../../../../../lib/resources/repository.js";
import { parseResourceInput } from "../../../../../lib/resources/schema.js";
import {
  isUploadedFile,
  removeStoredFiles,
  storeGeneratedMidiPreview,
  storeUploadedFile,
} from "../../../../../lib/resources/store-upload.js";

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const admin = await getRequestAdmin(request);
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const resource = await getAdminResourceById(id);
  return resource
    ? Response.json({ resource }, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ error: "not_found" }, { status: 404 });
}

export async function PUT(request, context) {
  const storedFiles = [];
  try {
    assertTrustedMutation(request);
    const admin = await getRequestAdmin(request);
    if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const existing = await getAdminResourceById(id);
    if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

    const form = await request.formData();
    const input = parseResourceInput({
      title: form.get("title"),
      summary: form.get("summary"),
      description: form.get("description"),
      category: form.get("category"),
      accessModel: form.get("accessModel"),
      tags: form.get("tags"),
    });
    const download = form.get("download");
    const cover = form.get("cover");
    const preview = form.get("preview");
    if (isUploadedFile(download)) storedFiles.push(await storeUploadedFile(id, "download", download));
    if (isUploadedFile(cover)) storedFiles.push(await storeUploadedFile(id, "cover", cover));
    if (isUploadedFile(preview)) {
      storedFiles.push(await storeUploadedFile(id, "preview", preview));
    } else if (input.category === "midi" && isUploadedFile(download)) {
      storedFiles.push(await storeGeneratedMidiPreview(id, download));
    }

    const resource = await updateResourceRecord({
      id,
      input,
      files: storedFiles,
      adminId: admin.id,
    });
    const replaced = new Set(storedFiles.map((file) => file.kind));
    await removeStoredFiles(existing.files.filter((file) => replaced.has(file.kind)));
    return Response.json({ resource });
  } catch (error) {
    await removeStoredFiles(storedFiles);
    console.error("Unable to update resource", error);
    const clientError = /Invalid resource|not allowed|file size|filename|signature|ZIP archives|origin/i.test(error.message);
    return Response.json(
      { error: clientError ? error.message : "resource_update_unavailable" },
      { status: clientError ? 400 : 503 },
    );
  }
}
