import { RESOURCE_STATUSES } from "./schema.js";

const STATUS_TRANSITIONS = {
  draft: new Set(["draft", "published", "archived"]),
  published: new Set(["published", "draft", "archived"]),
  archived: new Set(["archived"]),
};

export function assertStatusTransition(currentStatus, nextStatus) {
  if (!RESOURCE_STATUSES.includes(currentStatus) || !RESOURCE_STATUSES.includes(nextStatus)) {
    throw new Error("Unknown resource status transition");
  }
  if (!STATUS_TRANSITIONS[currentStatus].has(nextStatus)) {
    throw new Error(`Invalid resource status transition: ${currentStatus} -> ${nextStatus}`);
  }
  return nextStatus;
}

export function publicResourceProjection(resource) {
  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    summary: resource.summary,
    description: resource.description,
    category: resource.category,
    tags: resource.tags || [],
    accessModel: resource.accessModel,
    publishedAt: resource.publishedAt,
    file: {
      name: resource.fileName,
      size: Number(resource.fileSize) || 0,
      mimeType: resource.fileMimeType || "application/octet-stream",
    },
    hasCover: Boolean(resource.hasCover),
    hasPreview: Boolean(resource.hasPreview),
    downloadCount: Number(resource.downloadCount) || 0,
  };
}
