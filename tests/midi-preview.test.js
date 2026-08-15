import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createMidiChiptunePreview,
  MIDI_PREVIEW_MAX_SECONDS,
  MIDI_PREVIEW_SAMPLE_RATE,
} from "../lib/resources/midi-preview.js";
import { encodeMidi } from "../tools/midi-lab/src/smf.mjs";
import { resetResourceStorageForTests } from "../lib/resources/storage/index.js";
import { storeGeneratedMidiPreview } from "../lib/resources/store-upload.js";

const MELODY = [
  { pitch: 60, startTick: 0, durationTicks: 480, velocity: 100, channel: 0 },
  { pitch: 64, startTick: 480, durationTicks: 480, velocity: 92, channel: 0 },
  { pitch: 67, startTick: 960, durationTicks: 960, velocity: 108, channel: 0 },
];

function readWavHeader(bytes) {
  return {
    riff: bytes.toString("ascii", 0, 4),
    wave: bytes.toString("ascii", 8, 12),
    audioFormat: bytes.readUInt16LE(20),
    channels: bytes.readUInt16LE(22),
    sampleRate: bytes.readUInt32LE(24),
    bitsPerSample: bytes.readUInt16LE(34),
    data: bytes.toString("ascii", 36, 40),
    dataBytes: bytes.readUInt32LE(40),
  };
}

test("MIDI preview renders deterministic compact 8-bit mono PCM", () => {
  const midi = encodeMidi({ bpm: 130, notes: MELODY, ticksPerQuarter: 480 });
  const first = createMidiChiptunePreview(midi);
  const second = createMidiChiptunePreview(midi);
  const header = readWavHeader(first.bytes);

  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(header.riff, "RIFF");
  assert.equal(header.wave, "WAVE");
  assert.equal(header.audioFormat, 1);
  assert.equal(header.channels, 1);
  assert.equal(header.sampleRate, MIDI_PREVIEW_SAMPLE_RATE);
  assert.equal(header.bitsPerSample, 8);
  assert.equal(header.data, "data");
  assert.equal(header.dataBytes, first.bytes.length - 44);
  assert.equal(first.noteCount, MELODY.length);
  assert.ok(first.durationSeconds > 0);
  assert.ok(first.durationSeconds <= MIDI_PREVIEW_MAX_SECONDS);
  assert.ok(first.bytes.length <= 44 + MIDI_PREVIEW_SAMPLE_RATE * MIDI_PREVIEW_MAX_SECONDS);
});

test("MIDI preview ignores percussion and refuses files without melodic notes", () => {
  const mixed = encodeMidi({
    notes: [
      { ...MELODY[0], channel: 9, pitch: 36 },
      MELODY[1],
    ],
  });
  assert.equal(createMidiChiptunePreview(mixed).noteCount, 1);

  const percussionOnly = encodeMidi({
    notes: [{ ...MELODY[0], channel: 9, pitch: 36 }],
  });
  assert.throws(
    () => createMidiChiptunePreview(percussionOnly),
    /melodic notes/i,
  );
});

test("MIDI preview rejects malformed input instead of emitting audio", () => {
  assert.throws(
    () => createMidiChiptunePreview(Buffer.from("not a midi")),
    /MThd|MIDI/i,
  );
});

test("generated MIDI preview is stored as a validated private preview asset", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ktr3-midi-preview-"));
  const previousPath = process.env.RESOURCE_STORAGE_PATH;
  process.env.RESOURCE_STORAGE_PATH = directory;
  resetResourceStorageForTests();

  try {
    const midi = encodeMidi({ bpm: 130, notes: MELODY, ticksPerQuarter: 480 });
    const file = new File([midi], "KTR3-Lucid.mid", { type: "audio/midi" });
    const stored = await storeGeneratedMidiPreview("resource-id", file);
    const bytes = await readFile(path.join(directory, ...stored.storageKey.split("/")));

    assert.equal(stored.kind, "preview");
    assert.equal(stored.mimeType, "audio/wav");
    assert.equal(stored.originalName, "KTR3-MIDI-Auto-Preview-8bit.wav");
    assert.equal(stored.sizeBytes, bytes.length);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  } finally {
    resetResourceStorageForTests();
    if (previousPath === undefined) delete process.env.RESOURCE_STORAGE_PATH;
    else process.env.RESOURCE_STORAGE_PATH = previousPath;
    await rm(directory, { recursive: true, force: true });
  }
});
