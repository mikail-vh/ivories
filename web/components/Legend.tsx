import { useAppStore } from '@/lib/store';

export function Legend() {
  const pages = useAppStore(s => s.pages);
  const activePageId = useAppStore(s => s.activePageId);
  const setActivePage = useAppStore(s => s.setActivePage);
  const addPage = useAppStore(s => s.addPage);
  const renamePage = useAppStore(s => s.renamePage);
  const deletePage = useAppStore(s => s.deletePage);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const active = pages.find(p => p.id === activePageId);
    if (v === '__new') {
      const name = (window.prompt('New list name:', '') || '').trim();
      if (name) addPage(name);
    } else if (v === '__rename' && active) {
      const name = (window.prompt('Rename list:', active.name) || '').trim();
      if (name) renamePage(active.id, name);
    } else if (v === '__delete' && active) {
      if (window.confirm(`Delete list "${active.name}"? Its starred chords will be removed.`)) {
        deletePage(active.id);
      }
    } else if (v) {
      setActivePage(v);
    }
  };

  return (
    <div className="legend">
      <div className="legend-item root-legend"><span className="swatch root"></span> Root note</div>
      <div className="legend-item"><span className="swatch note"></span> Chord / scale tone</div>
      <div className="legend-item ml-auto gap-1.5">
        <span>★ list:</span>
        <select value={activePageId} onChange={onChange} aria-label="Active starred list">
          {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option disabled>──────────</option>
          <option value="__new">+ New list…</option>
          <option value="__rename">Rename current…</option>
          {pages.length > 1 && <option value="__delete">Delete current…</option>}
        </select>
      </div>
    </div>
  );
}
