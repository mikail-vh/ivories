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

export function playSequence(midis: number[], opts: { gap?: number; duration?: number } = {}) {
  const gap = opts.gap ?? 0.18;
  const duration = opts.duration ?? 1.0;
  midis.forEach((m, i) => playNote(m, { duration, gain: 0.18, when: i * gap }));
}

export function midisFor(rootPc: number, intervals: number[]): number[] {
  const baseMidi = 60 + rootPc;
  return intervals.map(i => baseMidi + i);
}
