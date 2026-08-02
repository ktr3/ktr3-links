const DEFAULT_SAMPLE_RATE = 44_100;

function clampSample(value) {
  return Math.max(-1, Math.min(1, value));
}

export function encodeMonoWav(samples, sampleRate = DEFAULT_SAMPLE_RATE) {
  if (!(samples instanceof Float32Array) || samples.length === 0) {
    throw new Error("WAV encoding requires a non-empty Float32Array");
  }
  if (!Number.isInteger(sampleRate) || sampleRate < 8_000 || sampleRate > 192_000) {
    throw new Error("WAV sample rate is outside the supported range");
  }

  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const wav = Buffer.alloc(44 + dataLength);

  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataLength, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clampSample(samples[index]);
    wav.writeInt16LE(Math.round(sample * (sample < 0 ? 32_768 : 32_767)), 44 + index * 2);
  }

  return wav;
}

function createDeterministicNoise() {
  let state = 0x4b545233;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function synthesizeNeonImpact(sampleRate) {
  const duration = 1.35;
  const samples = new Float32Array(Math.floor(sampleRate * duration));
  const random = createDeterministicNoise();
  let phase = 0;
  let filteredNoise = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const frequency = 44 + 205 * Math.exp(-time * 18);
    phase += (Math.PI * 2 * frequency) / sampleRate;

    const noise = random() * 2 - 1;
    filteredNoise += (noise - filteredNoise) * 0.08;
    const bodyEnvelope = Math.exp(-time * 3.7);
    const body = (
      Math.sin(phase)
      + 0.32 * Math.sin(phase * 2.01)
      + 0.12 * Math.sin(phase * 3.97)
    ) * bodyEnvelope;
    const click = noise * Math.exp(-time * 92) * 0.78;
    const texture = filteredNoise * Math.exp(-time * 8) * 0.18;
    const endFade = Math.min(1, Math.max(0, (duration - time) / 0.08));

    samples[index] = Math.tanh((body + click + texture) * 1.55) * 0.82 * endFade;
  }

  return samples;
}

function createAuditionSequence(oneShot, sampleRate) {
  const duration = 4.6;
  const preview = new Float32Array(Math.floor(sampleRate * duration));
  const hits = [
    { time: 0.25, gain: 0.95 },
    { time: 1.25, gain: 0.72 },
    { time: 2.0, gain: 0.88 },
    { time: 3.15, gain: 1 },
  ];

  for (const hit of hits) {
    const offset = Math.floor(hit.time * sampleRate);
    for (let index = 0; index < oneShot.length && offset + index < preview.length; index += 1) {
      preview[offset + index] += oneShot[index] * hit.gain;
      const echoIndex = offset + index + Math.floor(sampleRate * 0.19);
      if (echoIndex < preview.length) preview[echoIndex] += oneShot[index] * hit.gain * 0.14;
    }
  }

  let peak = 0;
  for (const sample of preview) peak = Math.max(peak, Math.abs(sample));
  const normalization = peak > 0.96 ? 0.96 / peak : 1;
  for (let index = 0; index < preview.length; index += 1) {
    preview[index] *= normalization;
  }

  return preview;
}

export function createKtr3NeonImpact(sampleRate = DEFAULT_SAMPLE_RATE) {
  const oneShot = synthesizeNeonImpact(sampleRate);
  const preview = createAuditionSequence(oneShot, sampleRate);

  return {
    download: encodeMonoWav(oneShot, sampleRate),
    preview: encodeMonoWav(preview, sampleRate),
    sampleRate,
  };
}
