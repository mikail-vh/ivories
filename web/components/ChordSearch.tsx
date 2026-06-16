'use client';

import { useState } from 'react';
import { CHORDS, SCALES, ROOTS, NOTE_NAMES_SHARP } from '@/lib/music';
import { parseChordSymbol, findKnownChord } from '@/lib/songs';

export type SearchHit = {
  rootShort: string;
  kind: 'chord' | 'scale';
  idx: number;
  label: string;
};

/* Resolve a typed query into a card to jump to. Tries a chord symbol first
 * (Cmaj7, F#m7b5, Am, B/D#), then a "<root> <scale>" phrase (D dorian,
 * Bb major pentatonic). Reuses the song parser's grammar. */
export function resolveSearch(query: string): SearchHit | null {
  const q = query.trim();
  if (!q) return null;

  const p = parseChordSymbol(q);
  if (p) {
    const chord = findKnownChord(p.quality);
    if (chord) {
      const idx = CHORDS.indexOf(chord);
      const rootShort = ROOTS.find((r) => r.pc === p.rootPc)?.short;
      if (idx >= 0 && rootShort) {
        return { rootShort, kind: 'chord', idx, label: NOTE_NAMES_SHARP[p.rootPc] + chord.suffix };
      }
    }
  }

  const m = q.match(/^([A-Ga-g][#b♯♭]?)\s+(.+)$/);
  if (m) {
    const rp = parseChordSymbol(m[1]);
    const word = m[2].toLowerCase().trim();
    if (rp) {
      const sidx = SCALES.findIndex(
        (s) => s.suffix.toLowerCase() === word ||
          s.label.toLowerCase().includes(word) ||
          word.includes(s.suffix.toLowerCase()),
      );
      const rootShort = ROOTS.find((r) => r.pc === rp.rootPc)?.short;
      if (sidx >= 0 && rootShort) {
        return { rootShort, kind: 'scale', idx: sidx, label: `${NOTE_NAMES_SHARP[rp.rootPc]} ${SCALES[sidx].label}` };
      }
    }
  }
  return null;
}

export function ChordSearch({ onHit }: { onHit: (hit: SearchHit) => void }) {
  const [q, setQ] = useState('');
  const [bad, setBad] = useState(false);

  const submit = () => {
    const hit = resolveSearch(q);
    if (hit) { setBad(false); onHit(hit); }
    else setBad(q.trim().length > 0);
  };

  return (
    <form
      className={`chord-search ${bad ? 'invalid' : ''}`}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      role="search"
    >
      <SearchIcon />
      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setBad(false); }}
        placeholder="Find a chord or scale — Cmaj7, F#m7b5, D dorian…"
        aria-label="Find a chord or scale by name"
        enterKeyHint="search"
      />
      {bad && <span className="chord-search-hint">No match</span>}
      {q && (
        <button type="button" className="chord-search-clear" onClick={() => { setQ(''); setBad(false); }} aria-label="Clear">×</button>
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
