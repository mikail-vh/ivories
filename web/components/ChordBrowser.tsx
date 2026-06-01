'use client';

import { CHORD_CATEGORIES, CHORDS, ROOTS, SCALES } from '@/lib/music';
import { useAppStore } from '@/lib/store';
import { hasVoicing } from '@/lib/fretboard';
import { ChordCard } from './ChordCard';
import { ScaleCard } from './ScaleCard';

export function ChordBrowser({ rootShort }: { rootShort: string }) {
  const root = ROOTS.find(r => r.short === rootShort);
  const chordView = useAppStore(s => s.chordView);
  if (!root) return null;
  const isGuitar = chordView === 'guitar';
  return (
    <>
      {CHORD_CATEGORIES.map(cat => {
        const items = CHORDS.map((c, i) => ({ c, i }))
          .filter(x => x.c.cat === cat)
          .filter(x => !isGuitar || hasVoicing(root.pc, x.c.suffix));
        if (!items.length) return null;
        return (
          <div key={cat}>
            <div className="section-title">{cat}</div>
            <div className="grid">
              {items.map(x => (
                <ChordCard key={`${cat}-${x.i}`} rootPc={root.pc} chord={x.c} idx={x.i} />
              ))}
            </div>
          </div>
        );
      })}
      {/* Scales are piano-only for now — hide in guitar mode rather than mix metaphors. */}
      {!isGuitar && (
        <>
          <div className="section-title">Scales</div>
          <div className="grid">
            {SCALES.map((s, i) => (
              <ScaleCard key={`s-${i}`} rootPc={root.pc} scale={s} idx={i} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
