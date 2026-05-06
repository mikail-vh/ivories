import { useAppStore } from '@/lib/store';

export function ReorderRow({ pos, total }: { pos: number; total: number }) {
  const reorder = useAppStore(s => s.reorderItem);
  return (
    <div className="reorder-row">
      <button onClick={() => reorder(pos, 'up')}   disabled={pos === 0}        aria-label="Move up">↑</button>
      <button onClick={() => reorder(pos, 'down')} disabled={pos === total - 1} aria-label="Move down">↓</button>
      <span className="pos-pill">{pos + 1} / {total}</span>
    </div>
  );
}
