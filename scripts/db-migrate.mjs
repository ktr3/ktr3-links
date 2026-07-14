import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = path.join(rootDirectory, "database", "migrations");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Copy .env.example or export it before migrating.");
}

const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

try {
  await sql`select pg_advisory_lock(20260714)`;
  await sql`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    const [alreadyApplied] = await sql`
      select exists(
        select 1 from schema_migrations where filename = ${filename}
      ) as applied
    `;

    if (alreadyApplied.applied) continue;

    const migration = await readFile(path.join(migrationsDirectory, filename), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`insert into schema_migrations (filename) values (${filename})`;
    });
    process.stdout.write(`Applied ${filename}\n`);
  }
} finally {
  await sql`select pg_advisory_unlock(20260714)`.catch(() => {});
  await sql.end({ timeout: 5 });
}
