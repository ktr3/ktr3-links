import { readFile } from "node:fs/promises";
import process from "node:process";

import postgres from "postgres";

import { normalizeProfileName, profileSlug } from "../lib/underground/profile-schema.js";
import { spotifyResource } from "../lib/underground/spotify.js";
import {
  compactProfileName,
  parseSurveyPayload,
} from "../lib/underground/survey-import.js";

const inputPath = process.argv[2];
const approve = process.argv.includes("--approve");
const connectionString = process.env.DATABASE_URL;

if (!inputPath) throw new Error("Usage: import-underground-survey.mjs <payload.json|-> --approve");
if (!approve) throw new Error("Survey imports require the explicit --approve flag");
if (!connectionString) throw new Error("DATABASE_URL is required before importing the survey");

async function readInput(path) {
  if (path !== "-") return readFile(path, "utf8");
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function findMatchingProfile(transaction, row) {
  const spotify = row.links
    .filter((link) => link.platform === "spotify")
    .map((link) => spotifyResource(link.url))
    .find(Boolean);

  if (spotify) {
    const [profile] = await transaction`
      select p.id, p.slug, p.display_name
      from profiles p
      join profile_links pl on pl.profile_id = p.id
      where pl.platform = 'spotify' and pl.resource_id = ${spotify.id}
      order by p.created_at
      limit 1
    `;
    if (profile) return profile;
  }

  const instagram = row.links.find((link) => link.platform === "instagram");
  if (instagram) {
    const [profile] = await transaction`
      select p.id, p.slug, p.display_name
      from profiles p
      join profile_links pl on pl.profile_id = p.id
      where pl.platform = 'instagram' and lower(pl.url) = lower(${instagram.url})
      order by p.created_at
      limit 1
    `;
    if (profile) return profile;
  }

  const normalizedName = normalizeProfileName(row.name);
  const compactName = compactProfileName(row.name);
  const [profile] = await transaction`
    select id, slug, display_name
    from profiles
    where status <> 'archived'
      and (
        normalized_name = ${normalizedName}
        or regexp_replace(normalized_name, '[^a-z0-9]', '', 'g') = ${compactName}
      )
    order by created_at
    limit 1
  `;
  return profile || null;
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

const rows = parseSurveyPayload(await readInput(inputPath));
const sql = postgres(connectionString, { max: 1, transform: postgres.camel });
const summary = {
  surveyRows: rows.length,
  createdProfiles: 0,
  updatedProfiles: 0,
  createdSubmissions: 0,
  reusedSubmissions: 0,
  insertedLinks: 0,
};

try {
  await sql.begin(async (transaction) => {
    for (const row of rows) {
      const normalizedName = normalizeProfileName(row.name);
      let profile = await findMatchingProfile(transaction, row);
      const matchedExistingProfile = Boolean(profile);

      let [submission] = await transaction`
        select id
        from submissions
        where lower(contact_email) = lower(${row.contactEmail})
          and consent_at = ${row.submittedAt}
        limit 1
      `;

      if (!submission) {
        [submission] = await transaction`
          insert into submissions (
            display_name,
            primary_role,
            city,
            contact_email,
            message,
            submitted_links,
            consent_at,
            status,
            moderation_notes,
            created_at,
            updated_at
          ) values (
            ${row.name},
            ${row.role},
            ${row.city},
            ${row.contactEmail},
            ${row.consentText},
            ${transaction.json(row.links)},
            ${row.submittedAt},
            'approved',
            'Importación de GZK Underground.xlsx aprobada expresamente por el propietario el 2026-07-14.',
            ${row.submittedAt},
            now()
          )
          returning id
        `;
        summary.createdSubmissions += 1;
      } else {
        await transaction`
          update submissions set
            display_name = ${row.name},
            primary_role = ${row.role},
            city = ${row.city},
            submitted_links = ${transaction.json(row.links)},
            status = 'approved',
            moderation_notes = 'Importación de GZK Underground.xlsx aprobada expresamente por el propietario el 2026-07-14.',
            updated_at = now()
          where id = ${submission.id}
        `;
        summary.reusedSubmissions += 1;
      }

      if (!profile) {
        const slug = await availableSlug(transaction, row.name);
        [profile] = await transaction`
          insert into profiles (
            slug,
            display_name,
            normalized_name,
            primary_role,
            city,
            status,
            source_submission_id,
            consent_at,
            approved_at
          ) values (
            ${slug},
            ${row.name},
            ${normalizedName},
            ${row.role},
            ${row.city},
            'approved',
            ${submission.id},
            ${row.submittedAt},
            now()
          )
          returning id, slug, display_name
        `;
        summary.createdProfiles += 1;
      } else {
        await transaction`
          update profiles set
            display_name = ${row.name},
            normalized_name = ${normalizedName},
            primary_role = ${row.role},
            city = coalesce(${row.city}, city),
            status = 'approved',
            source_submission_id = coalesce(source_submission_id, ${submission.id}),
            consent_at = coalesce(consent_at, ${row.submittedAt}),
            approved_at = coalesce(approved_at, now()),
            updated_at = now()
          where id = ${profile.id}
        `;
        summary.updatedProfiles += 1;
      }

      await transaction`
        insert into profile_roles (profile_id, role)
        values (${profile.id}, ${row.role})
        on conflict do nothing
      `;

      for (const link of row.links) {
        const resource = link.platform === "spotify" ? spotifyResource(link.url) : null;
        const [result] = await transaction`
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
            ${link.platform === "spotify"}
          )
          on conflict (profile_id, platform, url)
          do update set
            resource_type = excluded.resource_type,
            resource_id = excluded.resource_id
          returning (xmax = 0) as inserted
        `;
        if (result.inserted) summary.insertedLinks += 1;
      }

      await transaction`
        update submissions set
          possible_duplicate_profile_id = ${matchedExistingProfile ? profile.id : null},
          reviewed_at = coalesce(reviewed_at, now()),
          updated_at = now()
        where id = ${submission.id}
      `;

      if (summary.createdSubmissions > 0) {
        const [alreadyRecorded] = await transaction`
          select exists(
            select 1 from moderation_events
            where submission_id = ${submission.id} and action = 'survey_import_approved'
          ) as exists
        `;
        if (!alreadyRecorded.exists) {
          await transaction`
            insert into moderation_events (submission_id, profile_id, action, details)
            values (
              ${submission.id},
              ${profile.id},
              'survey_import_approved',
              ${transaction.json({ source: "GZK Underground.xlsx", matchedExistingProfile })}
            )
          `;
        }
      }
    }
  });

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
