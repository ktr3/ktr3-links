import { cookies } from "next/headers";

import { getDatabase } from "../db/client.js";
import {
  ADMIN_SESSION_COOKIE,
  createOpaqueToken,
  digestToken,
  sessionExpiry,
} from "./session.js";

export async function createAdminSession(adminUserId) {
  const sql = getDatabase();
  const token = createOpaqueToken();
  const tokenHash = digestToken(token);
  const expiresAt = sessionExpiry();

  await sql`
    insert into admin_sessions (admin_user_id, token_hash, expires_at)
    values (${adminUserId}, ${tokenHash}, ${expiresAt})
  `;

  return { token, expiresAt };
}

export async function deleteAdminSession(token) {
  if (!token) return;
  const sql = getDatabase();
  await sql`delete from admin_sessions where token_hash = ${digestToken(token)}`;
}

export async function findAdminBySessionToken(token) {
  if (!token) return null;
  const sql = getDatabase();
  const [admin] = await sql`
    select
      au.id,
      au.email,
      au.display_name,
      s.expires_at
    from admin_sessions s
    join admin_users au on au.id = s.admin_user_id
    where s.token_hash = ${digestToken(token)}
      and s.expires_at > now()
      and au.is_active = true
    limit 1
  `;

  if (admin) {
    await sql`
      update admin_sessions
      set last_seen_at = now()
      where token_hash = ${digestToken(token)}
        and last_seen_at < now() - interval '15 minutes'
    `;
  }
  return admin || null;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  return findAdminBySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getRequestAdmin(request) {
  return findAdminBySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
