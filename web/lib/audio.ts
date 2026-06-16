/* Additive piano voice + procedural convolution reverb.
 * Each note is a stack of sine partials following a piano-ish spectrum, with
 * slight inharmonicity, per-partial decay, and a brief filtered noise burst
 * to suggest the hammer strike. Voices are summed into a master bus that
 * splits into a dry path and a convolution-reverb send. Settings come from
 * the zustand store and are re-read on each play. */

import { useAppStore, AUDIO_DEFAULTS } from './store';

const num = (v: unknown, fallback: number, lo = -Infinity, hi = Infinity) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let reverbSec = -1;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    type W = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext || (window as W).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function ensureGraph(c: AudioContext) {
  if (master) return;
  master = c.createGain();
  master.connect(c.destination);
  dry = c.createGain();
  wet = c.createGain();
  reverb = c.createConvolver();
  dry.connect(master);
  reverb.connect(wet);
  wet.connect(master);
}

/* Procedural impulse response: exponentially decaying stereo noise with a
 * gentle low-pass curve baked into the envelope shape. Cheap and surprisingly
 * convincing for a small room → hall depending on the duration. */
function buildIR(c: AudioContext, seconds: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.max(1, Math.floor(sr * seconds));
  const ir = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, 2.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return ir;
}

function readSettings() {
  const s = useAppStore.getState();
  return {
    volume:      num(s.audioVolume,      AUDIO_DEFAULTS.audioVolume,      0,    1),
    sustain:     num(s.audioSustain,     AUDIO_DEFAULTS.audioSustain,     0.1,  5),
    brightness:  num(s.audioBrightness,  AUDIO_DEFAULTS.audioBrightness,  0,    1),
    reverb:      num(s.audioReverb,      AUDIO_DEFAULTS.audioReverb,      0,    1),
    reverbSize:  num(s.audioReverbSize,  AUDIO_DEFAULTS.audioReverbSize,  0.1,  8),
  };
}

function applySettings(c: AudioContext) {
  ensureGraph(c);
  const s = readSettings();
  if (master) master.gain.value = s.volume;
  if (dry) dry.gain.value = 1;
  if (wet) wet.gain.value = s.reverb;
  if (reverb && Math.abs(s.reverbSize - reverbSec) > 0.01) {
    reverb.buffer = buildIR(c, s.reverbSize);
    reverbSec = s.reverbSize;
  }
}

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function playNote(midi: number, opts: { duration?: number; gain?: number; when?: number } = {}) {
  const c = getCtx();
  if (!c) return;
  applySettings(c);
  const s = readSettings();
  const baseGain = opts.gain ?? 0.16;
  const baseDur = opts.duration ?? 2.6;
  const dur = baseDur * s.sustain;
  const start = c.currentTime + (opts.when ?? 0);
  const f0 = midiToFreq(midi);

  const voice = c.createGain();
  voice.gain.value = 1;
  if (dry) voice.connect(dry);
  if (reverb) voice.connect(reverb);

  /* Inharmonicity: real piano partials are slightly sharper than n × f0. The
   * coefficient grows with pitch because shorter strings are stiffer. */
  const B = 0.0003 + Math.max(0, midi - 48) * 0.00003;
  const bright = s.brightness;

  const spectrum: { n: number; amp: number; decay: number }[] = [
    { n: 1, amp: 1.00, decay: 1.00 },
    { n: 2, amp: 0.50, decay: 0.85 },
    { n: 3, amp: 0.30, decay: 0.70 },
    { n: 4, amp: 0.18, decay: 0.58 },
    { n: 5, amp: 0.12 * (0.5 + bright),       decay: 0.48 },
    { n: 6, amp: 0.09 * (0.4 + bright * 1.2), decay: 0.40 },
    { n: 7, amp: 0.06 * (0.3 + bright * 1.4), decay: 0.34 },
    { n: 8, amp: 0.04 * (0.25 + bright * 1.5), decay: 0.28 },
  ];

  for (const p of spectrum) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = p.n * f0 * Math.sqrt(1 + B * p.n * p.n);
    const g = c.createGain();
    const partialDur = dur * p.decay;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(p.amp * baseGain, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, start + partialDur);
    osc.connect(g);
    g.connect(voice);
    osc.start(start);
    osc.stop(start + partialDur + 0.02);
  }

  /* Hammer-strike noise: brief band-limited burst centred several octaves
   * above the fundamental. Adds the percussive attack a sine stack lacks. */
  const noiseLen = Math.floor(c.sampleRate * 0.025);
  const buf = c.createBuffer(1, noiseLen, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = Math.min(8000, f0 * 5);
  filter.Q.value = 0.6;
  const ng = c.createGain();
  ng.gain.value = 0.06 * baseGain;
  noise.connect(filter);
  filter.connect(ng);
  ng.connect(voice);
  noise.start(start);
}

