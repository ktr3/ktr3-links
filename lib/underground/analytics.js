import { createHmac } from "node:crypto";

import { z } from "zod";

export const UNDERGROUND_EVENT_TYPES = [
  "random_impression",
  "profile_open",
  "search_result_click",
  "external_link_click",
  "role_filter_selected",
  "search_used",
];

export const UNDERGROUND_ROLES = ["all", "artist", "producer", "dj", "collective", "visual"];
export const UNDERGROUND_PLATFORMS = [
  "instagram",
  "youtube",
  "spotify",
  "soundcloud",
  "bandcamp",
  "tiktok",
  "apple_music",
  "beatstars",
  "website",
];

const eventSchema = z.strictObject({
  visitorId: z.uuid(),
  sessionId: z.uuid(),
  profileId: z.uuid().nullable().optional(),
  eventType: z.enum(UNDERGROUND_EVENT_TYPES),
  destinationPlatform: z.enum(UNDERGROUND_PLATFORMS).nullable().optional(),
  context: z.strictObject({
    source: z.enum(["directory", "search", "radio", "profile"]),
    role: z.enum(UNDERGROUND_ROLES).optional(),
    resultBucket: z.enum(["0", "1-4", "5-9", "10-24", "25+"]).optional(),
  }),
});

function hasOnlyContextKeys(context, allowed) {
  return Object.keys(context).every((key) => allowed.includes(key));
}

function validEventRelationship(event) {
  const hasProfile = Boolean(event.profileId);
  const hasDestination = Boolean(event.destinationPlatform);
  const { source, resultBucket } = event.context;

  switch (event.eventType) {
    case "random_impression":
      return hasProfile && !hasDestination && source === "radio"
        && hasOnlyContextKeys(event.context, ["source", "role"]);
    case "profile_open":
      return hasProfile && !hasDestination && ["directory", "search"].includes(source)
        && hasOnlyContextKeys(event.context, ["source", "role"]);
    case "search_result_click":
      return hasProfile && !hasDestination && source === "search"
        && hasOnlyContextKeys(event.context, ["source", "role"]);
    case "external_link_click":
      return hasProfile && hasDestination && ["radio", "profile"].includes(source)
        && hasOnlyContextKeys(event.context, ["source", "role"]);
    case "role_filter_selected":
      return !hasProfile && !hasDestination && source === "directory" && Boolean(event.context.role)
        && hasOnlyContextKeys(event.context, ["source", "role"]);
    case "search_used":
      return !hasProfile && !hasDestination && source === "directory" && Boolean(event.context.role)
        && Boolean(resultBucket) && hasOnlyContextKeys(event.context, ["source", "role", "resultBucket"]);
    default:
      return false;
  }
}

export function parseUndergroundAnalyticsEvent(value) {
  const result = eventSchema.safeParse(value);
  if (!result.success || !validEventRelationship(result.data)) {
    throw new Error("Invalid Underground analytics event");
  }
  return {
    ...result.data,
    profileId: result.data.profileId || null,
    destinationPlatform: result.data.destinationPlatform || null,
  };
}

export function hashAnalyticsVisitor(visitorId, configuredSecret = process.env.ANALYTICS_HASH_SECRET) {
  if (typeof configuredSecret !== "string" || configuredSecret.length < 32) {
    throw new Error("ANALYTICS_HASH_SECRET must contain at least 32 characters");
  }
  return createHmac("sha256", configuredSecret).update(visitorId).digest("hex");
}

export function undergroundAnalyticsLimit({ sessionMinute, visitorHour, globalDay }) {
  if (sessionMinute >= 60) return "session_rate_limited";
  if (visitorHour >= 240) return "visitor_rate_limited";
  if (globalDay >= 100_000) return "global_rate_limited";
  return null;
}
