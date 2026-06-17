'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { audioCurrentTime, scheduleClick } from '@/lib/audio';

const MIN_BPM = 40;
const MAX_BPM = 240;
const clampBpm = (n: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));

/* Web-Audio lookahead scheduler: a coarse JS timer wakes every 25ms and
 * schedules any clicks due within the next 120ms on the sample-accurate audio
 * clock, so tempo stays rock-steady even when the main thread is busy. The
 * visible beat indicator is nudged with setTimeout — approximate, but only the
 * audio needs to be tight. */
function useMetronome(bpm: number, beatsPerBar: number) {
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);

  useEffect(() => {
    // No reset needed when stopped — the dot indicator is gated on `running`.
    if (!running) return;
    const secPerBeat = 60 / bpm;
    nextTimeRef.current = audioCurrentTime() + 0.12;
    beatRef.current = 0;
    let timer = 0;
    const pending: number[] = [];

    const loop = () => {
      const now = audioCurrentTime();
      while (nextTimeRef.current < now + 0.12) {
        const idx = beatRef.current % beatsPerBar;
        scheduleClick(nextTimeRef.current - now, idx === 0);
        const delayMs = Math.max(0, (nextTimeRef.current - now) * 1000);
        pending.push(window.setTimeout(() => setBeat(idx), delayMs));
        nextTimeRef.current += secPerBeat;
        beatRef.current += 1;
      }
      timer = window.setTimeout(loop, 25);
    };
    loop();
    return () => {
      clearTimeout(timer);
      pending.forEach(clearTimeout);
    };
  }, [running, bpm, beatsPerBar]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  return { running, toggle, beat };
}

export function Metronome() {
  const [open, setOpen] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [sig, setSig] = useState(4);
  const { running, toggle, beat } = useMetronome(bpm, sig);
  const tapsRef = useRef<number[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tap = () => {
    const now = performance.now();
    const taps = tapsRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapsRef.current = taps;
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(clampBpm(60000 / avg));
    }
  };

  return (
    <div className="metronome-host" ref={hostRef}>
      <button
        type="button"
        className={`tb-icon-only ${running ? 'metronome-live' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Metronome"
        aria-expanded={open}
        title="Metronome"
      >
        <MetronomeIcon />
      </button>

      {open && (
        <div className="metronome-pop glass-sheet anim-pop" role="dialog" aria-label="Metronome">
          <div className="metronome-bpm">
            <button type="button" className="met-step" onClick={() => setBpm((b) => clampBpm(b - 1))} aria-label="Decrease tempo">−</button>
            <div className="met-readout">
              <span className="met-bpm-val">{bpm}</span>
              <span className="met-bpm-cap">BPM</span>
            </div>
            <button type="button" className="met-step" onClick={() => setBpm((b) => clampBpm(b + 1))} aria-label="Increase tempo">+</button>
          </div>

          <input
            className="met-slider"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(clampBpm(parseInt(e.target.value, 10)))}
            aria-label="Tempo"
            style={{ '--pct': `${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%` } as React.CSSProperties}
          />

          <div className="met-beats" aria-hidden="true">
            {Array.from({ length: sig }).map((_, i) => (
              <span key={i} className={`met-dot ${i === 0 ? 'accent' : ''} ${running && beat === i ? 'on' : ''}`} />
            ))}
          </div>

          <div className="met-row">
            <div className="met-sig" role="radiogroup" aria-label="Time signature">
              {[2, 3, 4, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={sig === n}
                  className={sig === n ? 'active' : ''}
                  onClick={() => setSig(n)}
                >
                  {n}/4
                </button>
              ))}
            </div>
            <button type="button" className="met-tap" onClick={tap}>Tap</button>
          </div>

          <button type="button" className={`met-play ${running ? 'on' : ''}`} onClick={toggle}>
            {running ? <PauseIcon /> : <PlayIcon />}
            <span>{running ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MetronomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3h8l3 18H5L8 3z" />
      <path d="M9 14h6" />
      <path d="M12 14l4-7" />
    </svg>
  );
}
function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
}
