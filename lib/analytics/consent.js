export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "ktr3_privacy_choice";
export const CONSENT_EVENT = "ktr3:privacy-choice";
export const OPEN_CONSENT_EVENT = "ktr3:open-privacy-settings";

export function createConsentChoice(
  { analytics = false, marketing = false } = {},
  updatedAt = new Date().toISOString(),
) {
  const expiry = new Date(updatedAt);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: analytics === true,
    marketing: marketing === true,
    updatedAt,
    expiresAt: expiry.toISOString(),
  };
}

export function parseStoredConsent(rawValue, now = Date.now()) {
  if (!rawValue) return null;

  try {
    const value = JSON.parse(rawValue);
    if (
      !value
      || value.version !== CONSENT_VERSION
      || value.necessary !== true
      || typeof value.analytics !== "boolean"
      || typeof value.marketing !== "boolean"
      || typeof value.updatedAt !== "string"
      || typeof value.expiresAt !== "string"
      || new Date(value.expiresAt).getTime() <= now
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
