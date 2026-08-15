async function resendRequest(path, { method = "POST", body } = {}) {
  if (process.env.EMAIL_DRIVER !== "resend") {
    return { provider: "development", skipped: true };
  }
  const apiKey = process.env.RESEND_CONTACTS_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_CONTACTS_API_KEY is required to sync newsletter contacts");
  }

  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function ensureSegmentMembership(email, segmentId) {
  if (!segmentId) return;
  const membership = await resendRequest(
    `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
    { method: "POST" },
  );
  if (!membership.skipped && !membership.response.ok && membership.response.status !== 409) {
    throw new Error(`Unable to add Resend contact to segment (${membership.response.status})`);
  }
}

export async function subscribeResendContact({ email, name }) {
  const segmentId = process.env.RESEND_SEGMENT_ID;
  const created = await resendRequest("/contacts", {
    body: {
      email,
      unsubscribed: false,
      ...(name ? { properties: { first_name: name } } : {}),
      ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
    },
  });
  if (created.skipped) return created;
  if (created.response.ok) {
    return { provider: "resend", id: created.payload.id || null };
  }

  if (created.response.status === 409) {
    const updated = await resendRequest(`/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: {
        unsubscribed: false,
        ...(name ? { properties: { first_name: name } } : {}),
      },
    });
    if (!updated.response.ok) {
      throw new Error(`Unable to update Resend contact (${updated.response.status})`);
    }
    await ensureSegmentMembership(email, segmentId);
    return { provider: "resend", id: updated.payload.id || null };
  }
  throw new Error(`Unable to create Resend contact (${created.response.status})`);
}

export async function unsubscribeResendContact(email) {
  const updated = await resendRequest(`/contacts/${encodeURIComponent(email)}`, {
    method: "PATCH",
    body: { unsubscribed: true },
  });
  if (updated.skipped) return updated;
  if (updated.response.status === 404) return { provider: "resend", missing: true };
  if (!updated.response.ok) {
    throw new Error(`Unable to unsubscribe Resend contact (${updated.response.status})`);
  }
  return { provider: "resend", id: updated.payload.id || null };
}
