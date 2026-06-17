'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { autoCorrelate, freqToNote, GUITAR_STRINGS } from '@/lib/tuner';

type TunerState = {
  listening: boolean;
  note: string | null;   // e.g. "A4"
  noteName: string | null;
  cents: number;
  freq: number;
  midi: number | null;
  error: string | null;
};

const INITIAL: TunerState = { listening: false, note: null, noteName: null, cents: 0, freq: 0, midi: null, error: null };

function useTuner() {
  const [state, setState] = useState<TunerState>(INITIAL);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef({ note: '', cents: 999 });

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setState((s) => ({ ...s, listening: false }));
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      type W = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext || (window as W).webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      setState((s) => ({ ...s, listening: true, error: null }));

      const loop = () => {
        analyser.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, ctx.sampleRate);
        if (freq > 0) {
          const n = freqToNote(freq);
          const label = `${n.name}${n.octave}`;
          /* Only re-render when the displayed value actually changes. */
          if (label !== lastRef.current.note || n.cents !== lastRef.current.cents) {
            lastRef.current = { note: label, cents: n.cents };
            setState((s) => ({ ...s, freq, note: label, noteName: n.name, cents: n.cents, midi: n.midi }));
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      setState((s) => ({
        ...s,
        listening: false,
        error: name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access was blocked. Allow it in your browser to tune.'
          : 'Couldn’t access a microphone on this device.',
      }));
    }
  }, []);

  useEffect(() => () => stop(), [stop]);
  return { ...state, start, stop };
}

export function Tuner() {
  const t = useTuner();
  const inTune = t.note !== null && Math.abs(t.cents) <= 5;
  /* Clamp the needle to the dial's range. */
  const needle = Math.max(-50, Math.min(50, t.cents));

  return (
    <div className="tuner">
      <div className={`tuner-readout ${t.note ? (inTune ? 'in-tune' : 'off') : 'idle'}`}>
        <span className="tuner-note">{t.noteName ?? '—'}</span>
        <span className="tuner-oct">{t.note ? t.note.slice(t.noteName?.length ?? 1) : ''}</span>
      </div>

      <div className="tuner-meter" aria-hidden="true">
        <div className="tuner-meter-track">
          <span className="tuner-meter-center" />
          <span
            className={`tuner-needle ${inTune ? 'in-tune' : ''}`}
            style={{ left: `calc(50% + ${needle}%)` }}
          />
        </div>
        <div className="tuner-meter-scale"><span>♭ flat</span><span>{t.note ? `${t.cents > 0 ? '+' : ''}${t.cents}¢` : ''}</span><span>sharp ♯</span></div>
      </div>

      <div className="tuner-strings">
        {GUITAR_STRINGS.map((s) => (
          <span key={s.midi} className={`tuner-string ${t.midi === s.midi ? 'active' : ''}`}>{s.label}</span>
        ))}
      </div>

      {t.error && <p className="tuner-error">{t.error}</p>}

      <button type="button" className={`tuner-btn ${t.listening ? 'on' : ''}`} onClick={t.listening ? t.stop : t.start}>
        {t.listening ? 'Stop' : 'Start tuner'}
      </button>
      <p className="tuner-hint">
        {t.listening ? 'Play a single note or open string.' : 'Uses your microphone. Standard tuning E A D G B e.'}
      </p>
    </div>
  );
}