export function playChord(midis: number[], opts: { duration?: number } = {}) {
  const duration = opts.duration ?? 3.0;
  midis.forEach(m => playNote(m, { duration, gain: 0.13 }));
}

export type GuitarTone = 'acoustic' | 'electric';

/* Karplus-Strong plucked string: a circular noise buffer averaged with its
 * neighbour and attenuated each loop. Cheap, convincing, dependency-free. */
function playGuitarVoice(
  c: AudioContext,
  midi: number,
  opts: { duration: number; gain: number; when: number; tone: GuitarTone },
) {
  const sr = c.sampleRate;
  const f0 = midiToFreq(midi);
  const n = Math.max(2, Math.round(sr / f0));
  const totalSamples = Math.floor(sr * opts.duration);

  const ks = new Float32Array(n);
  for (let i = 0; i < n; i++) ks[i] = Math.random() * 2 - 1;

  /* Damping controls decay: lower = shorter, "drier" pluck (acoustic);
   * higher = longer sustain (electric). */
  const damping = opts.tone === 'electric' ? 0.997 : 0.993;

  const buf = c.createBuffer(1, totalSamples, sr);
  const data = buf.getChannelData(0);
  let idx = 0;
  for (let i = 0; i < totalSamples; i++) {
    const cur = ks[idx];
    const next = (cur + ks[(idx + 1) % n]) * 0.5 * damping;
    data[i] = cur;
    ks[idx] = next;
    idx = (idx + 1) % n;
  }

  const src = c.createBufferSource();
  src.buffer = buf;

  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime + opts.when);
  g.gain.linearRampToValueAtTime(opts.gain, c.currentTime + opts.when + 0.005);
  src.connect(g);

  let tail: AudioNode = g;

  if (opts.tone === 'electric') {
    /* Mild asymmetric saturation + bandpass to suggest pickup colouration. */
    const shaper = c.createWaveShaper();
    shaper.curve = makeDistortionCurve(35);
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1600;
    band.Q.value = 0.8;
    g.connect(shaper);
    shaper.connect(band);
    tail = band;
  } else {
    /* Acoustic: gentle lowpass to soften brightness, narrow body resonance. */
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    lp.Q.value = 0.6;
    const body = c.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 220;
    body.gain.value = 3;
    body.Q.value = 1.2;
    g.connect(lp);
    lp.connect(body);
    tail = body;
  }

  if (dry) tail.connect(dry);
  if (reverb) tail.connect(reverb);

  const start = c.currentTime + opts.when;
  src.start(start);
  src.stop(start + opts.duration + 0.05);
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const buf = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buf);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

/* Plays the supplied MIDIs as a guitar chord with a light low→high strum.
 * `midis` should already be ordered low→high (the voicing generator does this
 * naturally by walking strings low E → high e). */
export function playGuitarChord(
  midis: number[],
  opts: { tone?: GuitarTone; duration?: number; strumMs?: number } = {},
) {
  const c = getCtx();
  if (!c) return;
  applySettings(c);
  const s = readSettings();
  const tone = opts.tone ?? 'acoustic';
  const duration = (opts.duration ?? 2.5) * s.sustain;
  const strum = (opts.strumMs ?? 12) / 1000;
  midis.forEach((m, i) => {
    playGuitarVoice(c, m, { duration, gain: 0.1, when: i * strum, tone });
  });
}

export function playSequence(midis: number[], opts: { gap?: number; duration?: number } = {}) {
  const gap = opts.gap ?? 0.18;
  const duration = opts.duration ?? 1.0;
  midis.forEach((m, i) => playNote(m, { duration, gain: 0.18, when: i * gap }));
}

export function midisFor(rootPc: number, intervals: number[]): number[] {
  const baseMidi = 60 + rootPc;
  return intervals.map(i => baseMidi + i);
}

/* ===== Metronome ===== */

/* Current audio-clock time, the reference for sample-accurate scheduling. */
export function audioCurrentTime(): number {
  const c = getCtx();
  return c ? c.currentTime : 0;
}

/* Schedule a single dry metronome click `when` seconds from now. The accented
 * downbeat is pitched higher and louder. Routed through the master bus (so it
 * follows the volume setting) but NOT the reverb send — a click wants to stay
 * crisp. A sine ping with a fast exponential decay reads as a clean tick. */
export function scheduleClick(when: number, accent: boolean) {
  const c = getCtx();
  if (!c) return;
  applySettings(c);
  const t = c.currentTime + Math.max(0, when);
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = accent ? 1850 : 1300;
  const g = c.createGain();
  const peak = accent ? 0.5 : 0.32;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  osc.connect(g);
  g.connect(master ?? c.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}
