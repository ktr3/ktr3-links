const LISTENING_PLATFORMS = [
  ["soundcloud", "soundcloud", "Escuchar en SoundCloud"],
  ["youtube", "youtube", "Escuchar en YouTube"],
  ["bandcamp", "bandcamp", "Escuchar en Bandcamp"],
  ["appleMusic", "apple_music", "Escuchar en Apple Music"],
  ["website", "website", "Escuchar"],
];

export function spotifyListeningUrl(profile) {
  if (!profile) return null;

  const isCreator = String(profile.name || "").trim().toLocaleUpperCase("es") === "KTR3";
  if (isCreator && profile.spotify) return profile.spotify;

  return profile.spotifyTrack || profile.spotify || null;
}

export function listenDestination(profile) {
  if (!profile) return null;

  const spotifyUrl = spotifyListeningUrl(profile);
  if (spotifyUrl) {
    return { platform: "spotify", label: "Escuchar en Spotify", url: spotifyUrl };
  }

  for (const [field, platform, label] of LISTENING_PLATFORMS) {
    if (profile[field]) {
      return { platform, label, url: profile[field] };
    }
  }

  return null;
}
