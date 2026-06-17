'use client';

import { Piano } from './Piano';
import { StarButton } from './StarButton';
import { PlayButton } from './PlayButton';
import { Scale, scaleTitle, noteListString, pitchClassesFor, startPcForRoot } from '@/lib/music';
import { useAppStore } from '@/lib/store';
import { midisFor, playSequence, playNote } from '@/lib/audio';

export function ScaleCard({ rootPc, scale, idx, reorder, domId }: {
  rootPc: number;
  scale: Scale;
  idx: number;
  reorder?: React.ReactNode;
  domId?: string;
}) {
  const hideRoot = useAppStore(s => s.hideRoot);
  const pcs = pitchClassesFor(rootPc, scale.intervals);
  const midis = midisFor(rootPc, scale.intervals);

  return (
    <div className="card" id={domId}>
      <div className="card-header">
        <div className="card-titles">
          <h3 className="card-title">{scaleTitle(rootPc, scale)}</h3>
          <span className="card-sub">{scale.intervals.length} tones</span>
        </div>
        <div className="card-controls">
          <PlayButton onPlay={() => playSequence(midis)} title={`Play ${scaleTitle(rootPc, scale)}`} />
          <StarButton item={{ kind: 'scale', idx, rootPc }} />
        </div>
      </div>
      <Piano pitchClasses={pcs} rootPc={rootPc} startPc={startPcForRoot(rootPc)}
        hideRoot={hideRoot} octaves={1} padKeys={2}
        onPress={(midi) => playNote(midi)} />
      <div className="card-meta">{noteListString(rootPc, scale.intervals)}</div>
      {reorder}
    </div>
  );
}
