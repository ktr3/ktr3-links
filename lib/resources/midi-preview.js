export const MIDI_PREVIEW_SAMPLE_RATE = 22_050;
export const MIDI_PREVIEW_MAX_SECONDS = 15;

export const MIDI_PREVIEW_MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_MIDI_EVENTS = 200_000;
const MAX_PREVIEW_NOTES = 192;
const DEFAULT_BPM = 120;

function requireRange(buffer, offset, length, label) {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`Truncated MIDI ${label}`);
  }
}

function readVariableLength(buffer, state, end) {
  let value = 0;
  for (let count = 0; count < 4; count += 1) {
    if (state.offset >= end) throw new Error("Truncated MIDI variable length");
    const byte = buffer[state.offset];
    state.offset += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error("Invalid MIDI variable length");
}

function parseTrack(buffer, start, end, trackIndex, budget) {
  const state = { offset: start };
  const notes = [];
  const tempos = [];
  const active = new Map();
  let runningStatus = null;
  let tick = 0;

  const takeDataByte = () => {
    if (state.offset >= end) throw new Error("Truncated MIDI event");
    const value = buffer[state.offset];
    state.offset += 1;
    if (value >= 0x80) throw new Error("Invalid MIDI channel data");
    return value;
  };

  while (state.offset < end) {
    budget.count += 1;
    if (budget.count > MAX_MIDI_EVENTS) throw new Error("MIDI contains too many events");
    tick += readVariableLength(buffer, state, end);

    let status = buffer[state.offset];
    if (status >= 0x80) {
      state.offset += 1;
      if (status < 0xf0) runningStatus = status;
    } else if (runningStatus !== null) {
      status = runningStatus;
    } else {
      throw new Error("MIDI running status has no previous channel event");
    }

    if (status === 0xff) {
      runningStatus = null;
      if (state.offset >= end) throw new Error("Truncated MIDI meta event");
      const type = buffer[state.offset];
      state.offset += 1;
      const length = readVariableLength(buffer, state, end);
      requireRange(buffer, state.offset, length, "meta event");
      const payloadStart = state.offset;
      state.offset += length;
      if (type === 0x2f) break;
      if (type === 0x51 && length === 3) {
        const microseconds =
          (buffer[payloadStart] << 16)
          | (buffer[payloadStart + 1] << 8)
          | buffer[payloadStart + 2];
        if (microseconds > 0) tempos.push({ tick, bpm: 60_000_000 / microseconds });
      }
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      runningStatus = null;
      const length = readVariableLength(buffer, state, end);
      requireRange(buffer, state.offset, length, "SysEx event");
      state.offset += length;
      continue;
    }
    if (status >= 0xf0) throw new Error("Unsupported MIDI system event");

    const eventType = status & 0xf0;
    const channel = status & 0x0f;
    const first = takeDataByte();
    const second = eventType === 0xc0 || eventType === 0xd0 ? null : takeDataByte();
    if (eventType !== 0x80 && eventType !== 0x90) continue;

    const pitch = first;
    const key = `${channel}:${pitch}`;
    const isNoteOn = eventType === 0x90 && second > 0;
    if (isNoteOn) {
      const stack = active.get(key) || [];
      stack.push({ channel, pitch, startTick: tick, velocity: second, track: trackIndex });
      active.set(key, stack);
      continue;
    }

    const stack = active.get(key);
    if (!stack?.length) continue;
    const started = stack.shift();
    if (!stack.length) active.delete(key);
    notes.push({ ...started, durationTicks: Math.max(1, tick - started.startTick) });
  }

  return { notes, tempos };
}

function parseMidi(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (!buffer.length || buffer.length > MIDI_PREVIEW_MAX_INPUT_BYTES) {
    throw new Error("MIDI size is outside the automatic preview limit");
  }
  requireRange(buffer, 0, 4, "header signature");
  if (buffer.toString("ascii", 0, 4) !== "MThd") {
    throw new Error("MIDI header MThd was not found");
  }
  requireRange(buffer, 0, 14, "header");
  const headerLength = buffer.readUInt32BE(4);
  if (headerLength < 6) throw new Error("Invalid MIDI header length");
  requireRange(buffer, 8, headerLength, "header");

  const trackCount = buffer.readUInt16BE(10);
  const division = buffer.readUInt16BE(12);
  if (!trackCount || trackCount > 256) throw new Error("Invalid MIDI track count");
  if ((division & 0x8000) !== 0) throw new Error("SMPTE MIDI timing is not supported");
  if (!division) throw new Error("MIDI ticks-per-quarter cannot be zero");

  const notes = [];
  const tempos = [];
  const budget = { count: 0 };
  let offset = 8 + headerLength;
  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    requireRange(buffer, offset, 8, "track header");
    if (buffer.toString("ascii", offset, offset + 4) !== "MTrk") {
      throw new Error(`MIDI track ${trackIndex} is missing MTrk`);
    }
    const length = buffer.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    requireRange(buffer, start, length, `track ${trackIndex}`);
    const parsed = parseTrack(buffer, start, end, trackIndex, budget);
    notes.push(...parsed.notes);
    tempos.push(...parsed.tempos);
    offset = end;
  }

  notes.sort((left, right) => (
    left.startTick - right.startTick
    || left.pitch - right.pitch
    || left.track - right.track
  ));
  tempos.sort((left, right) => left.tick - right.tick);
  return { notes, tempos, ticksPerQuarter: division };
}

