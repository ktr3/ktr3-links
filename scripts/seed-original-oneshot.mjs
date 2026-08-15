import { createHash, randomUUID } from "node:crypto";

import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { createKtr3NeonImpact } from "../lib/resources/audio.js";
import { createStorageKey } from "../lib/resources/files.js";
import { validateFileBytes } from "../lib/resources/schema.js";
import { getResourceStorage } from "../lib/resources/storage/index.js";

const SLUG = "ktr3-neon-impact-oneshot";
const DOWNLOAD_NAME = "KTR3-Neon-Impact-OneShot.wav";
const PREVIEW_NAME = "KTR3-Neon-Impact-Preview.wav";

const sql = getDatabase();
const storage = getResourceStorage();
const storedKeys = [];

try {
  const [existing] = await sql`select id from resources where slug = ${SLUG} limit 1`;
  if (existing) {
    process.stdout.write("Original one-shot resource already exists\n");
    process.exitCode = 0;
  } else {
    const [admin] = await sql`
      select id from admin_users
      where is_active = true
      order by created_at
      limit 1
    `;
    if (!admin) throw new Error("Create an admin with npm run admin:create before seeding resources");

    const audio = createKtr3NeonImpact();
    validateFileBytes(audio.download, DOWNLOAD_NAME, "download");
    validateFileBytes(audio.preview, PREVIEW_NAME, "preview");

    const resourceId = randomUUID();
    const files = [
      {
        kind: "download",
        name: DOWNLOAD_NAME,
        bytes: audio.download,
      },
      {
        kind: "preview",
        name: PREVIEW_NAME,
        bytes: audio.preview,
      },
    ].map((file) => ({
      ...file,
      key: createStorageKey(resourceId, file.kind, file.name),
      mimeType: "audio/wav",
    }));

    for (const file of files) {
      await storage.put(file.key, file.bytes, file.mimeType);
      storedKeys.push(file.key);
    }

    await sql.begin(async (transaction) => {
      await transaction`
        insert into resources (
          id, slug, title, summary, description, category, tags, status,
          access_model, published_at, created_by
        )
        values (
          ${resourceId}, ${SLUG}, 'KTR3 Neon Impact One-Shot',
          'Impacto grave original con pegada digital para transiciones, drops y drums.',
          'One-shot original diseñado para la biblioteca KTR3. Incluye el WAV aislado a 44.1 kHz y una preview en contexto con varios golpes. Úsalo como impacto, capa de kick o punto de partida para procesarlo a tu manera.',
          'oneshot', ${["one-shot", "impact", "bass", "trap", "original"]},
          'published', 'email', now(), ${admin.id}
        )
      `;

      for (const file of files) {
        await transaction`
          insert into resource_files (
            resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
          )
          values (
            ${resourceId}, ${file.kind}, ${file.key}, ${file.name}, ${file.mimeType},
            ${file.bytes.length}, ${createHash("sha256").update(file.bytes).digest("hex")}
          )
        `;
      }
    });

    process.stdout.write(`Published original one-shot resource: /recursos#${SLUG}\n`);
  }
} catch (error) {
  await Promise.all(storedKeys.map((key) => storage.delete(key).catch(() => {})));
  throw error;
} finally {
  await closeDatabase();
}
