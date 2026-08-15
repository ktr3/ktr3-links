import { getDatabase } from "../db/client.js";
import {
  createPublicGrant,
  digestPublicGrant,
  safeSubscriberEmail,
} from "./grants.js";

const CONSENT_VERSION = "2026-07-29";

export async function createDelivery({
  resource,
  email: emailInput,
  name: nameInput,
  marketingConsent,
  source = "resource-gate",
}) {
  const email = safeSubscriberEmail(emailInput);
  const name = String(nameInput || "").trim().slice(0, 80) || null;
  const downloadToken = createPublicGrant();
  const confirmationToken = marketingConsent ? createPublicGrant() : null;
  const unsubscribeToken = createPublicGrant();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const confirmationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const sql = getDatabase();

  const result = await sql.begin(async (transaction) => {
    const [existing] = await transaction`
      select id, status
      from subscribers
      where lower(email) = ${email}
      limit 1
    `;

    if (existing) {
      const [subscriber] = await transaction`
        update subscribers
        set name = coalesce(${name}, name),
            marketing_consent = case when ${marketingConsent} then true else marketing_consent end,
            consent_at = case when ${marketingConsent} then now() else consent_at end,
            consent_source = case when ${marketingConsent} then ${source} else consent_source end,
            consent_version = case when ${marketingConsent} then ${CONSENT_VERSION} else consent_version end,
            status = case
              when ${marketingConsent} and status <> 'confirmed' then 'pending'::subscriber_status
              else status
            end,
            confirmation_token_hash = case
              when ${marketingConsent} and status <> 'confirmed' then ${digestPublicGrant(confirmationToken)}
              else confirmation_token_hash
            end,
            confirmation_expires_at = case
              when ${marketingConsent} and status <> 'confirmed' then ${confirmationExpiresAt}
              else confirmation_expires_at
            end,
            unsubscribe_token_hash = ${digestPublicGrant(unsubscribeToken)},
            updated_at = now()
        where id = ${existing.id}
        returning id, email, name, status
      `;
      return subscriber;
    }

    const [subscriber] = await transaction`
      insert into subscribers (
        email, name, status, marketing_consent, consent_at, consent_source, consent_version,
        confirmation_token_hash, confirmation_expires_at, unsubscribe_token_hash
      )
      values (
        ${email}, ${name}, ${marketingConsent ? "pending" : "pending"},
        ${marketingConsent}, ${marketingConsent ? new Date() : null},
        ${marketingConsent ? source : null}, ${marketingConsent ? CONSENT_VERSION : null},
        ${confirmationToken ? digestPublicGrant(confirmationToken) : null},
        ${confirmationToken ? confirmationExpiresAt : null},
        ${digestPublicGrant(unsubscribeToken)}
      )
      returning id, email, name, status
    `;
    return subscriber;
  });

  await sql`
    insert into resource_delivery_grants (
      token_hash, resource_id, resource_file_id, subscriber_id, expires_at
    )
    values (
      ${digestPublicGrant(downloadToken)}, ${resource.id}, ${resource.downloadFileId},
      ${result.id}, ${expiresAt}
    )
  `;

  return {
    subscriber: result,
    downloadToken,
    confirmationToken: result.status === "confirmed" ? null : confirmationToken,
    unsubscribeToken,
    expiresAt,
  };
}

export async function redeemDeliveryGrant(token) {
  const sql = getDatabase();
  const tokenHash = digestPublicGrant(token);

  return sql.begin(async (transaction) => {
    const [grant] = await transaction`
      select
        g.id,
        g.resource_id,
        g.resource_file_id,
        g.subscriber_id,
        f.storage_key,
        f.original_name,
        f.mime_type,
        f.size_bytes
      from resource_delivery_grants g
      join resources r on r.id = g.resource_id
      join resource_files f on f.id = g.resource_file_id
      where g.token_hash = ${tokenHash}
        and g.expires_at > now()
        and g.downloads_remaining > 0
        and r.status = 'published'
      for update of g
      limit 1
    `;
    if (!grant) return null;

    await transaction`
      update resource_delivery_grants
      set downloads_remaining = downloads_remaining - 1
      where id = ${grant.id}
    `;
    await transaction`
      insert into resource_downloads (
        resource_id, resource_file_id, subscriber_id, channel
      )
      values (${grant.resourceId}, ${grant.resourceFileId}, ${grant.subscriberId}, 'email')
    `;
    return grant;
  });
}

export async function confirmSubscriber(token) {
  const sql = getDatabase();
  const [subscriber] = await sql`
    update subscribers
    set status = 'confirmed',
        confirmed_at = now(),
        confirmation_token_hash = null,
        confirmation_expires_at = null,
        updated_at = now()
    where confirmation_token_hash = ${digestPublicGrant(token)}
      and confirmation_expires_at > now()
      and marketing_consent = true
    returning id, email, name
  `;
  return subscriber || null;
}

export async function unsubscribeSubscriber(token) {
  const sql = getDatabase();
  const [subscriber] = await sql`
    update subscribers
    set status = 'unsubscribed',
        marketing_consent = false,
        unsubscribed_at = now(),
        confirmation_token_hash = null,
        confirmation_expires_at = null,
        updated_at = now()
    where unsubscribe_token_hash = ${digestPublicGrant(token)}
    returning id, email, name
  `;
  return subscriber || null;
}

export async function recordSubscriberProviderSync(subscriberId, result, error) {
  const sql = getDatabase();
  await sql`
    update subscribers
    set email_provider = ${result?.provider || null},
        provider_contact_id = coalesce(${result?.id || null}, provider_contact_id),
        provider_synced_at = case when ${Boolean(result && !result.skipped)} then now() else provider_synced_at end,
        provider_sync_error = ${error ? String(error.message || error).slice(0, 1000) : null},
        updated_at = now()
    where id = ${subscriberId}
  `;
}
