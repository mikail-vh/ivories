'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { Legend } from './Legend';
import { ChordBrowser } from './ChordBrowser';
import { CustomList } from './CustomList';

export default function PianoApp() {
  const activeTab = useAppStore(s => s.activeTab);
  const compact = useAppStore(s => s.compact);
  const hideRoot = useAppStore(s => s.hideRoot);

  useEffect(() => {
    const cls = document.body.classList;
    cls.toggle('mode-compact', compact);
    cls.toggle('mode-expanded', !compact);
    cls.toggle('hide-root', hideRoot);
  }, [compact, hideRoot]);

  return (
    <>
      <Header />
      <Tabs />
      <main>
        <Legend />
        {activeTab === '__custom__' ? <CustomList /> : <ChordBrowser rootShort={activeTab} />}
      </main>
    </>
  );
}
