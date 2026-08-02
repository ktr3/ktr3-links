import { closeDatabase, getDatabase } from "../lib/db/client.js";

const sql = getDatabase();
try {
  const [sessions, grants, loginAttempts, deliveryAttempts] = await sql.begin(async (transaction) => {
    const expiredSessions = await transaction`
      delete from admin_sessions
      where expires_at <= now()
      returning id
    `;
    const expiredGrants = await transaction`
      delete from resource_delivery_grants
      where expires_at <= now() or downloads_remaining = 0
      returning id
    `;
    const oldAttempts = await transaction`
      delete from admin_login_attempts
      where attempted_at < now() - interval '24 hours'
      returning id
    `;
    const oldDeliveryAttempts = await transaction`
      delete from resource_delivery_attempts
      where attempted_at < now() - interval '24 hours'
      returning id
    `;
    return [expiredSessions, expiredGrants, oldAttempts, oldDeliveryAttempts];
  });
  process.stdout.write(
    `Cleanup complete: ${sessions.length} sessions, ${grants.length} grants, ${loginAttempts.length} login attempts, ${deliveryAttempts.length} delivery attempts\n`,
  );
} finally {
  await closeDatabase();
}
