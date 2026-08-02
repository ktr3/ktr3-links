import { subscribeResendContact } from "../../../../lib/email/contacts.js";
import { confirmSubscriber } from "../../../../lib/resources/delivery.js";
import { recordSubscriberProviderSync } from "../../../../lib/resources/delivery.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const confirmed = token ? await confirmSubscriber(token) : null;
  if (confirmed) {
    try {
      const result = await subscribeResendContact(confirmed);
      await recordSubscriberProviderSync(confirmed.id, result);
    } catch (error) {
      console.error("Unable to sync confirmed subscriber to Resend", error);
      await recordSubscriberProviderSync(confirmed.id, null, error).catch(() => {});
    }
  }
  return Response.redirect(
    new URL(`/recursos?newsletter=${confirmed ? "confirmed" : "invalid"}`, url.origin),
    302,
  );
}
