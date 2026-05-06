'use client';

import { Piano } from './Piano';
import { StarButton } from './StarButton';
import { PlayButton } from './PlayButton';
import { Chord, chordTitle, noteListString, pitchClassesFor, startPcForRoot } from '@/lib/music';
import { useAppStore } from '@/lib/store';
import { midisFor, playChord, playNote } from '@/lib/audio';

export function ChordCard({ rootPc, chord, idx, reorder }: {
  rootPc: number;
  chord: Chord;
  idx: number;
  reorder?: React.ReactNode;
}) {
  const hideRoot = useAppStore(s => s.hideRoot);
  const pcs = pitchClassesFor(rootPc, chord.intervals);
  const midis = midisFor(rootPc, chord.intervals);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-titles">
          <h3 className="card-title">{chordTitle(rootPc, chord)}</h3>
          <span className="card-sub">{chord.label}</span>
        </div>
        <div className="card-controls">
          <PlayButton onPlay={() => playChord(midis)} title={`Preview ${chordTitle(rootPc, chord)}`} />
          <StarButton item={{ kind: 'chord', idx, rootPc }} />
        </div>
      </div>
      <Piano pitchClasses={pcs} rootPc={rootPc} startPc={startPcForRoot(rootPc)}
        hideRoot={hideRoot} octaves={1} padKeys={2}
        onPress={(midi) => playNote(midi)} />
      <div className="card-meta">{noteListString(rootPc, chord.intervals)}</div>
      {reorder}
    </div>
  );
}
