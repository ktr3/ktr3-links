import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { createStorageKey } from "../lib/resources/files.js";
import { validateFileBytes, validateUploadName } from "../lib/resources/schema.js";
import { getResourceStorage } from "../lib/resources/storage/index.js";

const SLUG = "ktr3-thx-bass-1-serum-2";
const DOWNLOAD_NAME = "Bass 1 @ktr3ss.SerumPreset";
const EXPECTED_SHA256 = "788083bb31aaac013f5ca24b033778f007af9b6169eb88a8c104cf66395503da";
const sourcePath = String(process.env.THX_BASS_PRESET_PATH || "").trim();

if (!sourcePath) {
  throw new Error("Set THX_BASS_PRESET_PATH to the private owned Serum preset path");
}

const sql = getDatabase();
const storage = getResourceStorage();
const storedKeys = [];

try {
  const [existing] = await sql`select id from resources where slug = ${SLUG} limit 1`;
  if (existing) {
    process.stdout.write("THX Bass Serum preset resource already exists\n");
    process.exitCode = 0;
  } else {
    const [admin] = await sql`
      select id from admin_users
      where is_active = true
      order by created_at
      limit 1
    `;
    if (!admin) throw new Error("Create an admin with npm run admin:create before seeding resources");

    const preset = await readFile(sourcePath);
    const validation = validateUploadName(DOWNLOAD_NAME, "download", preset.length);
    validateFileBytes(preset, DOWNLOAD_NAME, "download");
    const sha256 = createHash("sha256").update(preset).digest("hex");
    if (sha256 !== EXPECTED_SHA256) {
      throw new Error("THX Bass preset hash does not match the technically approved release file");
    }

    const resourceId = randomUUID();
    const download = {
      kind: "download",
      storageKey: createStorageKey(resourceId, "download", DOWNLOAD_NAME),
      originalName: DOWNLOAD_NAME,
      mimeType: validation.contentType,
      sizeBytes: preset.length,
      sha256,
    };
    await storage.put(download.storageKey, preset, download.mimeType);
    storedKeys.push(download.storageKey);

    await sql.begin(async (transaction) => {
      await transaction`
        insert into resources (
          id, slug, title, summary, description, category, tags, status,
          access_model, published_at, created_by
        )
        values (
          ${resourceId}, ${SLUG}, 'KTR3 THX Bass 1 · Serum 2',
          'Preset de bajo THX propio para Serum 2, listo para producciones rage y trap.',
          'Bass 1 de KTR3: un bajo THX directo y agresivo diseñado para Serum 2. Incluye las formas de onda necesarias dentro del preset y se entrega en formato .SerumPreset. Creación original de KTR3; no es un producto oficial ni está afiliado con ningún artista.',
          'serum', ${["serum 2", "thx bass", "bass", "rage", "trap", "ktr3", "original"]},
          'published', 'email', now(), ${admin.id}
        )
      `;

      await transaction`
        insert into resource_files (
          resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
        )
        values (
          ${resourceId}, ${download.kind}, ${download.storageKey}, ${download.originalName},
          ${download.mimeType}, ${download.sizeBytes}, ${download.sha256}
        )
      `;

      await transaction`
        insert into resource_audit_events (resource_id, actor_id, action, details)
        values (
          ${resourceId}, ${admin.id}, 'created',
          ${transaction.json({ slug: SLUG, source: "owned-release-seed", sha256: EXPECTED_SHA256 })}
        )
      `;
    });

    process.stdout.write(`Published THX Bass Serum preset resource: /recursos#${SLUG}\n`);
  }
} catch (error) {
  await Promise.all(storedKeys.map((key) => storage.delete(key).catch(() => {})));
  throw error;
} finally {
  await closeDatabase();
}
