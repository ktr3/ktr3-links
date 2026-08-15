export function normalizeBeatStarsPlayerUrl(value) {
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid BeatStars player URL");
  }

  if (url.protocol !== "https:" || url.hostname !== "player.beatstars.com") {
    throw new Error("Invalid BeatStars player URL");
  }

  const storeId = url.searchParams.get("storeId");
  if (!/^\d{1,12}$/.test(storeId || "")) {
    throw new Error("Invalid BeatStars storeId");
  }

  return `https://player.beatstars.com/?storeId=${storeId}`;
}
