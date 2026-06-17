'use client';

import { useEffect, useRef } from 'react';
import { ROOTS } from '@/lib/music';
import { useAppStore } from '@/lib/store';

/* Left vertical rail with one row per root note. Active root is highlighted
 * with the accent; the ★ button at the bottom opens the custom favourites
 * list. Sticky-positioned in PianoApp so it stays visible while content
 * scrolls. */
export function Tabs() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const active = wrap.querySelector<HTMLElement>('.rail-key.active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeTab]);

  return (
    <aside className="root-rail" ref={ref} aria-label="Root note">
      {ROOTS.map((r) => (
        <button
          key={r.short}
          type="button"
          className={`rail-key ${activeTab === r.short ? 'active' : ''}`}
          onClick={() => setActiveTab(r.short)}
          title={r.name}
          aria-pressed={activeTab === r.short}
        >
          {r.short}
        </button>
      ))}
      <span className="rail-divider" aria-hidden="true" />
      <button
        type="button"
        className={`rail-key rail-key-list ${activeTab === '__custom__' ? 'active' : ''}`}
        onClick={() => setActiveTab('__custom__')}
        aria-pressed={activeTab === '__custom__'}
        title="My list"
        aria-label="My favourites list"
      >
        ★
      </button>
    </aside>
  );
}
