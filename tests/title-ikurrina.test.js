import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/underground/page.js", import.meta.url);
const cssPath = new URL("../app/underground/Underground.module.css", import.meta.url);

test("GIPUZKOAKO uses the requested Ikurriña color sequence", async () => {
  const [page, css] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(page, />GIP<\/b><b className="ug-title-green"[^>]*>UZKO<\/b><b className="ug-title-white"[^>]*>AKO<\/b>/);
  assert.match(css, /\.ug-title-red\)[\s\S]*?#da291c/);
  assert.match(css, /\.ug-title-green\)[\s\S]*?#009a44/);
  assert.match(css, /\.ug-title-white\)[\s\S]*?#ffffff/);
});
