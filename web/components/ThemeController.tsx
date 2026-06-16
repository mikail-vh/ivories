'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

/* WCAG relative luminance → pick a readable colour to sit ON the accent fill. */
function contrastOn(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.48 ? '#14171d' : '#ffffff';
}

/* Applies the theme system to the document: base mode (dark/light/oled),
 * colour preset, optional custom accent, and the reduce-glass toggle. Also
 * owns the one-time store rehydration so every page picks up persisted prefs.
 * Mounted once in the root layout. */
export function ThemeController() {
  const mode = useAppStore((s) => s.themeMode);
  const preset = useAppStore((s) => s.themePreset);
  const accent = useAppStore((s) => s.accent);
  const reduceGlass = useAppStore((s) => s.reduceGlass);

  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const cl = document.body.classList;
    cl.toggle('light', mode === 'light');
    cl.toggle('oled', mode === 'oled');
  }, [mode]);

  useEffect(() => {
    document.body.setAttribute('data-theme', preset || 'amber');
  }, [preset]);

  /* A custom accent overrides the preset's accent via inline custom properties;
   * --accent-text follows --accent through the color-mix in globals.css, so we
   * only set the base accent + its on-fill contrast here. */
  useEffect(() => {
    const style = document.body.style;
    if (accent) {
      style.setProperty('--accent', accent);
      style.setProperty('--accent-contrast', contrastOn(accent));
    } else {
      style.removeProperty('--accent');
      style.removeProperty('--accent-contrast');
    }
  }, [accent]);

  useEffect(() => {
    document.body.classList.toggle('reduce-glass', reduceGlass);
  }, [reduceGlass]);

  return null;
}
