import { z } from "zod";

export const PROFILE_ROLES = ["artist", "producer", "dj", "collective", "visual"];

const spotifyUrlSchema = z.string().url().refine(
  (url) => new URL(url).hostname === "open.spotify.com",
  "Spotify links must use open.spotify.com",
);

export const legacyProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  roles: z.array(z.enum(PROFILE_ROLES)).min(1),
  instagram: z.string().trim().min(1).max(80).optional(),
  spotify: spotifyUrlSchema.optional(),
  spotifyTrack: spotifyUrlSchema.optional(),
});

export function normalizeProfileName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

export function profileSlug(name) {
  const slug = normalizeProfileName(name)
    .replace(/ø/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "perfil";
}

export function instagramUrl(handle) {
  if (!handle) return null;
  const cleanHandle = handle.trim().replace(/^@/, "");
  return cleanHandle ? `https://www.instagram.com/${cleanHandle}/` : null;
}

export function isRadioEligibleProfile(profile) {
  return Boolean(profile?.spotifyTrack || profile?.spotify || profile?.soundcloud);
}
