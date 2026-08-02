import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getDatabase } from "../../../../lib/db/client.js";
import { verifyPassword } from "../../../../lib/auth/password.js";
import { assertTrustedMutation } from "../../../../lib/auth/request.js";
import { createAdminSession } from "../../../../lib/auth/server.js";
import {
  ADMIN_SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/auth/session.js";

export const dynamic = "force-dynamic";

function identifierHash(request, email) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.ADMIN_RATE_LIMIT_SECRET
    || process.env.ANALYTICS_HASH_SECRET
    || (process.env.NODE_ENV === "production" ? "" : "ktr3-local-rate-limit");
  if (!secret) throw new Error("ADMIN_RATE_LIMIT_SECRET is required in production");
  return createHash("sha256").update(`${secret}:${forwarded}:${email}`).digest("hex");
}

export async function POST(request) {
  try {
    assertTrustedMutation(request);
    const payload = await request.json();
    const email = String(payload.email || "").trim().toLocaleLowerCase("en");
    const password = String(payload.password || "");
    const identity = identifierHash(request, email);
    const sql = getDatabase();

    const [rate] = await sql`
      select count(*)::integer as attempts
      from admin_login_attempts
      where identifier_hash = ${identity}
        and attempted_at > now() - interval '15 minutes'
        and succeeded = false
    `;
    if (rate.attempts >= 10) {
      return Response.json(
        { error: "too_many_attempts" },
        { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } },
      );
    }

    const [admin] = await sql`
      select id, email, password_hash, display_name
      from admin_users
      where lower(email) = ${email} and is_active = true
      limit 1
    `;
    const authenticated = Boolean(admin) && await verifyPassword(password, admin.passwordHash);
    await sql`
      insert into admin_login_attempts (identifier_hash, succeeded)
      values (${identity}, ${authenticated})
    `;

    if (!authenticated) {
      return Response.json(
        { error: "invalid_credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const session = await createAdminSession(admin.id);
    const response = NextResponse.json({
      admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
    });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      session.token,
      sessionCookieOptions({ expires: session.expiresAt }),
    );
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return Response.json(
      { error: error.message === "Untrusted mutation origin" ? "invalid_origin" : "login_unavailable" },
      { status: error.message === "Untrusted mutation origin" ? 403 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
