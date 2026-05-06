import { useAppStore, type FavoriteItem } from '@/lib/store';

export function StarButton({ item }: { item: FavoriteItem }) {
  const fav = useAppStore(s => {
    const page = s.pages.find(p => p.id === s.activePageId);
    if (!page) return false;
    return page.items.some(it =>
      it.kind === item.kind && it.idx === item.idx && it.rootPc === item.rootPc
    );
  });
  const toggle = useAppStore(s => s.toggleFavorite);
  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      className={`star-btn ${fav ? 'on' : ''}`}
      title={fav ? 'Remove from list' : 'Add to list'}
      aria-label={fav ? 'Starred' : 'Not starred'}
    >
      {fav ? '★' : '☆'}
    </button>
  );
}
