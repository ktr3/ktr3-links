import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.js", import.meta.url);

test("Sobre Ktr3 contains only the requested biography, styles and tools", async () => {
  const source = await readFile(pagePath, "utf8");
  const aboutBlock = source.match(/const ABOUT_CONTENT = \{[\s\S]*?\n\};/)?.[0];

  assert.ok(aboutBlock, "ABOUT_CONTENT block is missing");
  assert.match(aboutBlock, /bio: "Productor musical especializado en Trap y Hip Hop\."/);
  assert.match(aboutBlock, /skills: \["Trap", "Hip Hop", "Mixing", "Sound Design"\]/);
  assert.match(aboutBlock, /tools: \["FL Studio", "Pro Tools"\]/);
  assert.doesNotMatch(aboutBlock, /R&B|Serum|Omnisphere|Creando beats desde el estudio/);
});
