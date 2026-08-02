import assert from "node:assert/strict";
import test from "node:test";

import {
  parseResourceInput,
  parseTags,
  validateFileBytes,
  validateUploadName,
} from "../lib/resources/schema.js";
import { slugifyResource } from "../lib/resources/slug.js";

test("resource input accepts a Serum preset and normalizes its tags", () => {
  const resource = parseResourceInput({
    title: "808 Destroyer",
    summary: "Preset de bajo para Serum",
    description: "Diseñado por Ktr3 para producciones de trap.",
    category: "serum",
    accessModel: "email",
    tags: "808, Trap, serum, trap",
  });

  assert.equal(resource.category, "serum");
  assert.deepEqual(resource.tags, ["808", "trap", "serum"]);
});

test("MIDI resources always require email delivery", () => {
  const base = {
    title: "Rage MIDI Loop",
    summary: "Una melodía MIDI lista para producir.",
    description: "Melodía original de KTR3 preparada para el resource vault.",
    category: "midi",
    tags: ["rage"],
  };

  assert.equal(parseResourceInput({ ...base, accessModel: "email" }).accessModel, "email");
  assert.throws(
    () => parseResourceInput({ ...base, accessModel: "open" }),
    /MIDI.*email/i,
  );

  assert.equal(parseResourceInput({
    ...base,
    category: "fx",
    accessModel: "open",
  }).accessModel, "open");
});

test("resource input rejects invalid categories and undersized copy", () => {
  assert.throws(
    () => parseResourceInput({
      title: "X",
      summary: "corto",
      description: "corto",
      category: "plugins",
      accessModel: "open",
      tags: "",
    }),
    /resource/i,
  );
});

test("download validation accepts production files and rejects executables", () => {
  assert.equal(validateUploadName("Bass.SerumPreset", "download").extension, ".serumpreset");
  assert.equal(validateUploadName("melodia.mid", "download").extension, ".mid");
  assert.throws(() => validateUploadName("plugin.dll", "download"), /not allowed/i);
  assert.throws(() => validateUploadName("../preset.fxp", "download"), /filename/i);
});

test("cover and preview files use independent allowlists", () => {
  assert.equal(validateUploadName("cover.webp", "cover").extension, ".webp");
  assert.equal(validateUploadName("demo.mp3", "preview").extension, ".mp3");
  assert.throws(() => validateUploadName("cover.svg", "cover"), /not allowed/i);
});

test("known production formats must match their magic bytes", () => {
  assert.doesNotThrow(() => validateFileBytes(Buffer.from("MThd"), "melody.mid", "download"));
  assert.throws(
    () => validateFileBytes(Buffer.from("MZ executable"), "melody.mid", "download"),
    /signature/i,
  );
  assert.doesNotThrow(() => validateFileBytes(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    "cover.png",
    "cover",
  ));
});

test("tag parsing is deterministic and bounded", () => {
  assert.deepEqual(parseTags([" Trap ", "trap", "808"]), ["trap", "808"]);
  assert.throws(() => parseTags(Array.from({ length: 13 }, (_, index) => `tag-${index}`)), /tags/i);
});

test("slugifyResource produces stable Spanish-safe slugs", () => {
  assert.equal(slugifyResource("Plantilla Ñ: Trap 2026"), "plantilla-n-trap-2026");
  assert.equal(slugifyResource("  ÁCIDO / 808  "), "acido-808");
});
