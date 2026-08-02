import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPublicGrant,
  digestPublicGrant,
  isGrantExpired,
  safeSubscriberEmail,
} from "../lib/resources/grants.js";
import {
  assertStatusTransition,
  publicResourceProjection,
} from "../lib/resources/repository-rules.js";
import {
  subscribeResendContact,
  unsubscribeResendContact,
} from "../lib/email/contacts.js";
import { verifyTurnstile } from "../lib/security/turnstile.js";
import {
  assertPermanentSubscriberEmail,
  emailDomainCandidates,
  isDisposableEmail,
} from "../lib/security/disposable-email.js";
import {
  DEFAULT_DELIVERY_LIMITS,
  evaluateDeliveryRateLimit,
  hashRateLimitIdentifier,
  rateLimitSecret,
} from "../lib/security/resource-delivery-limit.js";

const resourceRequestRoutePath = new URL(
  "../app/api/resources/[slug]/request/route.js",
  import.meta.url,
);

test("public grants are opaque, unique, and stored only as digests", () => {
  const first = createPublicGrant();
  const second = createPublicGrant();

  assert.notEqual(first, second);
  assert.equal(digestPublicGrant(first).length, 64);
  assert.equal(digestPublicGrant(first).includes(first), false);
});

test("grant expiry rejects elapsed dates", () => {
  const now = new Date("2026-07-29T12:00:00Z");
  assert.equal(isGrantExpired("2026-07-29T11:59:59Z", now), true);
  assert.equal(isGrantExpired("2026-07-29T12:15:00Z", now), false);
  assert.equal(isGrantExpired("invalid", now), true);
});

test("subscriber emails are normalized without accepting malformed values", () => {
  assert.equal(safeSubscriberEmail("  Producer@Example.COM "), "producer@example.com");
  assert.throws(() => safeSubscriberEmail("not-an-email"), /email/i);
});

test("temporary email domains are rejected without restricting legitimate providers", () => {
  assert.equal(assertPermanentSubscriberEmail(" Producer@GMAIL.com "), "producer@gmail.com");
  assert.equal(isDisposableEmail("producer@gmail.com"), false);
  assert.equal(isDisposableEmail("beat@mailinator.com"), true);
  assert.throws(
    () => assertPermanentSubscriberEmail("beat@sub.mailinator.com"),
    /email permanente/i,
  );
  assert.deepEqual(
    emailDomainCandidates("beat@sub.mailinator.com"),
    ["sub.mailinator.com", "mailinator.com"],
  );
});

test("delivery quotas reject the first request beyond each configured boundary", () => {
  assert.equal(evaluateDeliveryRateLimit({ emailHour: 4 }).allowed, true);
  assert.deepEqual(
    evaluateDeliveryRateLimit({ emailHour: 5 }),
    { allowed: false, reason: "email_hour", retryAfterSeconds: 3600 },
  );
  assert.equal(evaluateDeliveryRateLimit({ ipHour: 10 }).reason, "ip_hour");
  assert.equal(evaluateDeliveryRateLimit({ ipDay: 30 }).reason, "ip_day");
  assert.equal(evaluateDeliveryRateLimit({ globalDay: 90 }).reason, "global_day");
  assert.deepEqual(DEFAULT_DELIVERY_LIMITS, {
    emailPerHour: 5,
    ipPerHour: 10,
    ipPerDay: 30,
    globalPerDay: 90,
  });
});

test("delivery quota identifiers are deterministic HMAC digests and production requires a secret", () => {
  const first = hashRateLimitIdentifier("Producer@Example.com", "a-test-secret-with-32-bytes-minimum");
  const second = hashRateLimitIdentifier("Producer@Example.com", "a-test-secret-with-32-bytes-minimum");
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first.includes("Producer@Example.com"), false);
  assert.throws(
    () => rateLimitSecret({ nodeEnv: "production", configuredSecret: "" }),
    /RESOURCE_RATE_LIMIT_SECRET/,
  );
});

