import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogUpdateRole,
  extractHttpsUrls,
  normalizeCatalogUpdateRow,
  parseCatalogUpdatePayload,
} from "../lib/underground/catalog-update.js";
import {
  normalizeCatalogAdditionRow,
  parseCatalogAdditionsPayload,
} from "../lib/underground/catalog-additions.js";

test("catalog update roles include the manual visual label", () => {
  assert.equal(catalogUpdateRole("Artista"), "artist");
  assert.equal(catalogUpdateRole("Productor/a"), "producer");
  assert.equal(catalogUpdateRole("DJ"), "dj");
  assert.equal(catalogUpdateRole("Colectivo / sello"), "collective");
  assert.equal(catalogUpdateRole("Foto / visual"), "visual");
});

test("catalog updates canonicalize links and preserve explicit identity aliases", () => {
  const row = normalizeCatalogUpdateRow({
    name: "Danel aka YETIMAN",
    previousName: "Danel",
    role: "Artista",
    instagram: "https://www.instagram.com/YETIMAAN/?igsh=test",
    spotify: "https://open.spotify.com/intl-es/artist/5RzaqhLwaT6hHAVrO3LAan?si=test",
    otherLinks: "SoundCloud: https://soundcloud.com/yetiman\nWeb: https://yetiman.example/",
  });

  assert.equal(row.previousName, "Danel");
  assert.deepEqual(row.links, [
    { platform: "instagram", url: "https://www.instagram.com/yetimaan/" },
    { platform: "spotify", url: "https://open.spotify.com/artist/5RzaqhLwaT6hHAVrO3LAan" },
    { platform: "soundcloud", url: "https://soundcloud.com/yetiman" },
    { platform: "website", url: "https://yetiman.example" },
  ]);
  assert.deepEqual(row.warnings, []);
});

test("every HTTPS URL is extracted and duplicate links are removed", () => {
  assert.deepEqual(
    extractHttpsUrls("one https://example.com/a\ntwo https://example.com/b"),
    ["https://example.com/a", "https://example.com/b"],
  );

  const row = normalizeCatalogUpdateRow({
    name: "Example",
    role: "DJ",
    instagram: "https://instagram.com/example",
    otherLinks: "https://instagram.com/example/",
  });
  assert.equal(row.links.length, 1);
});

test("unsupported Spotify user URLs are warnings, not playable resources", () => {
  const row = normalizeCatalogUpdateRow({
    name: "pinkflamingo",
    role: "Productor/a",
    spotify: "https://open.spotify.com/user/gmlw5k2euvioepbjlm6xlnk9c",
  });

  assert.deepEqual(row.links, []);
  assert.equal(row.warnings.length, 1);
  assert.match(row.warnings[0], /Spotify/i);
});

test("catalog update payloads require a rows array", () => {
  assert.equal(parseCatalogUpdatePayload(JSON.stringify({ rows: [{ name: "AA", role: "DJ" }] })).length, 1);
  assert.throws(() => parseCatalogUpdatePayload("{}"), /rows array/i);
});

test("catalog additions require dated consent and retain an optional public bio", () => {
  const row = normalizeCatalogAdditionRow({
    sourceRow: 3,
    submittedAt: "2026-07-15T19:34:28.432+02:00",
    consentText: "Autorizo la publicación de este perfil en el directorio.",
    name: "Zuribeltz",
    role: "Foto / visual",
    instagram: "@zuriibeltz",
    city: "Beasain",
    bio: "Trabajo en arte visual, branding y comunicación.",
  });

  assert.equal(row.role, "visual");
  assert.equal(row.sourceRow, 3);
  assert.equal(row.submittedAt.toISOString(), "2026-07-15T17:34:28.432Z");
  assert.equal(row.bio, "Trabajo en arte visual, branding y comunicación.");
  assert.deepEqual(row.links, [
    { platform: "instagram", url: "https://www.instagram.com/zuriibeltz/" },
  ]);
});

test("catalog additions reject rows without valid consent metadata", () => {
  const base = { name: "Example", role: "DJ" };
  assert.throws(() => normalizeCatalogAdditionRow(base), /consent/i);
  assert.throws(() => normalizeCatalogAdditionRow({
    ...base,
    consentText: "Autorizo la publicación.",
    submittedAt: "not-a-date",
  }), /date/i);
  assert.throws(() => parseCatalogAdditionsPayload("{}"), /rows array/i);
});
