import { captureAnalyticsEvent } from "./client.js";
import {
  CONSENT_STORAGE_KEY,
  parseStoredConsent,
} from "./consent.js";

export const UNDERGROUND_VISITOR_KEY = "ktr3_analytics_visitor";
export const UNDERGROUND_SESSION_KEY = "ktr3_analytics_session";

export function undergroundAnalyticsAllowed() {
  if (typeof window === "undefined") return false;
  if (window.navigator?.doNotTrack === "1" || window.doNotTrack === "1") return false;
  return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY))?.analytics === true;
}

function identity(storage, key) {
  let value = storage.getItem(key);
  if (!value) {
    value = window.crypto.randomUUID();
    storage.setItem(key, value);
  }
  return value;
}

export function clearUndergroundAnalyticsIdentity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(UNDERGROUND_VISITOR_KEY);
  window.sessionStorage.removeItem(UNDERGROUND_SESSION_KEY);
}

export function undergroundResultBucket(resultCount) {
  if (resultCount <= 0) return "0";
  if (resultCount <= 4) return "1-4";
  if (resultCount <= 9) return "5-9";
  if (resultCount <= 24) return "10-24";
  return "25+";
}

export function trackUndergroundEvent(eventType, details = {}) {
  if (!undergroundAnalyticsAllowed()) return false;
  if (details.profileId === undefined && !["role_filter_selected", "search_used"].includes(eventType)) {
    return false;
  }

  const payload = {
    visitorId: identity(window.localStorage, UNDERGROUND_VISITOR_KEY),
    sessionId: identity(window.sessionStorage, UNDERGROUND_SESSION_KEY),
    profileId: details.profileId || null,
    eventType,
    destinationPlatform: details.destinationPlatform || null,
    context: details.context,
  };

  captureAnalyticsEvent(`underground_${eventType}`, {
    profile_id: payload.profileId,
    destination_platform: payload.destinationPlatform,
    source: payload.context.source,
    role: payload.context.role,
    result_bucket: payload.context.resultBucket,
  });

  fetch("/api/underground/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
  return true;
}
