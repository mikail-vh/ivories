import { useAppStore } from '@/lib/store';

export function Header() {
  const compact = useAppStore(s => s.compact);
  const hideRoot = useAppStore(s => s.hideRoot);
  const toggleCompact = useAppStore(s => s.toggleCompact);
  const toggleHideRoot = useAppStore(s => s.toggleHideRoot);

  return (
    <header className="app-header">
      <div className="header-row">
        <h1>Chord <span className="accent">Cheat Sheet</span></h1>
        <div className="controls">
          <button onClick={toggleCompact}>{compact ? 'Expanded' : 'Compact'}</button>
          <button onClick={toggleHideRoot}>{hideRoot ? 'Show root' : 'Hide root'}</button>
        </div>
      </div>
    </header>
  );
}
