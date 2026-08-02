import {
  createHash,
  randomBytes,
} from "node:crypto";

export const ADMIN_SESSION_COOKIE = "ktr3_admin_session";
export const ADMIN_SESSION_DAYS = 7;

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function digestToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function sessionCookieOptions({
  production = process.env.NODE_ENV === "production",
  expires,
} = {}) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    ...(expires ? { expires } : {}),
  };
}

export function sessionExpiry(now = new Date()) {
  return new Date(now.getTime() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000);
}
