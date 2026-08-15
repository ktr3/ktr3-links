import { NextResponse } from "next/server";

import { assertTrustedMutation } from "../../../../lib/auth/request.js";
import { deleteAdminSession } from "../../../../lib/auth/server.js";
import {
  ADMIN_SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/auth/session.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    assertTrustedMutation(request);
    await deleteAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return Response.json(
      { error: error.message === "Untrusted mutation origin" ? "invalid_origin" : "logout_unavailable" },
      { status: error.message === "Untrusted mutation origin" ? 403 : 503 },
    );
  }
}