function createTickToSeconds(tempos, ticksPerQuarter) {
  const changes = tempos.length ? tempos : [{ tick: 0, bpm: DEFAULT_BPM }];
  return (targetTick) => {
    let bpm = DEFAULT_BPM;
    let seconds = 0;
    let previousTick = 0;
    for (const change of changes) {
      if (change.tick > targetTick) break;
      if (change.tick > previousTick) {
        seconds += ((change.tick - previousTick) / ticksPerQuarter) * (60 / bpm);
        previousTick = change.tick;
      }
      bpm = change.bpm;
    }
    seconds += ((targetTick - previousTick) / ticksPerQuarter) * (60 / bpm);
    return seconds;
  };
}

function previewNotes(document) {
  const melodic = document.notes.filter((note) => note.channel !== 9);
  if (!melodic.length) throw new Error("MIDI preview requires melodic notes");

  const tickToSeconds = createTickToSeconds(document.tempos, document.ticksPerQuarter);
  const originSeconds = tickToSeconds(melodic[0].startTick);
  const result = [];
  for (const note of melodic) {
    const start = Math.max(0, tickToSeconds(note.startTick) - originSeconds);
    if (start >= MIDI_PREVIEW_MAX_SECONDS - 0.05) break;
    const naturalDuration = tickToSeconds(note.startTick + note.durationTicks)
      - tickToSeconds(note.startTick);
    result.push({
      pitch: note.pitch,
      start,
      duration: Math.min(
        2,
        MIDI_PREVIEW_MAX_SECONDS - start,
        Math.max(0.04, naturalDuration),
      ),
      velocity: note.velocity,
    });
    if (result.length >= MAX_PREVIEW_NOTES) break;
  }
  if (!result.length) throw new Error("MIDI preview has no notes inside its time limit");
  return result;
}

function renderSamples(notes) {
  const releaseSeconds = 0.06;
  const finalEnd = Math.max(...notes.map((note) => note.start + note.duration + releaseSeconds));
  const durationSeconds = Math.min(MIDI_PREVIEW_MAX_SECONDS, Math.max(0.5, finalEnd));
  const frameCount = Math.max(1, Math.floor(durationSeconds * MIDI_PREVIEW_SAMPLE_RATE));
  const samples = new Float32Array(frameCount);

  for (const note of notes) {
    const frequency = Math.min(
      MIDI_PREVIEW_SAMPLE_RATE * 0.45,
      440 * (2 ** ((note.pitch - 69) / 12)),
    );
    const startFrame = Math.max(0, Math.floor(note.start * MIDI_PREVIEW_SAMPLE_RATE));
    const endFrame = Math.min(
      frameCount,
      Math.ceil((note.start + note.duration + releaseSeconds) * MIDI_PREVIEW_SAMPLE_RATE),
    );
    const velocityGain = 0.12 + (Math.max(1, Math.min(127, note.velocity)) / 127) * 0.18;
    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const elapsed = (frame - startFrame) / MIDI_PREVIEW_SAMPLE_RATE;
      const phase = (elapsed * frequency) % 1;
      const square = phase < 0.5 ? 1 : -1;
      const triangle = 1 - 4 * Math.abs(phase - 0.5);
      const attack = Math.min(1, elapsed / 0.006);
      const release = elapsed <= note.duration
        ? 1
        : Math.max(0, 1 - (elapsed - note.duration) / releaseSeconds);
      samples[frame] += (square * 0.78 + triangle * 0.22) * velocityGain * attack * release;
    }
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0 ? Math.min(1, 0.86 / peak) : 1;
  return { samples, gain, durationSeconds: frameCount / MIDI_PREVIEW_SAMPLE_RATE };
}

function encodeUnsigned8BitMonoWav(samples, gain) {
  const headerBytes = 44;
  const bytes = Buffer.alloc(headerBytes + samples.length, 128);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8, "ascii");
  bytes.write("fmt ", 12, "ascii");
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(MIDI_PREVIEW_SAMPLE_RATE, 24);
  bytes.writeUInt32LE(MIDI_PREVIEW_SAMPLE_RATE, 28);
  bytes.writeUInt16LE(1, 32);
  bytes.writeUInt16LE(8, 34);
  bytes.write("data", 36, "ascii");
  bytes.writeUInt32LE(samples.length, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] * gain));
    bytes[headerBytes + index] = Math.max(0, Math.min(255, Math.round(128 + sample * 127)));
  }
  return bytes;
}

export function createMidiChiptunePreview(input) {
  const document = parseMidi(input);
  const notes = previewNotes(document);
  const rendered = renderSamples(notes);
  return {
    bytes: encodeUnsigned8BitMonoWav(rendered.samples, rendered.gain),
    durationSeconds: rendered.durationSeconds,
    noteCount: notes.length,
  };
}
