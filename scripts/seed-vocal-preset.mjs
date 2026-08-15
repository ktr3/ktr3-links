import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { createStorageKey } from "../lib/resources/files.js";
import { validateFileBytes, validateUploadName } from "../lib/resources/schema.js";
import { getResourceStorage } from "../lib/resources/storage/index.js";

const SLUG = "ktr3-vocal-preset-free-plugins";
const DOWNLOAD_NAME = "Vocal Preset Free plugins @ktr3ss.fst";
const EXPECTED_SHA256 = "d9c2760c8afcb5fa7c296fbaf74d92d026c07c153e409836b68e3788a7409cb7";
const sourcePath = String(process.env.VOCAL_PRESET_PATH || "").trim();

if (!sourcePath) {
  throw new Error("Set VOCAL_PRESET_PATH to the private owned FL Studio preset path");
}

const sql = getDatabase();
const storage = getResourceStorage();
const storedKeys = [];

try {
  const [existing] = await sql`select id from resources where slug = ${SLUG} limit 1`;
  if (existing) {
    process.stdout.write("Vocal preset resource already exists\n");
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
      throw new Error("Vocal preset hash does not match the approved release file");
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
          ${resourceId}, ${SLUG}, 'KTR3 Vocal Preset · Free Plugins',
          'Cadena vocal para FL Studio con efectos nativos, Xfer OTT y Slate Digital Fresh Air.',
          'Preset vocal .fst creado por @ktr3ss en FL Studio 25.2.5. La cadena confirmada incluye Fruity Limiter y Fruity Blood Overdrive, además de Xfer OTT y Slate Digital Fresh Air. OTT y Fresh Air son gratuitos, pero deben instalarse por separado para cargar la cadena completa. Ajusta niveles, tono y dinámica a tu propia voz antes de exportar.',
          'template', ${["fl studio", "vocal preset", "mixing", "ott", "fresh air", "free plugins", "ktr3"]},
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

    process.stdout.write(`Published vocal preset resource: /recursos#${SLUG}\n`);
  }
} catch (error) {
  await Promise.all(storedKeys.map((key) => storage.delete(key).catch(() => {})));
  throw error;
} finally {
  await closeDatabase();
}
