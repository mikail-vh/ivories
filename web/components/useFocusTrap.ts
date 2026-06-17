'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* Trap keyboard focus inside a modal overlay while `active`: focus the first
 * focusable on mount and wrap Tab/Shift-Tab at the boundaries so focus can't
 * escape into the (dimmed/covered) page behind. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    // Defer initial focus a tick so the overlay has painted.
    const t = setTimeout(() => focusables()[0]?.focus(), 20);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    root.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); root.removeEventListener('keydown', onKey); };
  }, [active, ref]);
}
