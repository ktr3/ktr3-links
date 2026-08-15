import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(new URL("../scripts/seed-vocal-preset.mjs", import.meta.url), "utf8");

test("vocal preset release is pinned to the approved FL Studio state", () => {
  assert.match(script, /VOCAL_PRESET_PATH/);
  assert.match(script, /d9c2760c8afcb5fa7c296fbaf74d92d026c07c153e409836b68e3788a7409cb7/);
  assert.match(script, /hash does not match the approved release file/);
  assert.match(script, /Vocal Preset Free plugins @ktr3ss\.fst/);
});

test("vocal preset is idempotent, email-delivered and honest about dependencies", () => {
  assert.match(script, /where slug = \$\{SLUG\} limit 1/);
  assert.match(script, /'template'.*'published', 'email'/s);
  assert.match(script, /FL Studio 25\.2\.5/);
  assert.match(script, /Fruity Limiter/);
  assert.match(script, /Fruity Blood Overdrive/);
  assert.match(script, /OTT/);
  assert.match(script, /Fresh Air/);
  assert.match(script, /gratuitos, pero deben instalarse por separado/);
});
