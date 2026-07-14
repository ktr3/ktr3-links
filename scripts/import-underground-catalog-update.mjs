import { readFile } from "node:fs/promises";
import process from "node:process";

import postgres from "postgres";

import { parseCatalogUpdatePayload } from "../lib/underground/catalog-update.js";
import { normalizeProfileName, profileSlug } from "../lib/underground/profile-schema.js";
import { spotifyResource } from "../lib/underground/spotify.js";

const inputPath = process.argv[2];
const approve = process.argv.includes("--approve");
const connectionString = process.env.DATABASE_URL;

if (!inputPath) {
  throw new Error("Usage: import-underground-catalog-update.mjs <payload.json|-> [--approve]");
}
if (!connectionString) {
  throw new Error("DATABASE_URL is required before importing the catalog update");
}

async function readInput(path) {
  if (path !== "-") return readFile(path, "utf8");
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function findProfile(transaction, row) {
  const identityName = row.previousName || row.name;
  const identityNameNormalized = normalizeProfileName(identityName);
  const currentNameNormalized = normalizeProfileName(row.name);
  const matches = await transaction`
    select id, slug, display_name, normalized_name, primary_role, city
    from profiles
    where status <> 'archived'
      and (
        normalized_name = ${identityNameNormalized}
        or normalized_name = ${currentNameNormalized}
      )
    order by created_at
    limit 2
  `;

  if (matches.length !== 1) {
    throw new Error(
      `Catalog row ${row.name} matched ${matches.length} profiles using identity ${identityName}`,
    );
  }
  return matches[0];
}

async function availableSlug(transaction, name, profileId) {
  const base = profileSlug(name);
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [result] = await transaction`
      select exists(
        select 1 from profiles where slug = ${candidate} and id <> ${profileId}
      ) as taken
    `;
    if (!result.taken) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function shouldRemoveExistingLink(existing, incomingLinks) {
  const incomingForPlatform = incomingLinks.filter((link) => link.platform === existing.platform);
  if (incomingForPlatform.length === 0) return false;
  if (incomingForPlatform.some((link) => link.url === existing.url)) return false;

  if (existing.platform !== "spotify") return true;
  const incomingTypes = new Set(
    incomingForPlatform.map((link) => spotifyResource(link.url)?.type).filter(Boolean),
  );
  return incomingTypes.has(existing.resourceType);
}

const rows = parseCatalogUpdatePayload(await readInput(inputPath));
const sql = postgres(connectionString, { max: 1, transform: postgres.camel });
const summary = {
  mode: approve ? "approved" : "check",
  catalogRows: rows.length,
  matchedProfiles: 0,
  renamedProfiles: 0,
  updatedProfiles: 0,
  insertedLinks: 0,
  updatedLinks: 0,
  deletedLinks: 0,
  warnings: rows.flatMap((row) => row.warnings.map((warning) => `${row.name}: ${warning}`)),
};

try {
  await sql.begin(async (transaction) => {
    for (const row of rows) {
      const profile = await findProfile(transaction, row);
      summary.matchedProfiles += 1;

      if (profile.primaryRole !== row.role) {
        throw new Error(
          `Catalog role mismatch for ${row.name}: database=${profile.primaryRole}, sheet=${row.role}`,
        );
      }

      const normalizedName = normalizeProfileName(row.name);
      const nextSlug = await availableSlug(transaction, row.name, profile.id);
      const profileChanged = profile.displayName !== row.name
        || profile.normalizedName !== normalizedName
        || profile.slug !== nextSlug
        || (row.city && profile.city !== row.city);

      if (profile.displayName !== row.name) summary.renamedProfiles += 1;
      if (profileChanged) summary.updatedProfiles += 1;

      const existingLinks = await transaction`
        select id, platform, url, resource_type, resource_id, is_primary, created_at
        from profile_links
        where profile_id = ${profile.id}
        order by created_at, id
      `;
      const linksToDelete = existingLinks.filter((link) => shouldRemoveExistingLink(link, row.links));
      summary.deletedLinks += linksToDelete.length;

      const remainingLinks = existingLinks.filter(
        (link) => !linksToDelete.some((removed) => removed.id === link.id),
      );
      const incomingSpotify = row.links.filter((link) => link.platform === "spotify");
      const hasSpotifyTrack = remainingLinks.some(
        (link) => link.platform === "spotify" && link.resourceType === "track",
      ) || incomingSpotify.some((link) => spotifyResource(link.url)?.type === "track");

      for (const link of row.links) {
        const resource = link.platform === "spotify" ? spotifyResource(link.url) : null;
        const existing = remainingLinks.find(
          (candidate) => candidate.platform === link.platform && candidate.url === link.url,
        );
        const shouldBePrimary = link.platform === "spotify"
          && (resource?.type === "track" || (!hasSpotifyTrack && link === incomingSpotify[0]));

        if (!existing) {
          summary.insertedLinks += 1;
        } else if (
          existing.resourceType !== (resource?.type || null)
          || existing.resourceId !== (resource?.id || null)
          || (shouldBePrimary && !existing.isPrimary)
        ) {
          summary.updatedLinks += 1;
        }
      }

      if (!approve) continue;

      if (profileChanged) {
        await transaction`
          update profiles set
            display_name = ${row.name},
            normalized_name = ${normalizedName},
            slug = ${nextSlug},
            city = coalesce(${row.city}, city),
            updated_at = now()
          where id = ${profile.id}
        `;
      }

      for (const link of linksToDelete) {
        await transaction`delete from profile_links where id = ${link.id}`;
      }

      for (const link of row.links) {
        const resource = link.platform === "spotify" ? spotifyResource(link.url) : null;
        const shouldBePrimary = link.platform === "spotify"
          && (resource?.type === "track" || (!hasSpotifyTrack && link === incomingSpotify[0]));
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
            ${shouldBePrimary}
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
    }
  });

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
