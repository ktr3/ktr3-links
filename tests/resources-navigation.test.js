import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);

test("Ktr3OS exposes producer resources from folders, Spotlight, terminal and context menu", async () => {
  const source = await readFile(pagePath, "utf8");
  assert.match(source, /Recursos para productores/);
  assert.match(source, /href: "\/recursos"/);
  assert.match(source, /resources\s+- Recursos para productores/);
  assert.match(source, /action: "resources"/);
  assert.match(source, /case "resources": window\.location\.href = "\/recursos"/);
});

test("site metadata describes the producer resource library", async () => {
  const source = await readFile(layoutPath, "utf8");
  assert.match(source, /presets de Serum, MIDI, plantillas/i);
});
