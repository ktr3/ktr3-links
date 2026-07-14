import { normalizeProfileName } from "./profile-schema.js";
import { canonicalPublicUrl, platformForUrl } from "./survey-import.js";

const ROLE_MAP = new Map([
  ["artista", "artist"],
  ["productor/a", "producer"],
  ["productora", "producer"],
  ["dj", "dj"],
  ["colectivo / sello", "collective"],
  ["colectivo/sello", "collective"],
  ["foto / visual", "visual"],
  ["foto/visual", "visual"],
]);

export function extractHttpsUrls(value) {
  if (!value) return [];
  return [...String(value).matchAll(/https:\/\/[^\s]+/gi)]
    .map((match) => match[0].replace(/[),.;]+$/, ""));
}

export function catalogUpdateRole(value) {
  const role = ROLE_MAP.get(normalizeProfileName(String(value || "")));
  if (!role) throw new Error(`Unsupported catalog role: ${value}`);
  return role;
}

function normalizedLink(rawUrl, hint, label, warnings) {
  const url = canonicalPublicUrl(rawUrl, hint);
  if (!url) {
    if (String(rawUrl || "").trim()) {
      warnings.push(`${label} link is not supported: ${String(rawUrl).trim()}`);
    }
    return null;
  }
  return { platform: platformForUrl(url), url };
}

export function normalizeCatalogUpdateRow(rawRow) {
  const name = String(rawRow?.name || "").trim();
  if (name.length < 2 || name.length > 80) {
    throw new Error("Catalog row requires a name between 2 and 80 characters");
  }

  const previousName = String(rawRow.previousName || "").trim() || null;
  const warnings = [];
  const links = [];

  if (rawRow.instagram) {
    const link = normalizedLink(rawRow.instagram, "instagram", "Instagram", warnings);
    if (link) links.push(link);
  }

  for (const [field, label] of [["youtube", "YouTube"], ["spotify", "Spotify"]]) {
    if (!rawRow[field]) continue;
    const link = normalizedLink(rawRow[field], null, label, warnings);
    if (link) links.push(link);
  }

  const otherValues = Array.isArray(rawRow.otherLinks)
    ? rawRow.otherLinks.flatMap(extractHttpsUrls)
    : extractHttpsUrls(rawRow.otherLinks);
  for (const rawUrl of otherValues) {
    const link = normalizedLink(rawUrl, null, "Other", warnings);
    if (link) links.push(link);
  }

  const uniqueLinks = [...new Map(
    links.map((link) => [`${link.platform}\u0000${link.url}`, link]),
  ).values()];

  return {
    name,
    previousName,
    role: catalogUpdateRole(rawRow.role),
    city: String(rawRow.city || "").trim() || null,
    links: uniqueLinks,
    warnings,
  };
}

export function parseCatalogUpdatePayload(text) {
  const payload = JSON.parse(text);
  if (!Array.isArray(payload.rows)) {
    throw new Error("Catalog update payload must include a rows array");
  }
  return payload.rows.map(normalizeCatalogUpdateRow);
}
