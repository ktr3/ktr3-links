"use client";

import { useEffect, useState } from "react";

function instagramHandle(url) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[0] || undefined;
  } catch {
    return undefined;
  }
}

export function mapCatalogProfile(profile) {
  const links = Array.isArray(profile.links) ? profile.links : [];
  const platformUrl = (platform) => links.find((link) => link.platform === platform)?.url;
  const spotifyLinks = links.filter((link) => link.platform === "spotify");
  const spotifyCollection = spotifyLinks.find((link) => link.resourceType === "artist")
    || spotifyLinks.find((link) => link.resourceType === "album")
    || spotifyLinks.find((link) => link.resourceType === "playlist");
  const spotifyTrack = spotifyLinks.find(
    (link) => link.resourceType === "track" && link.isPrimary,
  ) || spotifyLinks.find((link) => link.resourceType === "track");
  const instagram = links.find((link) => link.platform === "instagram");

  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.displayName,
    roles: profile.roles?.length ? profile.roles : [profile.primaryRole],
    city: profile.city || undefined,
    bio: profile.bio || undefined,
    instagram: instagramHandle(instagram?.url),
    spotify: spotifyCollection?.url,
    spotifyTrack: spotifyTrack?.url,
    soundcloud: platformUrl("soundcloud"),
    youtube: platformUrl("youtube"),
    bandcamp: platformUrl("bandcamp"),
    appleMusic: platformUrl("apple_music"),
    website: platformUrl("website"),
  };
}

export function useUndergroundCatalog(fallbackProfiles) {
  const [profiles, setProfiles] = useState(fallbackProfiles);
  const [source, setSource] = useState("fallback");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/underground/profiles", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!Array.isArray(payload.profiles) || payload.profiles.length === 0) return;
        setProfiles(payload.profiles.map(mapCatalogProfile));
        setSource("database");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setSource("fallback");
      });

    return () => controller.abort();
  }, []);

  return { profiles, source };
}
