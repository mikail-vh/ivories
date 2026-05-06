import { CHORDS, SCALES } from '@/lib/music';
import { useAppStore } from '@/lib/store';
import { ChordCard } from './ChordCard';
import { ScaleCard } from './ScaleCard';
import { ReorderRow } from './ReorderRow';

export function CustomList() {
  const pages = useAppStore(s => s.pages);
  const activePageId = useAppStore(s => s.activePageId);
  const page = pages.find(p => p.id === activePageId) || pages[0];
  const items = page?.items ?? [];

  return (
    <>
      <div className="toolbar">
        <div>
          <h2 className="text-lg font-semibold">{page?.name ?? '—'}</h2>
          <div className="text-xs text-[var(--text-dim)] mt-0.5">
            {items.length} starred · use the ↑ ↓ buttons to reorder
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <strong>No chords starred yet</strong>
          Open any root tab (C, D, E, …) and tap the ☆ on a chord or scale to add it here. Use the
          {' '}<strong>★ list</strong> selector at the top to organise chords by song or practice set.
        </div>
      ) : (
        <div className="grid">
          {items.map((item, pos) => {
            const reorder = <ReorderRow pos={pos} total={items.length} />;
            if (item.kind === 'chord') {
              const chord = CHORDS[item.idx];
              if (!chord) return null;
              return (
                <ChordCard key={`${item.kind}-${item.idx}-${item.rootPc}-${pos}`}
                  rootPc={item.rootPc} chord={chord} idx={item.idx} reorder={reorder} />
              );
            }
            const scale = SCALES[item.idx];
            if (!scale) return null;
            return (
              <ScaleCard key={`${item.kind}-${item.idx}-${item.rootPc}-${pos}`}
                rootPc={item.rootPc} scale={scale} idx={item.idx} reorder={reorder} />
            );
          })}
        </div>
      )}
    </>
  );
}
