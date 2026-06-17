/* Microphone tuner DSP: autocorrelation pitch detection + note math.
 * Pure functions (no Web Audio) so they're testable in isolation; the hook in
 * components/playground/Tuner.tsx feeds them time-domain samples. */

import { NOTE_NAMES_SHARP } from './music';

/* Autocorrelation pitch detector (the canonical ACF approach): trims quiet
 * edges, computes the autocorrelation, finds the first strong peak after the
 * initial dip, and refines it with parabolic interpolation. Returns Hz, or -1
 * when the signal is too quiet / no clear pitch. */
export function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return -1; // too quiet to be a real note

  let r1 = 0;
  let r2 = n - 1;
  const thres = 0.2;
  for (let i = 0; i < n / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < n / 2; i++) if (Math.abs(buf[n - i]) < thres) { r2 = n - i; break; }

  const trimmed = buf.slice(r1, r2);
  const size = trimmed.length;
  const c = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) c[i] += trimmed[j] * trimmed[j + i];
  }

  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return -1;

  let t0 = maxpos;
  const x1 = c[t0 - 1];
  const x2 = c[t0];
  const x3 = c[t0 + 1] ?? c[t0];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) t0 = t0 - b / (2 * a);

  return sampleRate / t0;
}

export type DetectedNote = {
  freq: number;
  midi: number;
  name: string;   // e.g. "A"
  octave: number; // e.g. 4
  cents: number;  // -50..+50, signed offset from the nearest note
};

/* Frequency → nearest equal-tempered note + cents offset (A4 = 440Hz). */
export function freqToNote(freq: number): DetectedNote {
  const noteNum = 12 * Math.log2(freq / 440) + 69; // MIDI, A4 = 69
  const midi = Math.round(noteNum);
  const cents = Math.round((noteNum - midi) * 100);
  const name = NOTE_NAMES_SHARP[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { freq, midi, name, octave, cents };
}

/* Standard guitar tuning targets (low → high), used for the per-string guide. */
export const GUITAR_STRINGS: { label: string; midi: number; freq: number }[] = [
  { label: 'E', midi: 40, freq: 82.41 },
  { label: 'A', midi: 45, freq: 110.0 },
  { label: 'D', midi: 50, freq: 146.83 },
  { label: 'G', midi: 55, freq: 196.0 },
  { label: 'B', midi: 59, freq: 246.94 },
  { label: 'e', midi: 64, freq: 329.63 },
];
