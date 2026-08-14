import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(new URL("../scripts/seed-thx-bass-preset.mjs", import.meta.url), "utf8");

test("THX Bass release is pinned to the technically approved owned preset", () => {
  assert.match(script, /THX_BASS_PRESET_PATH/);
  assert.match(script, /788083bb31aaac013f5ca24b033778f007af9b6169eb88a8c104cf66395503da/);
  assert.match(script, /hash does not match the technically approved release file/);
});

test("THX Bass release is idempotent and published as a Serum email resource", () => {
  assert.match(script, /where slug = \$\{SLUG\} limit 1/);
  assert.match(script, /'serum'.*'published', 'email'/s);
  assert.match(script, /Creación original de KTR3/);
  assert.match(script, /no es un producto oficial ni está afiliado con ningún artista/);
});
