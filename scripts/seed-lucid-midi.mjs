import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { createStorageKey } from "../lib/resources/files.js";
import { validateFileBytes, validateUploadName } from "../lib/resources/schema.js";
import { getResourceStorage } from "../lib/resources/storage/index.js";
import { storeGeneratedMidiPreviewBytes } from "../lib/resources/store-upload.js";

const SLUG = "ktr3-lucid-midi-130-bpm";
const DOWNLOAD_NAME = "KTR3-LUCID-130BPM.mid";
const sourcePath = String(process.env.LUCID_MIDI_PATH || "").trim();

if (!sourcePath) {
  throw new Error("Set LUCID_MIDI_PATH to the private source MIDI path");
}

const sql = getDatabase();
const storage = getResourceStorage();
const storedKeys = [];

try {
  const [existing] = await sql`select id from resources where slug = ${SLUG} limit 1`;
  if (existing) {
    process.stdout.write("LUCID MIDI resource already exists\n");
    process.exitCode = 0;
  } else {
    const [admin] = await sql`
      select id from admin_users
      where is_active = true
      order by created_at
      limit 1
    `;
    if (!admin) throw new Error("Create an admin with npm run admin:create before seeding resources");

    const midi = await readFile(sourcePath);
    const validation = validateUploadName(DOWNLOAD_NAME, "download", midi.length);
    validateFileBytes(midi, DOWNLOAD_NAME, "download");

    const resourceId = randomUUID();
    const download = {
      kind: "download",
      storageKey: createStorageKey(resourceId, "download", DOWNLOAD_NAME),
      originalName: DOWNLOAD_NAME,
      mimeType: validation.contentType,
      sizeBytes: midi.length,
      sha256: createHash("sha256").update(midi).digest("hex"),
    };
    await storage.put(download.storageKey, midi, download.mimeType);
    storedKeys.push(download.storageKey);

    const preview = await storeGeneratedMidiPreviewBytes(resourceId, midi, DOWNLOAD_NAME);
    storedKeys.push(preview.storageKey);
    const files = [download, preview];

    await sql.begin(async (transaction) => {
      await transaction`
        insert into resources (
          id, slug, title, summary, description, category, tags, status,
          access_model, published_at, created_by
        )
        values (
          ${resourceId}, ${SLUG}, 'KTR3 LUCID MIDI 130 BPM',
          'MIDI original de LUCID a 130 BPM para productores de la comunidad KTR3.',
          'Melodía MIDI original utilizada en LUCID. Incluye una preview automática ligera en 8 bits para escuchar la idea antes de solicitar el enlace privado de descarga.',
          'midi', ${["midi", "lucid", "130 bpm", "ktr3", "original"]},
          'published', 'email', now(), ${admin.id}
        )
      `;

      for (const file of files) {
        await transaction`
          insert into resource_files (
            resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
          )
          values (
            ${resourceId}, ${file.kind}, ${file.storageKey}, ${file.originalName},
            ${file.mimeType}, ${file.sizeBytes}, ${file.sha256}
          )
        `;
      }

      await transaction`
        insert into resource_audit_events (resource_id, actor_id, action, details)
        values (${resourceId}, ${admin.id}, 'created', ${transaction.json({ slug: SLUG, source: "release-seed" })})
      `;
    });

    process.stdout.write(`Published LUCID MIDI resource: /recursos#${SLUG}\n`);
  }
} catch (error) {
  await Promise.all(storedKeys.map((key) => storage.delete(key).catch(() => {})));
  throw error;
} finally {
  await closeDatabase();
}
