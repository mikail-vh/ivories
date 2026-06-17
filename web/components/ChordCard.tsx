'use client';

import { useState } from 'react';
import { Piano } from './Piano';
import { ChordDiagram } from './song/ChordDiagram';
import { VoicingFlipper } from './VoicingFlipper';
import { StarButton } from './StarButton';
import { PlayButton } from './PlayButton';
import { Chord, chordTitle, noteListString, pitchClassesFor, startPcForRoot } from '@/lib/music';
import { useAppStore } from '@/lib/store';
import { midisFor, playChord, playGuitarChord, playNote } from '@/lib/audio';
import { generateVoicings, voicingMidis } from '@/lib/fretboard';

type Props = {
  rootPc: number;
  chord: Chord;
  idx: number;
  reorder?: React.ReactNode;
  /* Optional DOM id so chord-by-name search can scroll the card into view. */
  domId?: string;
};

export function ChordCard(props: Props) {
  const chordView = useAppStore(s => s.chordView);
  if (chordView === 'guitar') return <GuitarChordCard {...props} />;
  return <PianoChordCard {...props} />;
}

function PianoChordCard({ rootPc, chord, idx, reorder, domId }: Props) {
  const hideRoot = useAppStore(s => s.hideRoot);
  const pcs = pitchClassesFor(rootPc, chord.intervals);
  const midis = midisFor(rootPc, chord.intervals);

  return (
    <div className="card" id={domId}>
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

function GuitarChordCard({ rootPc, chord, idx, reorder, domId }: Props) {
  const guitarTone = useAppStore(s => s.guitarTone);
  const orientation = useAppStore(s => s.fretboardOrientation);
  const flipped = useAppStore(s => s.fretboardFlipped);
  const voicings = generateVoicings(rootPc, chord.suffix);
  const [vIdx, setVIdx] = useState(0);
  const v = voicings.length > 0 ? voicings[Math.min(vIdx, voicings.length - 1)] : undefined;
  const title = chordTitle(rootPc, chord);

  return (
    <div className="card guitar-chord-card" id={domId}>
      <div className="card-header">
        <div className="card-titles">
          <h3 className="card-title">{title}</h3>
          <span className="card-sub">{chord.label}</span>
        </div>
        <div className="card-controls">
          {v && (
            <PlayButton
              onPlay={() => playGuitarChord(voicingMidis(v), { tone: guitarTone })}
              title={`Preview ${title} (${v.label})`}
            />
          )}
          <StarButton item={{ kind: 'chord', idx, rootPc }} />
        </div>
      </div>
      {v ? (
        <div className="card-guitar">
          <button
            type="button"
            className="card-guitar-tap"
            onClick={() => playGuitarChord(voicingMidis(v), { tone: guitarTone })}
            title={`Play ${title}`}
            aria-label={`Play ${title} as ${v.label}`}
          >
            <ChordDiagram voicing={v} orientation={orientation} flipped={flipped} />
          </button>
          <VoicingFlipper idx={vIdx} total={voicings.length} onChange={setVIdx} />
          <div className="voicing-label">{v.label}</div>
        </div>
      ) : (
        <div className="card-guitar-empty">No common guitar voicing yet</div>
      )}
      <div className="card-meta">{noteListString(rootPc, chord.intervals)}</div>
      {reorder}
    </div>
  );
}
