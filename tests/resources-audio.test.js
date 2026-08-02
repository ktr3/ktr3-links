import assert from "node:assert/strict";
import test from "node:test";

import { createKtr3NeonImpact, encodeMonoWav } from "../lib/resources/audio.js";
import { parseResourceInput, validateFileBytes } from "../lib/resources/schema.js";

test("original KTR3 one-shot produces valid isolated and preview WAV files", () => {
  const audio = createKtr3NeonImpact();

  assert.equal(audio.sampleRate, 44_100);
  assert.ok(audio.download.length > 100_000);
  assert.ok(audio.preview.length > audio.download.length * 3);
  assert.doesNotThrow(() => validateFileBytes(audio.download, "oneshot.wav", "download"));
  assert.doesNotThrow(() => validateFileBytes(audio.preview, "preview.wav", "preview"));
  assert.notDeepEqual(audio.download, audio.preview);
});

test("one-shot is a first-class resource category", () => {
  const resource = parseResourceInput({
    title: "KTR3 Neon Impact",
    summary: "One-shot original para drops y transiciones.",
    description: "Archivo WAV aislado con preview de audio separada.",
    category: "oneshot",
    accessModel: "email",
    tags: "one-shot, impact",
  });

  assert.equal(resource.category, "oneshot");
});

test("WAV encoder rejects invalid sample buffers and rates", () => {
  assert.throws(() => encodeMonoWav([]), /Float32Array/);
  assert.throws(() => encodeMonoWav(new Float32Array([0]), 100), /sample rate/i);
});
