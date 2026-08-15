import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  hashAnalyticsVisitor,
  parseUndergroundAnalyticsEvent,
  undergroundAnalyticsLimit,
} from "../lib/underground/analytics.js";
import { normalizeAnalyticsRange } from "../lib/underground/analytics-repository.js";

const profileId = "11111111-1111-4111-8111-111111111111";
const visitorId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";

function validEvent(overrides = {}) {
  return {
    visitorId,
    sessionId,
    profileId,
    eventType: "profile_open",
    context: { source: "directory", role: "artist" },
    ...overrides,
  };
}

test("Underground analytics accepts only the documented privacy-safe event contract", () => {
  assert.deepEqual(parseUndergroundAnalyticsEvent(validEvent()), {
    ...validEvent(),
    destinationPlatform: null,
  });
  assert.deepEqual(parseUndergroundAnalyticsEvent(validEvent({
    profileId: null,
    eventType: "search_used",
    context: { source: "directory", role: "all", resultBucket: "10-24" },
  })), {
    visitorId,
    sessionId,
    profileId: null,
    eventType: "search_used",
    destinationPlatform: null,
    context: { source: "directory", role: "all", resultBucket: "10-24" },
  });
});

test("Underground analytics rejects raw searches, URLs, identity fields and invalid relationships", () => {
  for (const context of [
    { source: "directory", query: "secret artist" },
    { source: "directory", url: "https://example.com/private" },
    { source: "directory", email: "person@example.com" },
    { source: "directory", name: "Person" },
  ]) {
    assert.throws(() => parseUndergroundAnalyticsEvent(validEvent({ context })), /Invalid Underground analytics event/);
  }
  assert.throws(() => parseUndergroundAnalyticsEvent(validEvent({ visitorId: "not-a-uuid" })), /Invalid/);
  assert.throws(() => parseUndergroundAnalyticsEvent(validEvent({
    eventType: "external_link_click",
    destinationPlatform: null,
    context: { source: "profile", role: "artist" },
  })), /Invalid/);
  assert.throws(() => parseUndergroundAnalyticsEvent(validEvent({
    profileId: null,
    eventType: "profile_open",
  })), /Invalid/);
});

test("visitor identifiers are irreversibly keyed before persistence", () => {
  const secret = "a-production-secret-that-is-longer-than-32-characters";
  const digest = hashAnalyticsVisitor(visitorId, secret);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest.includes(visitorId), false);
  assert.equal(hashAnalyticsVisitor(visitorId, secret), digest);
  assert.notEqual(hashAnalyticsVisitor(visitorId, `${secret}-different`), digest);
  assert.throws(() => hashAnalyticsVisitor(visitorId, "short"), /32 characters/);
});

test("rate limits fail closed at the session, visitor and global boundaries", () => {
  assert.equal(undergroundAnalyticsLimit({ sessionMinute: 59, visitorHour: 239, globalDay: 99_999 }), null);
  assert.equal(undergroundAnalyticsLimit({ sessionMinute: 60, visitorHour: 0, globalDay: 0 }), "session_rate_limited");
  assert.equal(undergroundAnalyticsLimit({ sessionMinute: 0, visitorHour: 240, globalDay: 0 }), "visitor_rate_limited");
  assert.equal(undergroundAnalyticsLimit({ sessionMinute: 0, visitorHour: 0, globalDay: 100_000 }), "global_rate_limited");
});

test("admin analytics range is restricted to supported windows", () => {
  assert.equal(normalizeAnalyticsRange("7"), 7);
  assert.equal(normalizeAnalyticsRange("90"), 90);
  assert.equal(normalizeAnalyticsRange("999"), 30);
  assert.equal(normalizeAnalyticsRange(undefined), 30);
});

test("analytics routes enforce trusted mutations, admin auth and aggregate-only output", async () => {
  const [ingestion, adminApi, adminPage, compose] = await Promise.all([
    readFile(new URL("../app/api/underground/events/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/analytics/underground/route.js", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/analytics/page.js", import.meta.url), "utf8"),
    readFile(new URL("../docker-compose.prod.yml", import.meta.url), "utf8"),
  ]);
  assert.match(ingestion, /assertTrustedMutation/);
  assert.match(ingestion, /recordUndergroundEvent/);
  assert.match(ingestion, /request\.body\.getReader\(\)/);
  assert.match(ingestion, /receivedBytes > maximumBytes/);
  assert.match(adminApi, /getRequestAdmin/);
  assert.match(adminApi, /undergroundAnalyticsSummary/);
  assert.doesNotMatch(adminApi, /visitor_hash|session_id/);
  assert.match(adminPage, /getCurrentAdmin/);
  assert.match(adminPage, /redirect\("\/admin\/login"\)/);
  assert.match(compose, /ANALYTICS_HASH_SECRET: \$\{ANALYTICS_HASH_SECRET:\?ANALYTICS_HASH_SECRET is required\}/);
});

test("analytics ingestion rejects oversized streamed bodies before database access", async () => {
  const previousOrigin = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "http://localhost:3000";
  try {
    const { POST } = await import("../app/api/underground/events/route.js");
    const response = await POST(new Request("http://localhost:3000/api/underground/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ padding: "x".repeat(5000) }),
    }));
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "payload_too_large" });
  } finally {
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousOrigin;
  }
});

test("Underground emits explicit events without sending names, queries or destination URLs", async () => {
  const source = await readFile(new URL("../app/underground/page.js", import.meta.url), "utf8");
  for (const event of [
    "random_impression",
    "profile_open",
    "search_result_click",
    "external_link_click",
    "role_filter_selected",
    "search_used",
  ]) assert.match(source, new RegExp(`trackUndergroundEvent\\(\"${event}\"`));
  assert.doesNotMatch(source, /trackUndergroundEvent\([^;]*(?:query|\.name|\.url)/s);
});

test("revoking analytics clears the first-party identifiers", async () => {
  const [consentSource, clientSource] = await Promise.all([
    readFile(new URL("../app/analytics/AnalyticsConsent.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/analytics/underground-client.js", import.meta.url), "utf8"),
  ]);
  assert.match(consentSource, /clearUndergroundAnalyticsIdentity/);
  assert.match(clientSource, /doNotTrack === "1"/);
});
