import { redeemDeliveryGrant } from "../../../../lib/resources/delivery.js";
import { resourceFileResponse } from "../../../../lib/resources/http.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return Response.json({ error: "invalid_or_expired_link" }, { status: 410 });
  const grant = await redeemDeliveryGrant(token);
  if (!grant) return Response.json({ error: "invalid_or_expired_link" }, { status: 410 });
  return resourceFileResponse({
    storageKey: grant.storageKey,
    originalName: grant.originalName,
    mimeType: grant.mimeType,
    sizeBytes: grant.sizeBytes,
  }, { download: true });
}
