import {
  createHash,
  randomBytes,
} from "node:crypto";

export function createPublicGrant() {
  return randomBytes(32).toString("base64url");
}

export function digestPublicGrant(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function isGrantExpired(expiresAt, now = new Date()) {
  const expiry = new Date(expiresAt);
  return !Number.isFinite(expiry.getTime()) || expiry.getTime() <= now.getTime();
}

export function safeSubscriberEmail(value) {
  const email = String(value || "").trim().toLocaleLowerCase("en");
  if (
    email.length < 3
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("A valid email address is required");
  }
  return email;
}
