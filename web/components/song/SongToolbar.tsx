'use client';

import type { LyricSize } from '@/lib/store';

const SIZES: LyricSize[] = ['sm', 'md', 'lg'];

/* Sticky glass performance bar for the song reader. Quick-access controls
 * that you reach for while playing: transpose, hands-free auto-scroll + pace,
 * lyric size, and a lyrics-only toggle. Deeper layout/arrangement options stay
 * in the cog menu so this bar stays uncluttered. */
export function SongToolbar({
  transpose,
  onTranspose,
  keyLabel,
  lyricSize,
  setLyricSize,
  lyricsOnly,
  toggleLyricsOnly,
  scrolling,
  onToggleScroll,
  speed,
  setSpeed,
  onStage,
}: {
  transpose: number;
  onTranspose: (t: number) => void;
  keyLabel: string | null;
  lyricSize: LyricSize;
  setLyricSize: (s: LyricSize) => void;
  lyricsOnly: boolean;
  toggleLyricsOnly: () => void;
  scrolling: boolean;
  onToggleScroll: () => void;
  speed: number;
  setSpeed: (n: number) => void;
  onStage: () => void;
}) {
  const sizeIdx = SIZES.indexOf(lyricSize);
  const stepSize = (dir: -1 | 1) => {
    const next = Math.min(SIZES.length - 1, Math.max(0, sizeIdx + dir));
    setLyricSize(SIZES[next]);
  };
  const transposeLabel = keyLabel ?? (transpose === 0 ? '—' : transpose > 0 ? `+${transpose}` : `${transpose}`);

  return (
    <div className="song-toolbar glass-bar" role="toolbar" aria-label="Performance controls">
      <div className="stb-group" aria-label="Transpose">
        <button
          type="button"
          className="stb-btn press-spring"
          onClick={() => onTranspose(transpose - 1)}
          aria-label="Transpose down a semitone"
          title="Transpose down"
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          className={`stb-readout ${transpose !== 0 ? 'changed' : ''}`}
          onClick={() => onTranspose(0)}
          title={transpose !== 0 ? 'Reset to original key' : 'Key'}
          aria-label={transpose !== 0 ? 'Reset transpose' : 'Current key'}
        >
          <span className="stb-readout-cap">key</span>
          <span className="stb-readout-val">{transposeLabel}</span>
        </button>
        <button
          type="button"
          className="stb-btn press-spring"
          onClick={() => onTranspose(transpose + 1)}
          aria-label="Transpose up a semitone"
          title="Transpose up"
        >
          <PlusIcon />
        </button>
      </div>

      <span className="stb-divider" aria-hidden="true" />

      <div className="stb-group" aria-label="Auto-scroll">
        <button
          type="button"
          className={`stb-btn stb-play press-spring ${scrolling ? 'on' : ''}`}
          onClick={onToggleScroll}
          aria-pressed={scrolling}
          aria-label={scrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
          title={scrolling ? 'Pause auto-scroll' : 'Auto-scroll'}
        >
          {scrolling ? <PauseIcon /> : <ScrollIcon />}
        </button>
        <input
          className="stb-speed"
          type="range"
          min={0.25}
          max={4}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          aria-label="Auto-scroll speed"
          title={`Scroll speed ${speed}×`}
          style={{ '--pct': `${((speed - 0.25) / 3.75) * 100}%` } as React.CSSProperties}
        />
        <span className="stb-speed-val">{speed}×</span>
      </div>

      <span className="stb-divider" aria-hidden="true" />

      <div className="stb-group" aria-label="Lyric size">
        <button
          type="button"
          className="stb-btn press-spring"
          onClick={() => stepSize(-1)}
          disabled={sizeIdx === 0}
          aria-label="Smaller text"
          title="Smaller text"
        >
          <span className="stb-a-small">A</span>
        </button>
        <button
          type="button"
          className="stb-btn press-spring"
          onClick={() => stepSize(1)}
          disabled={sizeIdx === SIZES.length - 1}
          aria-label="Larger text"
          title="Larger text"
        >
          <span className="stb-a-large">A</span>
        </button>
      </div>

      <button
        type="button"
        className={`stb-pill press-spring ${lyricsOnly ? 'on' : ''}`}
        onClick={toggleLyricsOnly}
        aria-pressed={lyricsOnly}
        title={lyricsOnly ? 'Show chords' : 'Hide chords (lyrics only)'}
      >
        <LyricsIcon />
        <span className="stb-pill-label">Lyrics</span>
      </button>

      <button
        type="button"
        className="stb-pill press-spring"
        onClick={onStage}
        title="Stage mode — full-screen, screen-awake reader"
      >
        <StageIcon />
        <span className="stb-pill-label">Stage</span>
      </button>
    </div>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ScrollIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
      <path d="M8 4h8" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function LyricsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M4 12h12M4 17h8" />
    </svg>
  );
}
function StageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h18M5 8v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M3 8l3-4h12l3 4" />
    </svg>
  );
}
