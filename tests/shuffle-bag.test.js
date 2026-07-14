import assert from "node:assert/strict";
import test from "node:test";

import {
  createShuffleBag,
  drawNext,
  featureValue,
  reconcileShuffleBag,
} from "../lib/underground/shuffle-bag.js";
import {
  formatPlaybackTime,
  loadSpotifyUriIfChanged,
  spotifyEmbedUrl,
  spotifyUri,
} from "../lib/underground/spotify.js";
import {
  instagramUrl,
  isRadioEligibleProfile,
  normalizeProfileName,
  profileSlug,
} from "../lib/underground/profile-schema.js";
import {
  canonicalPublicUrl,
  platformForUrl,
  surveyRole,
} from "../lib/underground/survey-import.js";
import {
  listenDestination,
  spotifyListeningUrl,
} from "../lib/underground/listening.js";
import {
  extractSoundCloudEmbedUrl,
  isSoundCloudUrl,
  soundCloudOEmbedUrl,
} from "../lib/underground/soundcloud.js";
import { mapCatalogProfile } from "../hooks/useUndergroundCatalog.js";

function seededRandom(seed = 123456789) {
  let value = seed >>> 0;

  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function drawMany(ids, amount, seed = 7) {
  const random = seededRandom(seed);
  let state = createShuffleBag(ids, { random });
  const values = [];

  for (let index = 0; index < amount; index += 1) {
    const draw = drawNext(state, ids, random);
    state = draw.state;
    values.push(draw.value);
  }

  return { state, values };
}

test("each artist appears once before a cycle repeats", () => {
  const ids = ["A", "B", "C", "D", "E"];
  const { values } = drawMany(ids, ids.length * 3);

  for (let offset = 0; offset < values.length; offset += ids.length) {
    assert.deepEqual([...values.slice(offset, offset + ids.length)].sort(), ids);
  }
});

test("cycle boundaries do not repeat the same artist", () => {
  const ids = ["A", "B", "C", "D"];
  const { values } = drawMany(ids, 40, 19);

  for (let index = 1; index < values.length; index += 1) {
    assert.notEqual(values[index], values[index - 1]);
  }
});

test("a saved cycle resumes where the visitor left it", () => {
  const ids = ["A", "B", "C"];
  const random = seededRandom(31);
  let state = createShuffleBag(ids, { random });
  const first = drawNext(state, ids, random);
  state = JSON.parse(JSON.stringify(first.state));
  const second = drawNext(state, ids, random);

  assert.notEqual(second.value, first.value);
  assert.equal(second.position, 2);
  assert.equal(second.cycle, 1);
});

test("KTR3 opens a fresh cycle and is not repeated in its remaining draws", () => {
  const ids = ["A", "KTR3", "B", "C"];
  const random = seededRandom(73);
  const featured = featureValue(createShuffleBag(ids, { random }), ids, "KTR3", random);

  assert.equal(featured.value, "KTR3");
  assert.equal(featured.position, 1);
  assert.equal(featured.featured, true);
  assert.deepEqual(featured.state.seen, ["KTR3"]);
  assert.ok(!featured.state.remaining.includes("KTR3"));

  let state = featured.state;
  const rest = [];
  for (let index = 0; index < ids.length - 1; index += 1) {
    const draw = drawNext(state, ids, random);
    state = draw.state;
    rest.push(draw.value);
  }

  assert.deepEqual([...rest].sort(), ["A", "B", "C"]);
});

test("reloading features KTR3 without losing the visitor's pending random cycle", () => {
  const ids = ["A", "KTR3", "B", "C"];
  const random = seededRandom(91);
  let state = featureValue(createShuffleBag(ids, { random }), ids, "KTR3", random).state;
  state = drawNext(state, ids, random).state;
  const remainingBeforeReload = [...state.remaining];

  const reloaded = featureValue(
    JSON.parse(JSON.stringify(state)),
    ids,
    "KTR3",
    random,
  );

  assert.equal(reloaded.value, "KTR3");
  assert.deepEqual(reloaded.state.remaining, remainingBeforeReload);

  const next = drawNext(reloaded.state, ids, random);
  assert.equal(next.value, remainingBeforeReload[0]);
});

test("new artists join the pending cycle and removed artists disappear", () => {
  const random = seededRandom(43);
  const original = ["A", "B", "C"];
  let state = createShuffleBag(original, { random });
  state = drawNext(state, original, random).state;

  const removedId = state.remaining[0];
  const nextIds = original.filter((id) => id !== removedId).concat("NEW");
  const reconciled = reconcileShuffleBag(state, nextIds, random);

  assert.ok(reconciled.remaining.includes("NEW"));
  assert.ok(!reconciled.remaining.includes(removedId));
  assert.ok(!reconciled.seen.includes(removedId));
});

test("empty and single-item catalogs degrade safely", () => {
  const empty = drawNext(null, [], seededRandom());
  assert.equal(empty.value, null);
  assert.equal(empty.total, 0);

  const random = seededRandom();
  let state = createShuffleBag(["ONLY"], { random });
  const first = drawNext(state, ["ONLY"], random);
  const second = drawNext(first.state, ["ONLY"], random);

  assert.equal(first.value, "ONLY");
  assert.equal(second.value, "ONLY");
  assert.equal(second.cycle, 2);
});

test("Spotify URLs become safe embed URLs and controller URIs", () => {
  const url = "https://open.spotify.com/track/6vc0qq2R0RO42hqnNjcFhR?si=test";

  assert.equal(
    spotifyEmbedUrl(url),
    "https://open.spotify.com/embed/track/6vc0qq2R0RO42hqnNjcFhR",
  );
  assert.equal(spotifyUri(url), "spotify:track:6vc0qq2R0RO42hqnNjcFhR");
  assert.equal(spotifyUri("https://example.com/not-spotify"), null);
});

test("playback time is formatted without leaking invalid values", () => {
  assert.equal(formatPlaybackTime(0), "0:00");
  assert.equal(formatPlaybackTime(185000), "3:05");
  assert.equal(formatPlaybackTime(Number.NaN), "0:00");
});

test("RANDOM reuses the Spotify controller and only loads a changed URI", () => {
  const loadedUris = [];
  const controller = { loadUri: (uri) => loadedUris.push(uri) };
  const firstUri = "spotify:track:first";
  const secondUri = "spotify:track:second";

  let loadedUri = loadSpotifyUriIfChanged(controller, firstUri, firstUri);
  assert.equal(loadedUri, firstUri);
  assert.deepEqual(loadedUris, []);

  loadedUri = loadSpotifyUriIfChanged(controller, loadedUri, secondUri);
  assert.equal(loadedUri, secondUri);
  assert.deepEqual(loadedUris, [secondUri]);
});

test("profile identity helpers normalize legacy catalog values", () => {
  assert.equal(normalizeProfileName("  J.   Muñoz "), "j. munoz");
  assert.equal(profileSlug("ØDEI"), "odei");
  assert.equal(profileSlug("J. Muñoz"), "j-munoz");
  assert.equal(instagramUrl("@ktr3ss"), "https://www.instagram.com/ktr3ss/");
});

test("survey roles and public URLs are normalized before import", () => {
  assert.equal(surveyRole("Artista"), "artist");
  assert.equal(surveyRole("Productor/a"), "producer");
  assert.equal(surveyRole("Colectivo / sello"), "collective");
  assert.equal(surveyRole("DJ"), "dj");

  const spotify = canonicalPublicUrl(
    "https://open.spotify.com/intl-es/artist/7gp0wyDrPpGy0RkJ9t293s?si=test&utm_source=copy-link",
  );
  const instagram = canonicalPublicUrl("@Golden21k_", "instagram");
  const tiktok = canonicalPublicUrl(
    "tiktok https://www.tiktok.com/@aizkora_?_r=1&_t=tracking",
  );

  assert.equal(spotify, "https://open.spotify.com/artist/7gp0wyDrPpGy0RkJ9t293s");
  assert.equal(instagram, "https://www.instagram.com/golden21k_/");
  assert.equal(tiktok, "https://www.tiktok.com/@aizkora_");
  assert.equal(platformForUrl(spotify), "spotify");
  assert.equal(platformForUrl("https://youtu.be/example"), "youtube");
  assert.equal(platformForUrl("https://music.apple.com/es/artist/example/1"), "apple_music");
});

test("every profile with a supported playable resource can join RANDOM", () => {
  assert.equal(isRadioEligibleProfile({ roles: ["collective"], spotify: "https://open.spotify.com/artist/id" }), true);
  assert.equal(isRadioEligibleProfile({ roles: ["dj"], spotifyTrack: "https://open.spotify.com/track/id" }), true);
  assert.equal(isRadioEligibleProfile({ roles: ["dj"], soundcloud: "https://soundcloud.com/zaze" }), true);
  assert.equal(isRadioEligibleProfile({ roles: ["artist"] }), false);
});

test("playlist-only database profiles remain playable in RANDOM", () => {
  const profile = mapCatalogProfile({
    id: "playlist-profile",
    displayName: "UNOTRES MOBB",
    primaryRole: "collective",
    roles: ["collective"],
    links: [
      {
        platform: "spotify",
        url: "https://open.spotify.com/playlist/0GmiES3MLOcGh3Xe9FEyX4",
        resourceType: "playlist",
        isPrimary: true,
      },
    ],
  });

  assert.equal(profile.spotify, "https://open.spotify.com/playlist/0GmiES3MLOcGh3Xe9FEyX4");
  assert.equal(isRadioEligibleProfile(profile), true);
});

test("listening destinations use real links instead of fabricated searches", () => {
  assert.deepEqual(
    listenDestination({ soundcloud: "https://soundcloud.com/zaze", youtube: "https://youtube.com/@zaze" }),
    {
      platform: "soundcloud",
      label: "Escuchar en SoundCloud",
      url: "https://soundcloud.com/zaze",
    },
  );
  assert.deepEqual(
    listenDestination({ spotify: "https://open.spotify.com/artist/id", soundcloud: "https://soundcloud.com/zaze" }),
    {
      platform: "spotify",
      label: "Escuchar en Spotify",
      url: "https://open.spotify.com/artist/id",
    },
  );
  assert.equal(listenDestination({ name: "sin enlaces" }), null);
});

test("KTR3 opens the artist catalog instead of a single featured track", () => {
  const creator = {
    name: "KTR3",
    spotify: "https://open.spotify.com/artist/1aQ6zZfkgg982Uzi431Y6R",
    spotifyTrack: "https://open.spotify.com/track/0I6qFBg4xjHP44yScjUZts",
  };

  assert.equal(spotifyListeningUrl(creator), creator.spotify);
  assert.deepEqual(listenDestination(creator), {
    platform: "spotify",
    label: "Escuchar en Spotify",
    url: creator.spotify,
  });
  assert.equal(
    spotifyListeningUrl({ ...creator, name: "Otra artista" }),
    creator.spotifyTrack,
  );
});

test("SoundCloud oEmbed helpers only accept official HTTPS player URLs", () => {
  assert.equal(isSoundCloudUrl("https://on.soundcloud.com/example"), true);
  assert.equal(isSoundCloudUrl("https://soundcloud.com/zaze-gamer"), true);
  assert.equal(isSoundCloudUrl("http://soundcloud.com/insecure"), false);
  assert.equal(isSoundCloudUrl("https://example.com/fake"), false);

  const endpoint = new URL(soundCloudOEmbedUrl("https://soundcloud.com/zaze-gamer"));
  assert.equal(endpoint.origin + endpoint.pathname, "https://soundcloud.com/oembed");
  assert.equal(endpoint.searchParams.get("url"), "https://soundcloud.com/zaze-gamer");
  assert.equal(endpoint.searchParams.get("maxheight"), "166");

  assert.equal(
    extractSoundCloudEmbedUrl('<iframe src="https://w.soundcloud.com/player/?url=track&amp;color=ff5500"></iframe>'),
    "https://w.soundcloud.com/player/?url=track&color=ff5500",
  );
  assert.equal(extractSoundCloudEmbedUrl('<iframe src="https://evil.example/player"></iframe>'), null);
});

test("database catalog rows preserve Spotify track and artist links", () => {
  const mapped = mapCatalogProfile({
    id: "profile-id",
    slug: "xrtzy",
    displayName: "xrtzy",
    primaryRole: "artist",
    roles: ["artist"],
    links: [
      {
        platform: "spotify",
        resourceType: "artist",
        url: "https://open.spotify.com/artist/artist-id",
        isPrimary: false,
      },
      {
        platform: "spotify",
        resourceType: "track",
        url: "https://open.spotify.com/track/track-id",
        isPrimary: true,
      },
      {
        platform: "soundcloud",
        url: "https://soundcloud.com/xrtzy",
      },
      {
        platform: "youtube",
        url: "https://youtube.com/@xrtzy",
      },
    ],
  });

  assert.equal(mapped.id, "profile-id");
  assert.equal(mapped.spotify, "https://open.spotify.com/artist/artist-id");
  assert.equal(mapped.spotifyTrack, "https://open.spotify.com/track/track-id");
  assert.equal(mapped.soundcloud, "https://soundcloud.com/xrtzy");
  assert.equal(mapped.youtube, "https://youtube.com/@xrtzy");
});
