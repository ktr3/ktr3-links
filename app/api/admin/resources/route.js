import { randomUUID } from "node:crypto";

import { assertTrustedMutation } from "../../../../lib/auth/request.js";
import { getRequestAdmin } from "../../../../lib/auth/server.js";
import {
  createResourceRecord,
  dashboardSummary,
  listAdminResources,
  listSubscribers,
} from "../../../../lib/resources/repository.js";
import { parseResourceInput } from "../../../../lib/resources/schema.js";
import {
  isUploadedFile,
  removeStoredFiles,
  storeGeneratedMidiPreview,
  storeUploadedFile,
} from "../../../../lib/resources/store-upload.js";

export const dynamic = "force-dynamic";

function inputFromForm(form) {
  return parseResourceInput({
    title: form.get("title"),
    summary: form.get("summary"),
    description: form.get("description"),
    category: form.get("category"),
    accessModel: form.get("accessModel"),
    tags: form.get("tags"),
  });
}

export async function GET(request) {
  const admin = await getRequestAdmin(request);
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [resources, summary, subscribers] = await Promise.all([
    listAdminResources(),
    dashboardSummary(),
    listSubscribers(),
  ]);
  return Response.json(
    { resources, summary, subscribers },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request) {
  const storedFiles = [];
  try {
    assertTrustedMutation(request);
    const admin = await getRequestAdmin(request);
    if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

    const form = await request.formData();
    const input = inputFromForm(form);
    const download = form.get("download");
    if (!isUploadedFile(download)) {
      return Response.json({ error: "download_required" }, { status: 400 });
    }

    const resourceId = randomUUID();
    storedFiles.push(await storeUploadedFile(resourceId, "download", download));
    const cover = form.get("cover");
    if (isUploadedFile(cover)) storedFiles.push(await storeUploadedFile(resourceId, "cover", cover));
    const preview = form.get("preview");
    if (isUploadedFile(preview)) {
      storedFiles.push(await storeUploadedFile(resourceId, "preview", preview));
    } else if (input.category === "midi") {
      storedFiles.push(await storeGeneratedMidiPreview(resourceId, download));
    }

    const resource = await createResourceRecord({
      input,
      files: storedFiles,
      adminId: admin.id,
      resourceId,
    });
    return Response.json({ resource }, { status: 201 });
  } catch (error) {
    await removeStoredFiles(storedFiles);
    console.error("Unable to create resource", error);
    const clientError = /Invalid resource|not allowed|file size|filename|signature|ZIP archives|origin/i.test(error.message);
    return Response.json(
      { error: clientError ? error.message : "resource_create_unavailable" },
      { status: clientError ? 400 : 503 },
    );
  }
}
