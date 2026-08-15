import { getDatabase } from "../db/client.js";
import {
  hashAnalyticsVisitor,
  parseUndergroundAnalyticsEvent,
  undergroundAnalyticsLimit,
} from "./analytics.js";

const SUPPORTED_RANGES = new Set([7, 30, 90]);
const RETENTION_MONTHS = 14;
let lastRetentionCleanup = 0;

export function normalizeAnalyticsRange(value) {
  const days = Number(value);
  return SUPPORTED_RANGES.has(days) ? days : 30;
}

async function cleanupExpiredEvents(sql, now = Date.now()) {
  if (now - lastRetentionCleanup < 24 * 60 * 60 * 1000) return;
  await sql`delete from web_events where occurred_at < now() - (${RETENTION_MONTHS} * interval '1 month')`;
  lastRetentionCleanup = now;
}

export async function recordUndergroundEvent(rawEvent) {
  const event = parseUndergroundAnalyticsEvent(rawEvent);
  const visitorHash = hashAnalyticsVisitor(event.visitorId);
  const sql = getDatabase();

  const result = await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('underground_analytics_limits'))`;
    if (event.profileId) {
      const [profile] = await transaction`
        select id from profiles where id = ${event.profileId} and status = 'approved' limit 1
      `;
      if (!profile) return { accepted: false, reason: "profile_not_found" };
    }

    const [counts] = await transaction`
      select
        count(*) filter (
          where session_id = ${event.sessionId} and occurred_at >= now() - interval '1 minute'
        )::integer as session_minute,
        count(*) filter (
          where visitor_hash = ${visitorHash} and occurred_at >= now() - interval '1 hour'
        )::integer as visitor_hour,
        count(*) filter (
          where occurred_at >= date_trunc('day', now())
        )::integer as global_day
      from web_events
      where occurred_at >= now() - interval '1 day'
    `;
    const reason = undergroundAnalyticsLimit(counts);
    if (reason) return { accepted: false, reason };

    await transaction`
      insert into web_events (
        session_id, visitor_hash, profile_id, event_type, destination_platform, context
      ) values (
        ${event.sessionId}, ${visitorHash}, ${event.profileId}, ${event.eventType},
        ${event.destinationPlatform}, ${transaction.json(event.context)}
      )
    `;
    return { accepted: true };
  });

  try {
    await cleanupExpiredEvents(sql);
  } catch (error) {
    console.error("Unable to clean expired Underground analytics", error);
  }
  return result;
}

export async function undergroundAnalyticsSummary(rangeValue) {
  const days = normalizeAnalyticsRange(rangeValue);
  const sql = getDatabase();
  const [summaryRows, profiles, platforms, roles, daily] = await Promise.all([
    sql`
      select
        count(*)::integer as total_events,
        count(distinct visitor_hash)::integer as unique_visitors,
        count(*) filter (where event_type = 'random_impression')::integer as random_impressions,
        count(*) filter (where event_type = 'profile_open')::integer as profile_opens,
        count(*) filter (where event_type = 'search_result_click')::integer as search_selections,
        count(*) filter (where event_type = 'external_link_click')::integer as external_clicks,
        count(*) filter (where event_type = 'search_used')::integer as searches,
        count(*) filter (where event_type = 'role_filter_selected')::integer as role_filters
      from web_events
      where occurred_at >= now() - (${days} * interval '1 day')
    `,
    sql`
      select
        p.id,
        p.display_name,
        p.primary_role,
        count(*) filter (where e.event_type = 'random_impression')::integer as random_impressions,
        count(*) filter (where e.event_type = 'profile_open')::integer as profile_opens,
        count(*) filter (where e.event_type = 'search_result_click')::integer as search_selections,
        count(*) filter (where e.event_type = 'external_link_click')::integer as external_clicks,
        count(distinct e.visitor_hash)::integer as unique_visitors
      from web_events e
      join profiles p on p.id = e.profile_id
      where e.occurred_at >= now() - (${days} * interval '1 day')
      group by p.id
      order by count(*) filter (where e.event_type = 'profile_open') desc,
        count(*) filter (where e.event_type = 'external_link_click') desc,
        lower(p.display_name)
      limit 50
    `,
    sql`
      select destination_platform as platform, count(*)::integer as clicks
      from web_events
      where occurred_at >= now() - (${days} * interval '1 day')
        and event_type = 'external_link_click'
        and destination_platform is not null
      group by destination_platform
      order by count(*) desc, destination_platform
    `,
    sql`
      select context->>'role' as role, count(*)::integer as selections
      from web_events
      where occurred_at >= now() - (${days} * interval '1 day')
        and event_type = 'role_filter_selected'
      group by context->>'role'
      order by count(*) desc
    `,
    sql`
      select
        occurred_at::date as day,
        count(*) filter (where event_type = 'profile_open')::integer as profile_opens,
        count(*) filter (where event_type = 'external_link_click')::integer as external_clicks,
        count(distinct visitor_hash)::integer as unique_visitors
      from web_events
      where occurred_at >= now() - (${days} * interval '1 day')
      group by occurred_at::date
      order by occurred_at::date
    `,
  ]);
  const summary = summaryRows[0];
  return {
    days,
    summary: {
      ...summary,
      outboundRate: summary.profileOpens
        ? Math.round((summary.externalClicks / summary.profileOpens) * 1000) / 10
        : 0,
    },
    profiles: profiles.map((profile) => ({
      ...profile,
      outboundRate: profile.profileOpens
        ? Math.round((profile.externalClicks / profile.profileOpens) * 1000) / 10
        : 0,
    })),
    platforms,
    roles,
    daily,
  };
}
