'use client';

import { Piano } from '../Piano';
import { pitchClassesFor, startPcForRoot } from '@/lib/music';
import { uniqueChordsInSong } from '@/lib/songs';
import { midisFor, playChord } from '@/lib/audio';
import type { Song } from '@/lib/songs';

export function ChordPalette({ song }: { song: Song }) {
  const items = uniqueChordsInSong(song);

  if (items.length === 0) {
    return (
      <aside className="chord-palette">
        <h2 className="palette-title">Chords in this song</h2>
        <p className="palette-empty">No recognised chords found yet.</p>
      </aside>
    );
  }

  return (
    <aside className="chord-palette">
      <h2 className="palette-title">Chords in this song</h2>
      <div className="palette-grid">
        {items.map(({ sym, rootPc, intervals }) => {
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
