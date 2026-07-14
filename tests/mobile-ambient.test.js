import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/underground/page.js", import.meta.url);
const cssPath = new URL("../app/underground/Underground.module.css", import.meta.url);

test("mobile hides the toy dock while lightweight ambient glints remain", async () => {
  const [page, css] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(page, /className="ug-ambient-glints"/);
  assert.equal((page.match(/className="ug-glint-field ug-glint-field-/g) || []).length, 4);
  const ambientCss = css.split("/* Dense ambient glint fields")[1];
  assert.ok(ambientCss, "dense ambient glint CSS marker is missing");
  assert.ok(
    (ambientCss.match(/radial-gradient\(/g) || []).length >= 40,
    "the background should contain at least forty visible glints",
  );
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.ug-toy-dock\)[\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /@keyframes ugAmbientTwinkle[\s\S]*?transform:/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ug-ambient-glints i\)[\s\S]*?animation:\s*none\s*!important/);
});
