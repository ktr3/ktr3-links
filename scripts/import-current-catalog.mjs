import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import {
  instagramUrl,
  legacyProfileSchema,
  normalizeProfileName,
  profileSlug,
} from "../lib/underground/profile-schema.js";
import { spotifyResource } from "../lib/underground/spotify.js";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(rootDirectory, "app", "underground", "page.js");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required before importing the current catalog.");
}

const source = await readFile(sourcePath, "utf8");
const peopleLiteral = source.match(/const PEOPLE = (\[[\s\S]*?\n\]);/)?.[1];

if (!peopleLiteral) {
  throw new Error("The current PEOPLE catalog could not be found in app/underground/page.js");
}

const people = legacyProfileSchema.array().parse(
  vm.runInNewContext(peopleLiteral, Object.create(null), { timeout: 1000 }),
);
const sql = postgres(connectionString, { max: 1, transform: postgres.camel });

try {
  await sql.begin(async (transaction) => {
    for (const person of people) {
      const normalizedName = normalizeProfileName(person.name);
      const [profile] = await transaction`
        insert into profiles (
          slug,
          display_name,
          normalized_name,
          primary_role,
          status,
          approved_at
        ) values (
          ${profileSlug(person.name)},
          ${person.name},
          ${normalizedName},
          ${person.roles[0]},
          'approved',
          now()
        )
        on conflict (normalized_name) where status <> 'archived'
        do update set
          display_name = excluded.display_name,
          primary_role = excluded.primary_role,
          status = 'approved',
          updated_at = now()
        returning id
      `;

      for (const role of person.roles) {
        await transaction`
          insert into profile_roles (profile_id, role)
          values (${profile.id}, ${role})
          on conflict do nothing
        `;
      }

      const links = [];
      const instagram = instagramUrl(person.instagram);
      if (instagram) {
        links.push({ platform: "instagram", url: instagram, resource: null, primary: false });
      }
      if (person.spotify) {
        links.push({
          platform: "spotify",
          url: person.spotify,
          resource: spotifyResource(person.spotify),
          primary: !person.spotifyTrack,
        });
      }
      if (person.spotifyTrack) {
        links.push({
          platform: "spotify",
          url: person.spotifyTrack,
          resource: spotifyResource(person.spotifyTrack),
          primary: true,
        });
      }

      for (const link of links) {
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
            ${link.resource?.type || null},
            ${link.resource?.id || null},
            ${link.primary}
          )
          on conflict (profile_id, platform, url)
          do update set
            resource_type = excluded.resource_type,
            resource_id = excluded.resource_id,
            is_primary = excluded.is_primary
        `;
      }
    }
  });

  process.stdout.write(`Imported ${people.length} current Underground profiles.\n`);
} finally {
  await sql.end({ timeout: 5 });
}
