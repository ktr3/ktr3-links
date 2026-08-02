import { unsubscribeResendContact } from "../../../../lib/email/contacts.js";
import { unsubscribeSubscriber } from "../../../../lib/resources/delivery.js";
import { recordSubscriberProviderSync } from "../../../../lib/resources/delivery.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const unsubscribed = token ? await unsubscribeSubscriber(token) : null;
  if (unsubscribed) {
    try {
      const result = await unsubscribeResendContact(unsubscribed.email);
      await recordSubscriberProviderSync(unsubscribed.id, result);
    } catch (error) {
      console.error("Unable to sync unsubscribe to Resend", error);
      await recordSubscriberProviderSync(unsubscribed.id, null, error).catch(() => {});
    }
  }
  return Response.redirect(
    new URL(`/recursos?newsletter=${unsubscribed ? "unsubscribed" : "invalid"}`, url.origin),
    302,
  );
}
