import { createHash, randomUUID } from "node:crypto";

import { closeDatabase, getDatabase } from "../lib/db/client.js";
import { createStorageKey } from "../lib/resources/files.js";
import { getResourceStorage } from "../lib/resources/storage/index.js";

const MIDI_DEMO = Buffer.from([
  0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x60,
  0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c,
  0x00, 0x90, 0x3c, 0x64,
  0x60, 0x80, 0x3c, 0x40,
  0x00, 0xff, 0x2f, 0x00,
]);

const sql = getDatabase();
const storage = getResourceStorage();
let storedKey;

try {
  const [existing] = await sql`select id from resources where slug = 'ktr3-demo-midi' limit 1`;
  if (existing) {
    process.stdout.write("Demo resource already exists\n");
    process.exitCode = 0;
  } else {
    const [admin] = await sql`
      select id from admin_users
      where is_active = true
      order by created_at
      limit 1
    `;
    if (!admin) throw new Error("Create an admin with npm run admin:create before seeding resources");

    const resourceId = randomUUID();
    storedKey = createStorageKey(resourceId, "download", "ktr3-demo.mid");
    await storage.put(storedKey, MIDI_DEMO, "audio/midi");

    await sql.begin(async (transaction) => {
      await transaction`
        insert into resources (
          id, slug, title, summary, description, category, tags, status,
          access_model, published_at, created_by
        )
        values (
          ${resourceId}, 'ktr3-demo-midi', 'Ktr3 Demo MIDI',
          'Un MIDI de prueba para validar la biblioteca local.',
          'Archivo de demostración generado localmente. Sustitúyelo por tu primer drop real desde el panel.',
          'midi', ${["demo", "midi", "ktr3"]}, 'published', 'email', now(), ${admin.id}
        )
      `;
      await transaction`
        insert into resource_files (
          resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
        )
        values (
          ${resourceId}, 'download', ${storedKey}, 'ktr3-demo.mid', 'audio/midi',
          ${MIDI_DEMO.length}, ${createHash("sha256").update(MIDI_DEMO).digest("hex")}
        )
      `;
    });
    process.stdout.write("Published local demo resource: /recursos#ktr3-demo-midi\n");
  }
} catch (error) {
  if (storedKey) await storage.delete(storedKey).catch(() => {});
  throw error;
} finally {
  await closeDatabase();
}
