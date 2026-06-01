'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Legend } from './Legend';
import { ChordBrowser } from './ChordBrowser';
import { CustomList } from './CustomList';

export default function PianoApp() {
  const activeTab = useAppStore((s) => s.activeTab);
  const compact = useAppStore((s) => s.compact);
  const hideRoot = useAppStore((s) => s.hideRoot);

  useEffect(() => {
    const cls = document.body.classList;
    cls.toggle('mode-compact', compact);
    cls.toggle('mode-expanded', !compact);
    cls.toggle('hide-root', hideRoot);
  }, [compact, hideRoot]);

  const isList = activeTab === '__custom__';

  return (
    <div className="cheatsheet-layout">
      <Header />
      <Tabs />
      <main className="cheatsheet-main">
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
