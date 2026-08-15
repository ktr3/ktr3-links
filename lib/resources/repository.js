import { randomUUID } from "node:crypto";

import { getDatabase } from "../db/client.js";
import { publicResourceProjection } from "./repository-rules.js";
import { assertStatusTransition } from "./repository-rules.js";
import { slugifyResource } from "./slug.js";

const RESOURCE_SELECT = `
  select
    r.id,
    r.slug,
    r.title,
    r.summary,
    r.description,
    r.category,
    r.tags,
    r.status,
    r.access_model,
    r.published_at,
    r.created_at,
    r.updated_at,
    download.id as download_file_id,
    download.original_name as file_name,
    download.storage_key as download_storage_key,
    download.mime_type as file_mime_type,
    download.size_bytes as file_size,
    cover.id is not null as has_cover,
    preview.id is not null as has_preview,
    coalesce(stats.download_count, 0)::integer as download_count
  from resources r
  left join resource_files download
    on download.resource_id = r.id and download.kind = 'download'
  left join resource_files cover
    on cover.resource_id = r.id and cover.kind = 'cover'
  left join resource_files preview
    on preview.resource_id = r.id and preview.kind = 'preview'
  left join lateral (
    select count(*)::integer as download_count
    from resource_downloads d
    where d.resource_id = r.id
  ) stats on true
`;

export async function createUniqueResourceSlug(title, excludeId) {
  const sql = getDatabase();
  const base = slugifyResource(title) || "recurso";
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const [row] = await sql`
      select exists(
        select 1 from resources
        where slug = ${slug}
          and (${excludeId || null}::uuid is null or id <> ${excludeId || null}::uuid)
      ) as taken
    `;
    if (!row.taken) return slug;
  }
  throw new Error("Unable to create a unique resource slug");
}

export async function listPublicResources() {
  const sql = getDatabase();
  const rows = await sql.unsafe(`
    ${RESOURCE_SELECT}
    where r.status = 'published' and download.id is not null
    order by r.published_at desc nulls last, r.created_at desc
  `);
  return rows.map(publicResourceProjection);
}

export async function getPublicResourceBySlug(slug) {
  const sql = getDatabase();
  const rows = await sql.unsafe(`
    ${RESOURCE_SELECT}
    where r.slug = $1 and r.status = 'published' and download.id is not null
    limit 1
  `, [slug]);
  return rows[0] || null;
}

export async function getResourceFile(resourceId, kind) {
  const sql = getDatabase();
  const [file] = await sql`
    select id, resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
    from resource_files
    where resource_id = ${resourceId} and kind = ${kind}
    limit 1
  `;
  return file || null;
}

export async function listAdminResources() {
  const sql = getDatabase();
  return sql.unsafe(`
    ${RESOURCE_SELECT}
    order by r.updated_at desc, r.created_at desc
  `);
}

export async function getAdminResourceById(id) {
  const sql = getDatabase();
  const rows = await sql.unsafe(`
    ${RESOURCE_SELECT}
    where r.id = $1
    limit 1
  `, [id]);
  if (!rows[0]) return null;

  const files = await sql`
    select id, kind, storage_key, original_name, mime_type, size_bytes, sha256, created_at
    from resource_files
    where resource_id = ${id}
    order by kind
  `;
  return { ...rows[0], files };
}

export async function createResourceRecord({
  input,
  files,
  adminId,
  resourceId = randomUUID(),
}) {
  const sql = getDatabase();
  const slug = await createUniqueResourceSlug(input.title);

  await sql.begin(async (transaction) => {
    await transaction`
      insert into resources (
        id, slug, title, summary, description, category, tags, access_model, created_by
      )
      values (
        ${resourceId}, ${slug}, ${input.title}, ${input.summary}, ${input.description},
        ${input.category}, ${input.tags}, ${input.accessModel}, ${adminId}
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
      values (${resourceId}, ${adminId}, 'created', ${transaction.json({ slug })})
    `;
  });

  return getAdminResourceById(resourceId);
}

export async function updateResourceRecord({
  id,
  input,
  files,
  adminId,
}) {
  const sql = getDatabase();
  const existing = await getAdminResourceById(id);
  if (!existing) return null;
  const slug = input.title === existing.title
    ? existing.slug
    : await createUniqueResourceSlug(input.title, id);

  await sql.begin(async (transaction) => {
    await transaction`
      update resources
      set slug = ${slug},
          title = ${input.title},
          summary = ${input.summary},
          description = ${input.description},
          category = ${input.category},
          tags = ${input.tags},
          access_model = ${input.accessModel},
          updated_at = now()
      where id = ${id}
    `;

    for (const file of files) {
      await transaction`
        insert into resource_files (
          resource_id, kind, storage_key, original_name, mime_type, size_bytes, sha256
        )
        values (
          ${id}, ${file.kind}, ${file.storageKey}, ${file.originalName},
          ${file.mimeType}, ${file.sizeBytes}, ${file.sha256}
        )
        on conflict (resource_id, kind) do update
        set storage_key = excluded.storage_key,
            original_name = excluded.original_name,
            mime_type = excluded.mime_type,
            size_bytes = excluded.size_bytes,
            sha256 = excluded.sha256,
            created_at = now()
      `;
    }

    await transaction`
      insert into resource_audit_events (resource_id, actor_id, action, details)
      values (${id}, ${adminId}, 'updated', ${transaction.json({ slug, replacedKinds: files.map((file) => file.kind) })})
    `;
  });
  return getAdminResourceById(id);
}

export async function setResourceStatus({ id, status, adminId }) {
  const sql = getDatabase();
  const [existing] = await sql`select status from resources where id = ${id} limit 1`;
  if (!existing) return null;
  assertStatusTransition(existing.status, status);

  const [resource] = await sql.begin(async (transaction) => {
    const [updated] = await transaction`
      update resources
      set status = ${status},
          published_at = case
            when ${status}::resource_status = 'published' then coalesce(published_at, now())
            else published_at
          end,
          updated_at = now()
      where id = ${id}
      returning id, status, published_at
    `;
    await transaction`
      insert into resource_audit_events (resource_id, actor_id, action, details)
      values (${id}, ${adminId}, ${`status:${status}`}, ${transaction.json({ previousStatus: existing.status })})
    `;
    return [updated];
  });
  return resource;
}

export async function dashboardSummary() {
  const sql = getDatabase();
  const [summary] = await sql`
    select
      (select count(*)::integer from resources where status = 'published') as published_resources,
      (select count(*)::integer from resource_downloads) as total_downloads,
      (select count(*)::integer from resource_delivery_grants) as gated_deliveries,
      (select count(*)::integer from subscribers where status = 'confirmed') as confirmed_subscribers
  `;
  return summary;
}

export async function listSubscribers(limit = 100) {
  const sql = getDatabase();
  return sql`
    select id, email, name, status, marketing_consent, consent_at, confirmed_at, unsubscribed_at, created_at
    from subscribers
    order by created_at desc
    limit ${Math.min(Math.max(Number(limit) || 100, 1), 500)}
  `;
}
