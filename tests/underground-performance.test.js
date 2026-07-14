import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cssPath = new URL("../app/underground/Underground.module.css", import.meta.url);

test("the final Underground cascade contains the scroll performance guard", async () => {
  const css = await readFile(cssPath, "utf8");
  const marker = "/* GZK scroll performance guard */";
  const guard = css.split(marker)[1];

  assert.ok(guard, "missing the documented final performance guard");
  for (const selector of [".ug-browser", ".ug-role-tabs", ".ug-panel", ".ug-summary", ".ug-toy-dock"]) {
    assert.match(guard, new RegExp(selector.replace(".", "\\.")));
  }
  assert.match(guard, /backdrop-filter:\s*none\s*!important/);
  assert.match(guard, /animation:\s*none\s*!important/);
  assert.doesNotMatch(guard, /\.ug-radio-bars/);
});
