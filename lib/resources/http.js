import { Readable } from "node:stream";

import { normalizeDownloadName } from "./files.js";
import { getResourceStorage } from "./storage/index.js";

function webBody(body) {
  if (body && typeof body.transformToWebStream === "function") return body.transformToWebStream();
  if (body instanceof Readable) return Readable.toWeb(body);
  return body;
}

export async function resourceFileResponse(file, { download = false } = {}) {
  const storage = getResourceStorage();
  const safeName = normalizeDownloadName(file.originalName);
  if (download) {
    const signedUrl = await storage.signedDownloadUrl(file.storageKey, safeName, 600);
    if (signedUrl) return Response.redirect(signedUrl, 302);
  }

  const stored = await storage.get(file.storageKey);
  return new Response(webBody(stored.body), {
    headers: {
      "Content-Type": file.mimeType || stored.contentType,
      ...(stored.contentLength ? { "Content-Length": String(stored.contentLength) } : {}),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": download ? "private, no-store" : "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
