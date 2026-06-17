'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { rehydrateSongs, songsRepo } from '@/lib/storage';
import { useFocusTrap } from './useFocusTrap';

type Item = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  group: 'Go to' | 'Songs';
};

const DESTINATIONS: Item[] = [
  { id: 'home', label: 'Home', sub: 'Dashboard', href: '/', group: 'Go to' },
  { id: 'songs', label: 'Songs', sub: 'Your library', href: '/songs', group: 'Go to' },
  { id: 'setlists', label: 'Setlists', sub: 'Play-through lists', href: '/setlists', group: 'Go to' },
  { id: 'chords', label: 'Chords', sub: 'Cheat sheet', href: '/chords', group: 'Go to' },
  { id: 'playground', label: 'Playground', sub: 'Scales & fretboard', href: '/playground', group: 'Go to' },
  { id: 'settings', label: 'Settings', sub: 'Theme & sound', href: '/settings', group: 'Go to' },
];

/* Global ⌘K / Ctrl-K command palette: jump between sections and search the
 * song library from anywhere. Mounted once in the root layout. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [songs, setSongs] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);
  useFocusTrap(dialogRef, open);

  /* Global shortcut. Resets happen here (an event handler, not an effect);
   * the palette can only be opened via this path, so every open is clean.
   * Suppressed in Stage Mode — the palette would render behind the opaque
   * full-screen reader and silently capture keystrokes. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (openRef.current) {
          setOpen(false);
        } else if (!document.body.classList.contains('stage-mode')) {
          setQuery('');
          setActive(0);
          setOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Load the song library the first time the palette opens. */
  useEffect(() => {
    if (!open) return;
    rehydrateSongs().then(() => {
      setSongs(
        songsRepo.list().map((s) => ({
          id: `song:${s.id}`,
          label: s.title,
          sub: s.artist || (s.key ? `Key ${s.key}` : 'Song'),
          href: `/songs/${s.id}`,
          group: 'Songs' as const,
        })),
      );
    });
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [...DESTINATIONS, ...songs];
    const matched = q
      ? pool.filter((i) => `${i.label} ${i.sub ?? ''}`.toLowerCase().includes(q))
      : [...DESTINATIONS, ...songs.slice(0, 6)];
    return matched.slice(0, 20);
  }, [query, songs]);

  const go = useCallback((item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  if (!open) return null;

  let lastGroup = '';
  return (
    <div className="cmdk-backdrop" onMouseDown={() => setOpen(false)} role="presentation">
      <div ref={dialogRef} className="cmdk glass-sheet anim-pop" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            className="cmdk-input"
            value={query}
            placeholder="Search songs or jump to…"
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            aria-label="Command palette search"
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>
        <ul className="cmdk-list" role="listbox">
          {results.length === 0 && <li className="cmdk-empty">No matches</li>}
          {results.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id}>
                {header && <div className="cmdk-group">{header}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`cmdk-item ${i === active ? 'active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                >
                  <span className="cmdk-item-label">{item.label}</span>
                  {item.sub && <span className="cmdk-item-sub">{item.sub}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
