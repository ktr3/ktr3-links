import path from "node:path";
import { randomUUID } from "node:crypto";

import { validateUploadName } from "./schema.js";

export function createStorageKey(resourceId, kind, originalName) {
  const { extension } = validateUploadName(originalName, kind);
  const safeResourceId = String(resourceId || "").replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeResourceId) throw new Error("A valid resource identifier is required");
  return `resources/${safeResourceId}/${kind}/${randomUUID()}${extension}`;
}

export function normalizeDownloadName(value) {
  const basename = path.basename(String(value || "download"));
  const extension = path.extname(basename);
  const stem = basename.slice(0, extension ? -extension.length : undefined)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "download";
  const safeExtension = extension.toLocaleLowerCase("en").replace(/[^a-z0-9.]/g, "");
  return `${stem}${safeExtension}`;
}
