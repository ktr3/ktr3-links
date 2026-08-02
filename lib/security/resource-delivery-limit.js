import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { getDatabase } from "../db/client.js";

export const DEFAULT_DELIVERY_LIMITS = Object.freeze({
  emailPerHour: 5,
  ipPerHour: 10,
  ipPerDay: 30,
  globalPerDay: 90,
});

export class DeliveryRateLimitError extends Error {
  constructor(reason, retryAfterSeconds) {
    super("Has solicitado demasiados recursos. Inténtalo de nuevo más tarde.");
    this.name = "DeliveryRateLimitError";
    this.reason = reason;
    this.retryAfterSeconds = retryAfterSeconds;
    this.status = 429;
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function deliveryLimitsFromEnv(environment = process.env) {
  return {
    emailPerHour: positiveInteger(environment.RESOURCE_EMAIL_LIMIT_PER_HOUR, DEFAULT_DELIVERY_LIMITS.emailPerHour),
    ipPerHour: positiveInteger(environment.RESOURCE_IP_LIMIT_PER_HOUR, DEFAULT_DELIVERY_LIMITS.ipPerHour),
    ipPerDay: positiveInteger(environment.RESOURCE_IP_LIMIT_PER_DAY, DEFAULT_DELIVERY_LIMITS.ipPerDay),
    globalPerDay: positiveInteger(environment.RESOURCE_GLOBAL_LIMIT_PER_DAY, DEFAULT_DELIVERY_LIMITS.globalPerDay),
  };
}

export function rateLimitSecret({
  nodeEnv = process.env.NODE_ENV,
  configuredSecret = process.env.RESOURCE_RATE_LIMIT_SECRET,
} = {}) {
  const secret = String(configuredSecret || "");
  if (secret.length >= 32) return secret;
  if (nodeEnv === "production") {
    throw new Error("RESOURCE_RATE_LIMIT_SECRET must contain at least 32 characters");
  }
  return "ktr3-local-resource-rate-limit-secret-only";
}

export function hashRateLimitIdentifier(value, secret = rateLimitSecret()) {
  return createHmac("sha256", secret).update(String(value || "")).digest("hex");
}

export function clientIpFromRequest(request) {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];
  return candidates.find((candidate) => candidate && isIP(candidate)) || null;
}

export function evaluateDeliveryRateLimit(counts = {}, limits = DEFAULT_DELIVERY_LIMITS) {
  if ((Number(counts.globalDay) || 0) >= limits.globalPerDay) {
    return { allowed: false, reason: "global_day", retryAfterSeconds: 86400 };
  }
  if ((Number(counts.emailHour) || 0) >= limits.emailPerHour) {
    return { allowed: false, reason: "email_hour", retryAfterSeconds: 3600 };
  }
  if ((Number(counts.ipDay) || 0) >= limits.ipPerDay) {
    return { allowed: false, reason: "ip_day", retryAfterSeconds: 86400 };
  }
  if ((Number(counts.ipHour) || 0) >= limits.ipPerHour) {
    return { allowed: false, reason: "ip_hour", retryAfterSeconds: 3600 };
  }
  return { allowed: true, reason: null, retryAfterSeconds: 0 };
}

export async function enforceResourceDeliveryRateLimit({ email, ip, resourceId }) {
  const sql = getDatabase();
  const secret = rateLimitSecret();
  const emailHash = hashRateLimitIdentifier(email, secret);
  const ipHash = ip ? hashRateLimitIdentifier(ip, secret) : null;
  const limits = deliveryLimitsFromEnv();

  const decision = await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(20260802)`;
    const [counts] = await transaction`
      select
        count(*) filter (
          where accepted = true
            and email_hash = ${emailHash}
            and attempted_at > now() - interval '1 hour'
        )::integer as email_hour,
        count(*) filter (
          where accepted = true
            and ip_hash = ${ipHash}
            and attempted_at > now() - interval '1 hour'
        )::integer as ip_hour,
        count(*) filter (
          where accepted = true
            and ip_hash = ${ipHash}
            and attempted_at > now() - interval '24 hours'
        )::integer as ip_day,
        count(*) filter (
          where accepted = true
            and attempted_at > now() - interval '24 hours'
        )::integer as global_day
      from resource_delivery_attempts
    `;
    const result = evaluateDeliveryRateLimit(counts, limits);
    await transaction`
      insert into resource_delivery_attempts (
        resource_id, email_hash, ip_hash, accepted, reason
      )
      values (
        ${resourceId}, ${emailHash}, ${ipHash}, ${result.allowed}, ${result.reason}
      )
    `;
    return result;
  });

  if (!decision.allowed) {
    throw new DeliveryRateLimitError(decision.reason, decision.retryAfterSeconds);
  }
  return decision;
}
