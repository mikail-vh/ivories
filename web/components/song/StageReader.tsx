'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SongRenderer } from './SongRenderer';
import { useAutoscroll } from './useAutoscroll';
import { useFocusTrap } from '../useFocusTrap';
import type { Song } from '@/lib/songs';

const MIN_SCALE = 1;
const MAX_SCALE = 2.4;

/* Full-screen, high-contrast performance reader: hides all app chrome, keeps
 * the screen awake (Wake Lock), shows oversized lyrics/chords, and offers
 * hands-free auto-scroll. The deliberate inverse of the glass aesthetic. */
export function StageReader({ song, onExit }: { song: Song; onExit: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  const [speed, setSpeed] = useState(1);
  const getEl = useCallback(() => scrollRef.current, []);
  const autoscroll = useAutoscroll(getEl, speed);
  useFocusTrap(rootRef, true);

  /* Hide global chrome + lock to a calm near-black backdrop while mounted. */
  useEffect(() => {
    document.body.classList.add('stage-mode');
    return () => document.body.classList.remove('stage-mode');
  }, []);

  /* Keep the screen awake (best-effort; not all browsers/contexts allow it).
   * Re-acquire on visibility change since the lock drops when tab-hidden. */
  useEffect(() => {
    type WakeLockNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (cancelled) return;
      try {
        const wl = (navigator as WakeLockNav).wakeLock;
        if (!wl) return;
        if (lock) { try { await lock.release(); } catch { /* already gone */ } lock = null; }
        if (!cancelled) lock = await wl.request('screen');
      } catch { /* denied / unsupported — fine */ }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (e.key === ' ') { e.preventDefault(); autoscroll.toggle(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit, autoscroll]);

  const stepScale = (d: number) => setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + d).toFixed(2))));

  return (
    <div ref={rootRef} className="stage-reader" role="dialog" aria-modal="true" aria-label={`${song.title} — stage mode`}>
      <header className="stage-bar">
        <div className="stage-bar-title">
          <strong>{song.title}</strong>
          {song.artist && <span>{song.artist}</span>}
        </div>
        <div className="stage-bar-controls">
          <button type="button" className="stage-btn" onClick={() => stepScale(-0.1)} aria-label="Smaller text">A−</button>
          <button type="button" className="stage-btn" onClick={() => stepScale(0.1)} aria-label="Larger text">A+</button>
          <input
            className="stage-speed"
            type="range" min={0.25} max={4} step={0.25} value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            aria-label="Auto-scroll speed"
            style={{ '--pct': `${((speed - 0.25) / 3.75) * 100}%` } as React.CSSProperties}
          />
          <button
            type="button"
            className={`stage-btn stage-play ${autoscroll.playing ? 'on' : ''}`}
            onClick={autoscroll.toggle}
            aria-pressed={autoscroll.playing}
          >
            {autoscroll.playing ? 'Pause' : 'Scroll'}
          </button>
          <button type="button" className="stage-exit" onClick={onExit} aria-label="Exit stage mode">Exit</button>
        </div>
      </header>
      <div
        className="stage-scroll"
        ref={scrollRef}
        style={{ '--lyric-size': `${scale}rem`, '--chord-size': `${(scale * 0.7).toFixed(2)}rem` } as React.CSSProperties}
      >
        <SongRenderer body={song.body} transpose={song.transpose} />
        <div className="stage-tailroom" aria-hidden="true" />
      </div>
    </div>
  );
}
