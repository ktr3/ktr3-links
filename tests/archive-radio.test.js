import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/underground/page.js", import.meta.url);

test("the KTR3 archive avoids the YouTube embed login wall", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.doesNotMatch(source, /youtube(?:-nocookie)?\.com\/embed\/ZiaWoMIkOTs/);
  assert.doesNotMatch(source, /archiveRadioOpen/);
  assert.match(source, /href="https:\/\/youtu\.be\/ZiaWoMIkOTs\?t=20983"/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /loading="lazy"/);
  assert.doesNotMatch(source, /Una emisión recuperada del archivo personal de KTR3\./);
});
