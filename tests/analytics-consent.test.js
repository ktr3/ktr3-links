import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONSENT_VERSION,
  createConsentChoice,
  parseStoredConsent,
} from "../lib/analytics/consent.js";
import {
  describeLink,
  redactAnalyticsEvent,
  shouldTrackPath,
} from "../lib/analytics/privacy.js";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const consentUiPath = new URL("../app/analytics/AnalyticsConsent.js", import.meta.url);
const resourcesPath = new URL("../app/recursos/ResourceLibrary.js", import.meta.url);

test("consent choices are explicit, versioned and necessary storage stays enabled", () => {
  const choice = createConsentChoice({ analytics: true, marketing: false }, "2026-08-02T00:00:00.000Z");

  assert.deepEqual(choice, {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: true,
    marketing: false,
    updatedAt: "2026-08-02T00:00:00.000Z",
    expiresAt: "2027-08-02T00:00:00.000Z",
  });
  const duringValidity = new Date("2026-09-01T00:00:00.000Z").getTime();
  assert.deepEqual(parseStoredConsent(JSON.stringify(choice), duringValidity), choice);
  assert.equal(parseStoredConsent("not-json", duringValidity), null);
  assert.equal(parseStoredConsent(JSON.stringify({ ...choice, version: 0 }), duringValidity), null);
  assert.equal(parseStoredConsent(JSON.stringify({ ...choice, expiresAt: "2020-01-01T00:00:00.000Z" }), duringValidity), null);
});

test("analytics never records private administration or API paths", () => {
  assert.equal(shouldTrackPath("/"), true);
  assert.equal(shouldTrackPath("/recursos"), true);
  assert.equal(shouldTrackPath("/admin"), false);
  assert.equal(shouldTrackPath("/admin/login"), false);
  assert.equal(shouldTrackPath("/api/resources"), false);
});

test("analytics strips URL parameters and drops sensitive property names", () => {
  const event = redactAnalyticsEvent({
    event: "resource_gate_submitted",
    properties: {
      $current_url: "https://ktr3.es/recursos?email=person@example.com#private",
      $pathname: "/recursos",
      $referrer: "https://instagram.com/path?campaign=secret",
      resource_slug: "rage-lead",
      email: "person@example.com",
      token: "secret",
    },
  });

  assert.equal(event.properties.$current_url, "https://ktr3.es/recursos");
  assert.equal(event.properties.$referrer, "https://instagram.com/path");
  assert.equal(event.properties.resource_slug, "rage-lead");
  assert.equal("email" in event.properties, false);
  assert.equal("token" in event.properties, false);
  assert.equal(redactAnalyticsEvent({ event: "$pageview", properties: { $pathname: "/admin" } }), null);
  assert.equal(redactAnalyticsEvent({ event: "$snapshot", properties: { $current_url: "https://ktr3.es/admin" } }), null);
});

test("link metrics retain useful destinations without storing full external URLs", () => {
  assert.deepEqual(describeLink("/recursos?private=yes"), {
    link_type: "internal",
    destination_path: "/recursos",
  });
  assert.deepEqual(describeLink("https://www.instagram.com/ktr3ss/?secret=1"), {
    link_type: "outbound",
    destination_host: "instagram.com",
  });
  assert.deepEqual(describeLink("mailto:prod.ktr3@gmail.com"), {
    link_type: "contact_email",
    destination_host: "email",
  });
});

test("the global consent UI offers equally direct accept and reject actions", async () => {
  const [layout, consentUi] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(consentUiPath, "utf8"),
  ]);

  assert.match(layout, /<AnalyticsConsent/);
  assert.match(consentUi, />Aceptar analítica</);
  assert.match(consentUi, />Rechazar</);
  assert.match(consentUi, /Configurar/);
  assert.match(consentUi, /aria-modal="true"/);
  assert.match(consentUi, /startAnalytics/);
});

test("analytics can be safely revoked while loading and enabled again", async () => {
  const source = await readFile(new URL("../lib/analytics/client.js", import.meta.url), "utf8");
  assert.match(source, /analyticsWanted = false/);
  assert.match(source, /if \(analyticsWanted\) instance\.startSessionRecording\(\)/);
  assert.match(source, /opt_in_capturing\(\{ captureEventName: false \}\)/);
});

test("resource forms are excluded while useful funnel events remain explicit", async () => {
  const source = await readFile(resourcesPath, "utf8");

  assert.match(source, /ph-no-capture/);
  assert.match(source, /resource_preview_started/);
  assert.match(source, /resource_download_requested/);
  assert.match(source, /resource_gate_completed/);
  assert.match(source, /resource_filter_selected/);
});
