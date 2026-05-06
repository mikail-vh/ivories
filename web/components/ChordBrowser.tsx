import { CHORD_CATEGORIES, CHORDS, NOTE_NAMES_SHARP, ROOTS, SCALES } from '@/lib/music';
import { ChordCard } from './ChordCard';
import { ScaleCard } from './ScaleCard';

export function ChordBrowser({ rootShort }: { rootShort: string }) {
  const root = ROOTS.find(r => r.short === rootShort);
  if (!root) return null;
  return (
    <>
      <div className="toolbar">
        <div>
          <h2 className="text-lg font-semibold">{root.name}</h2>
          <div className="text-xs text-[var(--text-dim)] mt-0.5">
            Chords &amp; scales rooted on {NOTE_NAMES_SHARP[root.pc]}
          </div>
        </div>
      </div>
      {CHORD_CATEGORIES.map(cat => {
        const items = CHORDS.map((c, i) => ({ c, i })).filter(x => x.c.cat === cat);
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
      <div className="section-title">Scales</div>
      <div className="grid">
        {SCALES.map((s, i) => (
          <ScaleCard key={`s-${i}`} rootPc={root.pc} scale={s} idx={i} />
        ))}
      </div>
    </>
  );
}
