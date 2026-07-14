import { getDatabase } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const profiles = await sql`
      select
        p.id,
        p.slug,
        p.display_name,
        p.primary_role,
        p.city,
        p.bio,
        coalesce(
          jsonb_agg(distinct pr.role) filter (where pr.role is not null),
          '[]'::jsonb
        ) as roles,
        coalesce(
          jsonb_agg(
            distinct jsonb_build_object(
              'platform', pl.platform,
              'url', pl.url,
              'resourceType', pl.resource_type,
              'resourceId', pl.resource_id,
              'isPrimary', pl.is_primary
            )
          ) filter (where pl.id is not null),
          '[]'::jsonb
        ) as links
      from profiles p
      left join profile_roles pr on pr.profile_id = p.id
      left join profile_links pl on pl.profile_id = p.id
      where p.status = 'approved'
      group by p.id
      order by lower(p.display_name), p.id
    `;

    return Response.json(
      { profiles },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Unable to read Underground profiles", error);
    return Response.json(
      { error: "catalog_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
