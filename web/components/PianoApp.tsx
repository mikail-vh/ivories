'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Legend } from './Legend';
import { ChordBrowser } from './ChordBrowser';
import { CustomList } from './CustomList';
import { ChordSearch, type SearchHit } from './ChordSearch';
import { CHORDS, ROOTS } from '@/lib/music';
import { hasVoicing } from '@/lib/fretboard';

export default function PianoApp() {
  const activeTab = useAppStore((s) => s.activeTab);
  const compact = useAppStore((s) => s.compact);
  const hideRoot = useAppStore((s) => s.hideRoot);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setChordView = useAppStore((s) => s.setChordView);
  const chordView = useAppStore((s) => s.chordView);

  const [scrollTo, setScrollTo] = useState<{ id: string; n: number } | null>(null);
  const nonce = useRef(0);

  useEffect(() => {
    const cls = document.body.classList;
    cls.toggle('mode-compact', compact);
    cls.toggle('mode-expanded', !compact);
    cls.toggle('hide-root', hideRoot);
  }, [compact, hideRoot]);

  /* After a search sets the root (and re-renders the grid), scroll the matched
   * card into view and flash it. DOM-only — no setState here. */
  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(scrollTo.id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('card-flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('card-flash');
    const t = setTimeout(() => el.classList.remove('card-flash'), 1100);
    return () => clearTimeout(t);
  }, [scrollTo]);

  const onHit = (hit: SearchHit) => {
    if (hit.kind === 'scale') {
      setChordView('piano'); // scales are piano-only
    } else if (chordView === 'guitar') {
      /* In guitar view a chord with no common voicing is filtered out of the
       * grid, so the search would land on nothing. Fall back to piano so the
       * result is always visible. */
      const root = ROOTS.find((r) => r.short === hit.rootShort);
      const suffix = CHORDS[hit.idx]?.suffix ?? '';
      if (!root || !hasVoicing(root.pc, suffix)) setChordView('piano');
    }
    setActiveTab(hit.rootShort);
    nonce.current += 1;
    setScrollTo({ id: hit.kind === 'chord' ? `cc-${hit.idx}` : `sc-${hit.idx}`, n: nonce.current });
  };

  const isList = activeTab === '__custom__';

  return (
    <div className="cheatsheet-layout">
      <Header />
      <Tabs />
      <main className="cheatsheet-main">
        {!isList && <ChordSearch onHit={onHit} />}
        {isList ? (
          <>
            <Legend />
            <CustomList />
          </>
        ) : (
          <ChordBrowser rootShort={activeTab} />
        )}
      </main>
    </div>
  );
}
