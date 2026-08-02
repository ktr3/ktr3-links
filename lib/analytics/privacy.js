const PRIVATE_PATH_PREFIXES = ["/admin", "/api"];
const SENSITIVE_PROPERTY_NAMES = new Set([
  "email",
  "name",
  "password",
  "token",
  "turnstileToken",
  "authorization",
  "cookie",
]);

export function shouldTrackPath(pathname = "") {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return false;
  return !PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function stripUrlDetails(value) {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function redactAnalyticsEvent(event) {
  if (!event || typeof event !== "object") return null;
  let pathname = event.properties?.$pathname || "";
  if (!pathname && event.properties?.$current_url) {
    try {
      pathname = new URL(event.properties.$current_url).pathname;
    } catch {
      pathname = "";
    }
  }
  if (pathname && !shouldTrackPath(pathname)) return null;

  const properties = {};
  for (const [key, value] of Object.entries(event.properties || {})) {
    if (SENSITIVE_PROPERTY_NAMES.has(key)) continue;
    if (key === "$current_url" || key === "$referrer") {
      properties[key] = stripUrlDetails(value);
      continue;
    }
    properties[key] = value;
  }

  return { ...event, properties };
}

export function describeLink(href, origin = "https://ktr3.es") {
  if (typeof href !== "string" || !href) return null;
  if (href.startsWith("mailto:")) return { link_type: "contact_email", destination_host: "email" };
  if (href.startsWith("tel:")) return { link_type: "contact_phone", destination_host: "phone" };

  try {
    const base = new URL(origin);
    const destination = new URL(href, base);
    if (!/^https?:$/.test(destination.protocol)) return null;
    if (destination.origin === base.origin) {
      return { link_type: "internal", destination_path: destination.pathname };
    }
    return {
      link_type: "outbound",
      destination_host: destination.hostname.replace(/^www\./, ""),
    };
  } catch {
    return null;
  }
}
