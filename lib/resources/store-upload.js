import { createHash } from "node:crypto";

import { createStorageKey } from "./files.js";
import { createMidiChiptunePreview } from "./midi-preview.js";
import {
  validateFileBytes,
  validateUploadName,
} from "./schema.js";
import { getResourceStorage } from "./storage/index.js";

export function isUploadedFile(value) {
  return Boolean(
    value
    && typeof value === "object"
    && typeof value.name === "string"
    && typeof value.arrayBuffer === "function"
    && Number(value.size) > 0,
  );
}

export async function storeUploadedFile(resourceId, kind, file) {
  if (!isUploadedFile(file)) throw new Error(`A ${kind} file is required`);

  const validation = validateUploadName(file.name, kind, Number(file.size));
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== Number(file.size)) throw new Error(`${kind} upload size changed while reading`);
  validateFileBytes(bytes, file.name, kind);

  const storageKey = createStorageKey(resourceId, kind, file.name);
  const storage = getResourceStorage();
  await storage.put(storageKey, bytes, validation.contentType);

  return {
    kind,
    storageKey,
    originalName: file.name,
    mimeType: validation.contentType,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function storeGeneratedMidiPreviewBytes(resourceId, midiBytesInput, midiName) {
  const midiBytes = Buffer.isBuffer(midiBytesInput)
    ? midiBytesInput
    : Buffer.from(midiBytesInput);
  const downloadValidation = validateUploadName(midiName, "download", midiBytes.length);
  if (![".mid", ".midi"].includes(downloadValidation.extension)) {
    throw new Error("Automatic preview requires a .mid or .midi download");
  }
  validateFileBytes(midiBytes, midiName, "download");
  const preview = createMidiChiptunePreview(midiBytes);
  const originalName = "KTR3-MIDI-Auto-Preview-8bit.wav";
  const validation = validateUploadName(originalName, "preview", preview.bytes.length);
  validateFileBytes(preview.bytes, originalName, "preview");

  const storageKey = createStorageKey(resourceId, "preview", originalName);
  const storage = getResourceStorage();
  await storage.put(storageKey, preview.bytes, validation.contentType);
  return {
    kind: "preview",
    storageKey,
    originalName,
    mimeType: validation.contentType,
    sizeBytes: preview.bytes.length,
    sha256: createHash("sha256").update(preview.bytes).digest("hex"),
  };
}

export async function storeGeneratedMidiPreview(resourceId, midiFile) {
  if (!isUploadedFile(midiFile)) throw new Error("A MIDI download file is required");
  const midiBytes = Buffer.from(await midiFile.arrayBuffer());
  if (midiBytes.length !== Number(midiFile.size)) {
    throw new Error("MIDI upload size changed while generating its preview");
  }
  return storeGeneratedMidiPreviewBytes(resourceId, midiBytes, midiFile.name);
}

export async function removeStoredFiles(files) {
  const storage = getResourceStorage();
  await Promise.allSettled(
    files.filter(Boolean).map((file) => storage.delete(file.storageKey)),
  );
}
