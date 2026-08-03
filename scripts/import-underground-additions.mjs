import { readFile } from "node:fs/promises";
import process from "node:process";

import postgres from "postgres";

import { parseCatalogAdditionsPayload } from "../lib/underground/catalog-additions.js";
import { normalizeProfileName, profileSlug } from "../lib/underground/profile-schema.js";
import { spotifyResource } from "../lib/underground/spotify.js";

const inputPath = process.argv[2];
const approve = process.argv.includes("--approve");
const connectionString = process.env.DATABASE_URL;

if (!inputPath) {
  throw new Error("Usage: import-underground-additions.mjs <payload.json|-> [--approve]");
}
if (!connectionString) {
  throw new Error("DATABASE_URL is required before importing catalog additions");
}

async function readInput(path) {
  if (path !== "-") return readFile(path, "utf8");
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function findProfile(transaction, row) {
  const identity = normalizeProfileName(row.previousName || row.name);
  const matches = await transaction`
    select id, display_name, primary_role, city, bio, consent_at
    from profiles
    where status <> 'archived' and normalized_name = ${identity}
    order by created_at
    limit 2
  `;
  if (matches.length > 1) {
    throw new Error(`Catalog addition ${row.name} matched multiple active profiles`);
  }
  return matches[0] || null;
}

async function availableSlug(transaction, name) {
  const base = profileSlug(name);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [result] = await transaction`
      select exists(select 1 from profiles where slug = ${candidate}) as taken
    `;
    if (!result.taken) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function profileNeedsUpdate(profile, row) {
  if (!profile) return false;
  return profile.primaryRole !== row.role
    || (row.city && profile.city !== row.city)
    || (row.bio && profile.bio !== row.bio)
    || !profile.consentAt
    || new Date(profile.consentAt) < row.submittedAt;
}

const { source, rows } = parseCatalogAdditionsPayload(await readInput(inputPath));
const sql = postgres(connectionString, { max: 1, transform: postgres.camel });
const summary = {
  mode: approve ? "approved" : "check",
  source,
  catalogRows: rows.length,
  newProfiles: 0,
  existingProfiles: 0,
  profileUpdates: 0,
  primaryRoleChanges: 0,
  insertedRoles: 0,
  insertedLinks: 0,
  moderationEvents: 0,
  warnings: rows.flatMap((row) => row.warnings.map((warning) => `${row.name}: ${warning}`)),
};

try {
  await sql.begin(async (transaction) => {
    for (const row of rows) {
      let profile = await findProfile(transaction, row);
      const matchedExisting = Boolean(profile);
      const previousPrimaryRole = profile?.primaryRole || null;

      if (matchedExisting) summary.existingProfiles += 1;
      else summary.newProfiles += 1;
      if (profileNeedsUpdate(profile, row)) summary.profileUpdates += 1;
      if (profile && profile.primaryRole !== row.role) summary.primaryRoleChanges += 1;

      const existingRoles = profile
        ? await transaction`
          select role from profile_roles where profile_id = ${profile.id}
        `
        : [];
      const roleSet = new Set(existingRoles.map((entry) => entry.role));
      if (previousPrimaryRole) roleSet.add(previousPrimaryRole);
      if (!roleSet.has(row.role)) summary.insertedRoles += 1;

      const existingLinks = profile
        ? await transaction`
          select platform, url from profile_links where profile_id = ${profile.id}
        `
        : [];
      const existingLinkKeys = new Set(
        existingLinks.map((link) => `${link.platform}\u0000${link.url}`),
      );
      summary.insertedLinks += row.links.filter(
        (link) => !existingLinkKeys.has(`${link.platform}\u0000${link.url}`),
      ).length;

      if (!approve) continue;

      if (!profile) {
        const slug = await availableSlug(transaction, row.name);
        [profile] = await transaction`
          insert into profiles (
            slug,
            display_name,
            normalized_name,
            primary_role,
            city,
            bio,
            status,
            consent_at,
            approved_at
          ) values (
            ${slug},
            ${row.name},
            ${normalizeProfileName(row.name)},
            ${row.role},
            ${row.city},
            ${row.bio},
            'approved',
            ${row.submittedAt},
            now()
          )
          returning id, display_name, primary_role, city, bio, consent_at
        `;
      } else {
        await transaction`
          update profiles set
            primary_role = ${row.role},
            city = coalesce(${row.city}, city),
            bio = coalesce(${row.bio}, bio),
            status = 'approved',
            consent_at = greatest(coalesce(consent_at, ${row.submittedAt}), ${row.submittedAt}),
            approved_at = coalesce(approved_at, now()),
            updated_at = now()
          where id = ${profile.id}
        `;
      }

      if (previousPrimaryRole) {
        await transaction`
          insert into profile_roles (profile_id, role)
          values (${profile.id}, ${previousPrimaryRole})
          on conflict do nothing
        `;
      }
      await transaction`
        insert into profile_roles (profile_id, role)
        values (${profile.id}, ${row.role})
        on conflict do nothing
      `;

      for (const link of row.links) {
        const resource = link.platform === "spotify" ? spotifyResource(link.url) : null;
        await transaction`
          insert into profile_links (
            profile_id,
            platform,
            url,
            resource_type,
            resource_id,
            is_primary
          ) values (
            ${profile.id},
            ${link.platform},
            ${link.url},
            ${resource?.type || null},
            ${resource?.id || null},
            ${resource?.type === "track"}
          )
          on conflict (profile_id, platform, url)
          do update set
            resource_type = excluded.resource_type,
            resource_id = excluded.resource_id,
            is_primary = profile_links.is_primary or excluded.is_primary
        `;
      }

      const spotifyLinks = await transaction`
        select id, resource_type, is_primary
        from profile_links
        where profile_id = ${profile.id} and platform = 'spotify'
        order by (resource_type = 'track') desc, is_primary desc, created_at, id
      `;
      const preferredSpotifyId = spotifyLinks[0]?.id || null;
      if (preferredSpotifyId) {
        await transaction`
          update profile_links
          set is_primary = (id = ${preferredSpotifyId})
          where profile_id = ${profile.id}
            and platform = 'spotify'
            and is_primary is distinct from (id = ${preferredSpotifyId})
        `;
      }

      const [recorded] = await transaction`
        select exists(
          select 1 from moderation_events
          where profile_id = ${profile.id}
            and action = 'catalog_addition_approved'
            and details ->> 'source' = ${source}
            and details ->> 'sourceRow' = ${String(row.sourceRow)}
        ) as exists
      `;
      if (!recorded.exists) {
        await transaction`
          insert into moderation_events (profile_id, action, details)
          values (
            ${profile.id},
            'catalog_addition_approved',
            ${transaction.json({
              source,
              sourceRow: row.sourceRow,
              matchedExisting,
              previousPrimaryRole,
            })}
          )
        `;
        summary.moderationEvents += 1;
      }
    }
  });

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
