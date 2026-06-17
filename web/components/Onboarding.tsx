'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useFocusTrap } from './useFocusTrap';

const FEATURES = [
  { icon: '🎸', title: 'Songs & Stage Mode', body: 'Import chord sheets, transpose, auto-scroll hands-free, and play through setlists in a full-screen stage reader.' },
  { icon: '🎹', title: 'Chord & scale library', body: 'Search any chord or scale by name (Cmaj7, D dorian) on piano or guitar.' },
  { icon: '🎚️', title: 'Practice tools', body: 'Built-in metronome and a microphone tuner in the Playground.' },
  { icon: '🎨', title: 'Make it yours', body: 'Light / Dark / OLED, colour themes and a custom accent in Settings. Press ⌘K to jump anywhere.' },
];

/* First-run welcome tour. Shows once (gated on the persisted `onboarded` flag),
 * after the store has hydrated so returning users never see a flash. Mounted
 * once in the root layout. */
export function Onboarding() {
  const onboarded = useAppStore((s) => s.onboarded);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.resolve(useAppStore.persist.rehydrate()).then(() => setReady(true));
  }, []);

  const open = ready && !onboarded;
  useFocusTrap(dialogRef, open);

  if (!open) return null;

  const dismiss = () => setOnboarded(true);

  return (
    <div className="onboard-backdrop" role="presentation">
      <div ref={dialogRef} className="onboard glass-sheet anim-pop" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
        <div className="onboard-head">
          <p className="onboard-eyebrow">Welcome to</p>
          <h2 id="onboard-title">Your music studio</h2>
          <p className="onboard-sub">A clean home for practising chords, learning songs, and performing.</p>
        </div>
        <ul className="onboard-features">
          {FEATURES.map((f) => (
            <li key={f.title} className="onboard-feature">
              <span className="onboard-feature-icon" aria-hidden="true">{f.icon}</span>
              <span className="onboard-feature-text">
                <span className="onboard-feature-title">{f.title}</span>
                <span className="onboard-feature-body">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-primary onboard-cta" onClick={dismiss}>Get started</button>
      </div>
    </div>
  );
}
