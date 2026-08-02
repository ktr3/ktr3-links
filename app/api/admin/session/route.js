import { getRequestAdmin } from "../../../../lib/auth/server.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const admin = await getRequestAdmin(request);
  if (!admin) {
    return Response.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    {
      authenticated: true,
      admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
