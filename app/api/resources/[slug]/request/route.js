import { sendEmail } from "../../../../../lib/email/index.js";
import { resourceDeliveryEmail } from "../../../../../lib/email/templates.js";
import {
  assertTrustedMutation,
  publicAppOrigin,
} from "../../../../../lib/auth/request.js";
import { createDelivery } from "../../../../../lib/resources/delivery.js";
import { getPublicResourceBySlug } from "../../../../../lib/resources/repository.js";
import {
  assertPermanentSubscriberEmail,
  DisposableEmailError,
} from "../../../../../lib/security/disposable-email.js";
import {
  clientIpFromRequest,
  DeliveryRateLimitError,
  enforceResourceDeliveryRateLimit,
} from "../../../../../lib/security/resource-delivery-limit.js";
import { verifyTurnstile } from "../../../../../lib/security/turnstile.js";

export const dynamic = "force-dynamic";

function absoluteUrl(request, path) {
  const origin = publicAppOrigin({
    requestUrl: request.url,
    trustedOrigin: process.env.APP_ORIGIN,
  });
  return new URL(path, origin).toString();
}

export async function POST(request, context) {
  try {
    assertTrustedMutation(request);
    const { slug } = await context.params;
    const resource = await getPublicResourceBySlug(slug);
    if (!resource) return Response.json({ error: "not_found" }, { status: 404 });
    if (resource.accessModel === "open") {
      return Response.json({ downloadUrl: `/api/resources/${resource.slug}/download` });
    }

    const payload = await request.json();
    const email = assertPermanentSubscriberEmail(payload.email);
    const clientIp = clientIpFromRequest(request);
    const turnstileValid = await verifyTurnstile({
      token: payload.turnstileToken,
      remoteIp: clientIp,
    });
    if (!turnstileValid) {
      return Response.json({ error: "turnstile_failed" }, { status: 400 });
    }
    await enforceResourceDeliveryRateLimit({
      email,
      ip: clientIp,
      resourceId: resource.id,
    });
    const marketingConsent = payload.marketingConsent === true;
    const delivery = await createDelivery({
      resource,
      email,
      name: payload.name,
      marketingConsent,
      source: `resource:${resource.slug}`,
    });
    const downloadUrl = absoluteUrl(request, `/api/resources/download?token=${encodeURIComponent(delivery.downloadToken)}`);
    const confirmationUrl = delivery.confirmationToken
      ? absoluteUrl(request, `/api/newsletter/confirm?token=${encodeURIComponent(delivery.confirmationToken)}`)
      : null;
    const unsubscribeUrl = absoluteUrl(
      request,
      `/api/newsletter/unsubscribe?token=${encodeURIComponent(delivery.unsubscribeToken)}`,
    );
    const message = resourceDeliveryEmail({
      name: delivery.subscriber.name,
      resourceTitle: resource.title,
      downloadUrl,
      confirmationUrl,
    });
    const sent = await sendEmail({
      to: delivery.subscriber.email,
      ...message,
    });

    return Response.json({
      sent: true,
      provider: sent.provider,
      ...(sent.provider === "development" ? {
        developmentDownloadUrl: downloadUrl,
        developmentConfirmationUrl: confirmationUrl,
        developmentUnsubscribeUrl: unsubscribeUrl,
      } : {}),
    });
  } catch (error) {
    if (error instanceof DeliveryRateLimitError) {
      return Response.json(
        { error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    if (error instanceof DisposableEmailError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Unable to deliver resource", error);
    const clientError = /email|correo|origin/i.test(error.message);
    return Response.json(
      { error: clientError ? error.message : "delivery_unavailable" },
      { status: clientError ? 400 : 503 },
    );
  }
}
