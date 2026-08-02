import path from "node:path";

import { z } from "zod";

export const RESOURCE_CATEGORIES = ["serum", "midi", "fx", "template", "samples", "oneshot", "other"];
export const ACCESS_MODELS = ["open", "email"];
export const RESOURCE_STATUSES = ["draft", "published", "archived"];
export const FILE_KINDS = ["download", "cover", "preview"];

const ALLOWED_EXTENSIONS = {
  download: new Set([".fxp", ".serumpreset", ".mid", ".midi", ".zip", ".flp", ".wav"]),
  cover: new Set([".png", ".jpg", ".jpeg", ".webp"]),
  preview: new Set([".mp3", ".wav", ".ogg", ".m4a"]),
};

const DEFAULT_MAX_BYTES = {
  download: 250 * 1024 * 1024,
  cover: 8 * 1024 * 1024,
  preview: 30 * 1024 * 1024,
};

const MIME_BY_EXTENSION = {
  ".fxp": "application/octet-stream",
  ".serumpreset": "application/octet-stream",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".zip": "application/zip",
  ".flp": "application/octet-stream",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function trimmedString(minimum, maximum) {
  return z.string().trim().min(minimum).max(maximum);
}

const baseResourceInputSchema = z.object({
  title: trimmedString(3, 100),
  summary: trimmedString(10, 180),
  description: trimmedString(10, 5000),
  category: z.enum(RESOURCE_CATEGORIES),
  accessModel: z.enum(ACCESS_MODELS),
  tags: z.union([z.string(), z.array(z.string())]).optional().default([]),
});

export function parseTags(value) {
  const rawTags = Array.isArray(value) ? value : String(value || "").split(",");
  const tags = [];
  const seen = new Set();

  for (const rawTag of rawTags) {
    const tag = String(rawTag).trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
    if (!tag || seen.has(tag)) continue;
    if (tag.length > 32) throw new Error("Resource tags must be 32 characters or fewer");
    seen.add(tag);
    tags.push(tag);
  }

  if (tags.length > 12) throw new Error("Resource tags cannot contain more than 12 values");
  return tags;
}

export function parseResourceInput(input) {
  const result = baseResourceInputSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid resource input: ${result.error.issues.map((issue) => issue.message).join(", ")}`);
  }
  if (result.data.category === "midi" && result.data.accessModel !== "email") {
    throw new Error("MIDI resources must use email delivery");
  }

  return {
    ...result.data,
    tags: parseTags(result.data.tags),
  };
}

export function validateUploadName(filename, kind, size) {
  if (!FILE_KINDS.includes(kind)) throw new Error("Unknown resource file kind");
  if (typeof filename !== "string" || filename !== path.basename(filename) || /[\\/]/.test(filename)) {
    throw new Error("Invalid resource filename");
  }

  const extension = path.extname(filename).toLocaleLowerCase("en");
  if (!ALLOWED_EXTENSIONS[kind].has(extension)) {
    throw new Error(`${extension || "File type"} is not allowed for ${kind}`);
  }

  const configuredLimit = kind === "download"
    ? Number(process.env.RESOURCE_MAX_UPLOAD_BYTES)
    : undefined;
  const maxBytes = Number.isFinite(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_MAX_BYTES[kind];

  if (size !== undefined && (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes)) {
    throw new Error(`${kind} file size is outside the allowed range`);
  }

  return {
    extension,
    contentType: MIME_BY_EXTENSION[extension] || "application/octet-stream",
    maxBytes,
  };
}

function startsWith(bytes, signature, offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function validateFileBytes(bytesInput, filename, kind) {
  const bytes = Buffer.isBuffer(bytesInput) ? bytesInput : Buffer.from(bytesInput);
  const { extension } = validateUploadName(filename, kind, bytes.length);
  const signatures = {
    ".mid": () => startsWith(bytes, [0x4d, 0x54, 0x68, 0x64]),
    ".midi": () => startsWith(bytes, [0x4d, 0x54, 0x68, 0x64]),
    ".zip": () => startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
      || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]),
    ".wav": () => startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8),
    ".flp": () => startsWith(bytes, [0x46, 0x4c, 0x68, 0x64]),
    ".fxp": () => startsWith(bytes, [0x43, 0x63, 0x6e, 0x4b]),
    ".png": () => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ".jpg": () => startsWith(bytes, [0xff, 0xd8, 0xff]),
    ".jpeg": () => startsWith(bytes, [0xff, 0xd8, 0xff]),
    ".webp": () => startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8),
    ".mp3": () => startsWith(bytes, [0x49, 0x44, 0x33])
      || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
    ".ogg": () => startsWith(bytes, [0x4f, 0x67, 0x67, 0x53]),
    ".m4a": () => startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4),
  };

  if (signatures[extension] && !signatures[extension]()) {
    throw new Error(`${extension} file signature does not match its extension`);
  }

  if (extension === ".zip") {
    const tail = bytes.subarray(Math.max(0, bytes.length - 4 * 1024 * 1024)).toString("latin1");
    if (/(^|[\\/])[^\\/\0]+\.(exe|dll|vst3|bat|cmd|ps1|dylib|so)(\0|$)/i.test(tail)) {
      throw new Error("ZIP archives cannot contain executable or plugin files");
    }
  }

  return { extension };
}
