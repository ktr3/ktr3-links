import { assertTrustedMutation } from "../../../../../../lib/auth/request.js";
import { getRequestAdmin } from "../../../../../../lib/auth/server.js";
import { setResourceStatus } from "../../../../../../lib/resources/repository.js";
import { RESOURCE_STATUSES } from "../../../../../../lib/resources/schema.js";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    assertTrustedMutation(request);
    const admin = await getRequestAdmin(request);
    if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const { status } = await request.json();
    if (!RESOURCE_STATUSES.includes(status)) {
      return Response.json({ error: "invalid_status" }, { status: 400 });
    }
    const resource = await setResourceStatus({ id, status, adminId: admin.id });
    return resource
      ? Response.json({ resource })
      : Response.json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    const clientError = /transition|origin/i.test(error.message);
    return Response.json(
      { error: clientError ? error.message : "status_update_unavailable" },
      { status: clientError ? 400 : 503 },
    );
  }
}
