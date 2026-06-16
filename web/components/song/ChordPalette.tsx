'use client';

import { Piano } from '../Piano';
import { ChordDiagram } from './ChordDiagram';
import { pitchClassesFor, startPcForRoot } from '@/lib/music';
import { uniqueChordsInSong, parseChordSymbol, findKnownChord } from '@/lib/songs';
import { midisFor, playChord, playGuitarChord } from '@/lib/audio';
import { generateVoicings, voicingMidis } from '@/lib/fretboard';
import { useAppStore } from '@/lib/store';
import type { Song } from '@/lib/songs';

export function ChordPalette({ song }: { song: Song }) {
  const items = uniqueChordsInSong(song);
  const chordView = useAppStore((s) => s.chordView);
  const guitarTone = useAppStore((s) => s.guitarTone);
  const orientation = useAppStore((s) => s.fretboardOrientation);
  const flipped = useAppStore((s) => s.fretboardFlipped);
  const guitar = chordView === 'guitar';

  if (items.length === 0) {
    return (
      <aside className="chord-palette">
        <h2 className="palette-title">Chords in this song</h2>
        <p className="palette-empty">No recognised chords found yet.</p>
      </aside>
    );
  }

  return (
    <aside className={`chord-palette ${guitar ? 'palette-guitar' : ''}`}>
      <h2 className="palette-title">Chords in this song</h2>
      <div className="palette-grid">
        {items.map(({ sym, rootPc, intervals }) => {
          /* In guitar mode, resolve the chord's suffix from its symbol so we
           * can render the first guitar voicing; fall back to the piano tile
           * when no common voicing exists. */
          const suffix = guitar ? (findKnownChord(parseChordSymbol(sym)?.quality ?? '')?.suffix ?? null) : null;
          const voicing = guitar && suffix !== null ? generateVoicings(rootPc, suffix)[0] : undefined;

          if (guitar && voicing) {
            return (
              <button
                key={sym}
                type="button"
                className="palette-card"
                onClick={() => playGuitarChord(voicingMidis(voicing), { tone: guitarTone })}
                title={`Play ${sym} (${voicing.label})`}
              >
                <span className="palette-card-title">{sym}</span>
                <ChordDiagram voicing={voicing} orientation={orientation} flipped={flipped} />
              </button>
            );
          }

          const pcs = pitchClassesFor(rootPc, intervals);
          const midis = midisFor(rootPc, intervals);
          return (
            <button
              key={sym}
              type="button"
              className="palette-card"
              onClick={() => playChord(midis)}
              title={`Play ${sym}`}
            >
              <span className="palette-card-title">{sym}</span>
              <Piano
                pitchClasses={pcs}
                rootPc={rootPc}
                startPc={startPcForRoot(rootPc)}
                hideRoot={false}
                octaves={1}
                padKeys={1}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
