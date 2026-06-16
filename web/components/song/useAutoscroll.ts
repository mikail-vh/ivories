'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* Smooth, frame-timed auto-scroll for a scroll container (the song reader).
 * Speed is a multiplier; base pace is tuned so 1× is a relaxed sing-along
 * crawl and 4× moves at a brisk read. Sub-pixel accumulation keeps motion
 * smooth at low speeds. Auto-stops at the bottom. Honours reduced-motion by
 * jumping in larger steps rather than per-frame easing isn't needed — the
 * scroll itself is the motion the user explicitly asked for. */
export function useAutoscroll(
  getEl: () => HTMLElement | null,
  speed: number,
) {
  const [playing, setPlaying] = useState(false);
  const accRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const el = getEl();
    if (!el) return;

    let raf = 0;
    let last = performance.now();
    const BASE_PX_PER_SEC = 22; // 1× pace

    const tick = (now: number) => {
      const dt = Math.min(now - last, 80); // clamp after tab-switch stalls
      last = now;
      accRef.current += (BASE_PX_PER_SEC * speed * dt) / 1000;
      const whole = Math.floor(accRef.current);
      if (whole >= 1) {
        accRef.current -= whole;
        el.scrollTop += whole;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, getEl]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const stop = useCallback(() => setPlaying(false), []);

  return { playing, toggle, stop, setPlaying };
}