test("resource request route validates permanent email and quotas before creating a delivery", async () => {
  const source = await readFile(resourceRequestRoutePath, "utf8");
  assert.match(source, /assertPermanentSubscriberEmail/);
  assert.match(source, /clientIpFromRequest/);
  assert.match(source, /enforceResourceDeliveryRateLimit/);
  assert.match(source, /status:\s*429/);

  const limiterIndex = source.indexOf("await enforceResourceDeliveryRateLimit({");
  const deliveryIndex = source.indexOf("createDelivery({");
  assert.ok(limiterIndex >= 0 && limiterIndex < deliveryIndex);
});

test("resource status transitions protect archived content", () => {
  assert.equal(assertStatusTransition("draft", "published"), "published");
  assert.equal(assertStatusTransition("published", "draft"), "draft");
  assert.equal(assertStatusTransition("published", "archived"), "archived");
  assert.throws(() => assertStatusTransition("archived", "published"), /transition/i);
});

test("public projection never exposes storage keys or internal email fields", () => {
  const result = publicResourceProjection({
    id: "resource-id",
    slug: "demo",
    title: "Demo",
    summary: "Resumen",
    description: "Descripción",
    category: "midi",
    tags: ["trap"],
    accessModel: "email",
    publishedAt: "2026-07-29T12:00:00Z",
    downloadStorageKey: "private/key.mid",
    subscriberEmail: "private@example.com",
    fileName: "demo.mid",
    fileSize: 42,
    fileMimeType: "audio/midi",
    hasCover: true,
    hasPreview: false,
    downloadCount: 3,
  });

  assert.equal(result.downloadStorageKey, undefined);
  assert.equal(result.subscriberEmail, undefined);
  assert.equal(result.file.name, "demo.mid");
  assert.equal(result.downloadCount, 3);
});

test("external marketing providers stay disabled in local development", async () => {
  const previousDriver = process.env.EMAIL_DRIVER;
  const previousKey = process.env.RESEND_CONTACTS_API_KEY;
  process.env.EMAIL_DRIVER = "development";
  delete process.env.RESEND_CONTACTS_API_KEY;
  try {
    assert.deepEqual(
      await subscribeResendContact({ email: "test@example.com", name: "Test" }),
      { provider: "development", skipped: true },
    );
    assert.deepEqual(
      await unsubscribeResendContact("test@example.com"),
      { provider: "development", skipped: true },
    );
  } finally {
    if (previousDriver === undefined) delete process.env.EMAIL_DRIVER;
    else process.env.EMAIL_DRIVER = previousDriver;
    if (previousKey === undefined) delete process.env.RESEND_CONTACTS_API_KEY;
    else process.env.RESEND_CONTACTS_API_KEY = previousKey;
  }
});

test("newsletter contact sync requires its own full-access Resend key", async () => {
  const previousDriver = process.env.EMAIL_DRIVER;
  const previousSendingKey = process.env.RESEND_API_KEY;
  const previousContactsKey = process.env.RESEND_CONTACTS_API_KEY;
  process.env.EMAIL_DRIVER = "resend";
  process.env.RESEND_API_KEY = "sending-only-key";
  delete process.env.RESEND_CONTACTS_API_KEY;
  try {
    await assert.rejects(
      subscribeResendContact({ email: "test@example.com", name: "Test" }),
      /RESEND_CONTACTS_API_KEY/,
    );
  } finally {
    if (previousDriver === undefined) delete process.env.EMAIL_DRIVER;
    else process.env.EMAIL_DRIVER = previousDriver;
    if (previousSendingKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousSendingKey;
    if (previousContactsKey === undefined) delete process.env.RESEND_CONTACTS_API_KEY;
    else process.env.RESEND_CONTACTS_API_KEY = previousContactsKey;
  }
});

test("Turnstile is optional locally and fail-closed when production enforcement lacks a token", async () => {
  const previousEnforce = process.env.TURNSTILE_ENFORCE;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.TURNSTILE_ENFORCE = "false";
    process.env.NODE_ENV = "test";
    assert.equal(await verifyTurnstile({}), true);
    process.env.TURNSTILE_ENFORCE = "true";
    assert.equal(await verifyTurnstile({}), false);
  } finally {
    if (previousEnforce === undefined) delete process.env.TURNSTILE_ENFORCE;
    else process.env.TURNSTILE_ENFORCE = previousEnforce;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
