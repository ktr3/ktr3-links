import { instagramUrl, normalizeProfileName } from "./profile-schema.js";

const ROLE_MAP = new Map([
  ["artista", "artist"],
  ["productor/a", "producer"],
  ["productor", "producer"],
  ["productora", "producer"],
  ["dj", "dj"],
  ["colectivo / sello", "collective"],
  ["colectivo/sello", "collective"],
  ["visual", "visual"],
]);

const FIELD_PREFIXES = {
  submittedAt: "Marca temporal",
  name: "Nombre artístico / nombre del proyecto",
  role: "Categoría principal",
  instagram: "Instagram (@)",
  youtube: "YouTube (Link)",
  spotify: "Spotify (Link)",
  city: "Ciudad / zona",
  otherLinks: "Otros links",
  consent: "Permiso para aparecer en la web",
  generatedEmail: "Dirección de correo electrónico",
  contactEmail: "Email de contacto",
};

function fieldByPrefix(row, prefix) {
  const key = Object.keys(row).find((candidate) => candidate.startsWith(prefix));
  return key ? row[key] : null;
}

function firstHttpUrl(value) {
  if (!value) return null;
  return String(value).trim().match(/https:\/\/[^\s]+/i)?.[0] || null;
}

export function surveyRole(value) {
  const cleanValue = normalizeProfileName(String(value || ""));
  const role = ROLE_MAP.get(cleanValue);
  if (!role) throw new Error(`Unsupported survey role: ${value}`);
  return role;
}

export function canonicalPublicUrl(value, hint) {
  if (!value) return null;

  if (hint === "instagram" && !firstHttpUrl(value)) {
    const url = instagramUrl(String(value).trim());
    if (!url) return null;
    const parsed = new URL(url);
    const handle = parsed.pathname.split("/").filter(Boolean)[0]?.toLocaleLowerCase("es");
    return handle ? `https://www.instagram.com/${handle}/` : null;
  }

  const rawUrl = firstHttpUrl(value);
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(rawUrl.replace(/[),.;]+$/, ""));
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  const hostname = url.hostname.toLocaleLowerCase("en").replace(/^www\./, "");

  if (hostname === "open.spotify.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    const resourceIndex = segments.findIndex((segment) =>
      ["artist", "track", "album", "playlist"].includes(segment),
    );
    if (resourceIndex === -1 || !segments[resourceIndex + 1]) return null;
    return `https://open.spotify.com/${segments[resourceIndex]}/${segments[resourceIndex + 1]}`;
  }

  if (hostname === "instagram.com") {
    const handle = url.pathname.split("/").filter(Boolean)[0]?.toLocaleLowerCase("es");
    return handle ? `https://www.instagram.com/${handle}/` : null;
  }

  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function platformForUrl(value) {
  const hostname = new URL(value).hostname.toLocaleLowerCase("en").replace(/^www\./, "");
  if (hostname === "open.spotify.com") return "spotify";
  if (hostname === "instagram.com") return "instagram";
  if (hostname === "youtube.com" || hostname === "youtu.be") return "youtube";
  if (hostname === "soundcloud.com" || hostname.endsWith(".soundcloud.com")) return "soundcloud";
  if (hostname === "bandcamp.com" || hostname.endsWith(".bandcamp.com")) return "bandcamp";
  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) return "tiktok";
  if (hostname === "music.apple.com") return "apple_music";
  if (hostname === "beatstars.com" || hostname.endsWith(".beatstars.com")) return "beatstars";
  return "website";
}

function parseSubmittedAt(value) {
  const cleanValue = String(value || "").trim();
  const match = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid survey timestamp: ${value}`);
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+02:00`);
}

export function normalizeSurveyRow(rawRow) {
  const name = String(fieldByPrefix(rawRow, FIELD_PREFIXES.name) || "").trim();
  if (name.length < 2) throw new Error("Survey row is missing an artistic name");

  const contactEmail = String(
    fieldByPrefix(rawRow, FIELD_PREFIXES.contactEmail)
      || fieldByPrefix(rawRow, FIELD_PREFIXES.generatedEmail)
      || "",
  ).trim().toLocaleLowerCase("en");
  if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
    throw new Error(`Survey row for ${name} has no valid private contact email`);
  }

  const consentText = String(fieldByPrefix(rawRow, FIELD_PREFIXES.consent) || "").trim();
  if (!consentText) throw new Error(`Survey row for ${name} has no consent`);

  const candidateLinks = [
    canonicalPublicUrl(fieldByPrefix(rawRow, FIELD_PREFIXES.instagram), "instagram"),
    canonicalPublicUrl(fieldByPrefix(rawRow, FIELD_PREFIXES.youtube)),
    canonicalPublicUrl(fieldByPrefix(rawRow, FIELD_PREFIXES.spotify)),
    canonicalPublicUrl(fieldByPrefix(rawRow, FIELD_PREFIXES.otherLinks)),
  ].filter(Boolean);
  const links = [...new Set(candidateLinks)].map((url) => ({
    platform: platformForUrl(url),
    url,
  }));

  return {
    submittedAt: parseSubmittedAt(fieldByPrefix(rawRow, FIELD_PREFIXES.submittedAt)),
    name,
    role: surveyRole(fieldByPrefix(rawRow, FIELD_PREFIXES.role)),
    city: String(fieldByPrefix(rawRow, FIELD_PREFIXES.city) || "").trim() || null,
    contactEmail,
    consentText,
    links,
  };
}

export function parseSurveyPayload(text) {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("Survey JSON payload was not found");
  const payload = JSON.parse(text.slice(start));
  if (!Array.isArray(payload.rows)) throw new Error("Survey payload must include a rows array");
  return payload.rows.map(normalizeSurveyRow);
}

export function compactProfileName(name) {
  return normalizeProfileName(name).replace(/[^a-z0-9]/g, "");
}
