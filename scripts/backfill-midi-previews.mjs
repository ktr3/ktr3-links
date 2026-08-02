import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { MIDI_PREVIEW_MAX_INPUT_BYTES } from "../lib/resources/midi-preview.js";
import { getResourceStorage } from "../lib/resources/storage/index.js";
import {
  removeStoredFiles,
  storeGeneratedMidiPreviewBytes,
} from "../lib/resources/store-upload.js";

async function readStoredBytes(file, storage) {
  if (Number(file.sizeBytes) > MIDI_PREVIEW_MAX_INPUT_BYTES) {
    throw new Error(`${file.slug}: MIDI exceeds the automatic preview limit`);
  }
  const stored = await storage.get(file.storageKey);
  const chunks = [];
  let total = 0;
  for await (const chunk of stored.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > MIDI_PREVIEW_MAX_INPUT_BYTES) {
      throw new Error(`${file.slug}: stored MIDI exceeds the automatic preview limit`);
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

const sql = getDatabase();
const storage = getResourceStorage();
let created = 0;
let failed = 0;

try {
  const resources = await sql`
    select
      r.id,
      r.slug,
      download.storage_key,
      download.original_name,
      download.size_bytes
    from resources r
    join resource_files download
      on download.resource_id = r.id and download.kind = 'download'
    left join resource_files preview
      on preview.resource_id = r.id and preview.kind = 'preview'
    where r.category = 'midi'
      and preview.id is null
      and lower(download.original_name) ~ '\\.(mid|midi)$'
    order by r.created_at
  `;

  for (const resource of resources) {
    let generated;
    try {
      const midiBytes = await readStoredBytes(resource, storage);
      generated = await storeGeneratedMidiPreviewBytes(
        resource.id,
        midiBytes,
        resource.originalName,
      );
      await sql`
        insert into resource_files (
          resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
        )
        values (
          ${resource.id}, ${generated.kind}, ${generated.storageKey},
          ${generated.originalName}, ${generated.mimeType}, ${generated.sizeBytes}, ${generated.sha256}
        )
        on conflict (resource_id, kind) do nothing
      `;
      created += 1;
      process.stdout.write(`Generated MIDI preview: ${resource.slug}\n`);
    } catch (error) {
      failed += 1;
      if (generated) await removeStoredFiles([generated]);
      process.stderr.write(`Skipped ${resource.slug}: ${error.message}\n`);
    }
  }

  process.stdout.write(`MIDI preview backfill complete: ${created} created, ${failed} failed\n`);
  if (failed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
