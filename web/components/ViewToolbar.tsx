'use client';

import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';

/* Floating glass toolbar at the top-right of every page. Hosts global controls
 * (theme) plus contextual controls for the active surface. Sits in the same
 * "floating-glass corners" family as the bottom nav and is positioned so it
 * doesn't fight with any navPlacement choice. */
export function ViewToolbar() {
  const pathname = usePathname();
  const themeMode = useAppStore((s) => s.themeMode);
  const cycleTheme = useAppStore((s) => s.cycleTheme);
  const navPlacement = useAppStore((s) => s.navPlacement);
  const isLight = themeMode === 'light';

  const chordView = useAppStore((s) => s.chordView);
  const setChordView = useAppStore((s) => s.setChordView);
  const compact = useAppStore((s) => s.compact);
  const toggleCompact = useAppStore((s) => s.toggleCompact);
  const hideRoot = useAppStore((s) => s.hideRoot);
  const toggleHideRoot = useAppStore((s) => s.toggleHideRoot);

  const onChords = pathname === '/chords' || pathname.startsWith('/chords/');

  return (
    <div className={`view-toolbar glass-capsule placement-${navPlacement}`}>
      {onChords && (
        <>
          <div className="tb-segment" role="radiogroup" aria-label="Chord visualisation">
            <button
              type="button"
              role="radio"
              aria-checked={chordView === 'piano'}
              className={`tb-seg-btn ${chordView === 'piano' ? 'active' : ''}`}
              onClick={() => setChordView('piano')}
            >
              <PianoIcon /> <span>Piano</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={chordView === 'guitar'}
              className={`tb-seg-btn ${chordView === 'guitar' ? 'active' : ''}`}
              onClick={() => setChordView('guitar')}
            >
              <GuitarIcon /> <span>Guitar</span>
            </button>
          </div>
          <span className="tb-divider" aria-hidden="true" />
          <button
            type="button"
            className="tb-pill"
            data-active={compact}
            onClick={toggleCompact}
            aria-pressed={compact}
            title={compact ? 'Switch to expanded layout' : 'Switch to compact layout'}
          >
            <CompactIcon />
            <span>Compact</span>
          </button>
          <button
            type="button"
            className="tb-pill"
            data-active={hideRoot}
            onClick={toggleHideRoot}
            aria-pressed={hideRoot}
            title={hideRoot ? 'Show root note highlight' : 'Hide root note highlight'}
          >
            <RootDotIcon />
            <span>Root</span>
          </button>
          <span className="tb-divider" aria-hidden="true" />
        </>
      )}
      <button
        type="button"
        className="tb-icon-only"
        onClick={cycleTheme}
        title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        aria-label="Toggle colour theme"
      >
        {isLight ? <MoonIcon /> : <SunIcon />}
      </button>
    </div>
  );
}

/* --- Icons (22px outline, currentColor) --- */

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function PianoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M9 6v8M15 6v8M9 14h6" />
      <rect x="7.2" y="6" width="2" height="5" fill="currentColor" />
      <rect x="13.2" y="6" width="2" height="5" fill="currentColor" />
    </svg>
  );
}
function GuitarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 6l5-3 1 1-3 5" />
      <circle cx="10" cy="14" r="5" />
      <circle cx="10" cy="14" r="1.5" fill="currentColor" />
      <path d="M13.5 10.5l4.5-4.5" />
    </svg>
  );
}
function CompactIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4"  width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  );
}
function RootDotIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
