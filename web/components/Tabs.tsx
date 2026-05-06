import { useEffect, useRef } from 'react';
import { ROOTS } from '@/lib/music';
import { useAppStore } from '@/lib/store';

export function Tabs() {
  const activeTab = useAppStore(s => s.activeTab);
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const active = wrap.querySelector<HTMLElement>('.tab.active');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeTab]);

  return (
    <nav className="tabs" ref={ref}>
      <div className="tabs-inner">
        {ROOTS.map(r => (
          <button
            key={r.short}
            className={`tab ${activeTab === r.short ? 'active' : ''}`}
            onClick={() => setActiveTab(r.short)}
          >
            {r.short}
          </button>
        ))}
        <button
          className={`tab ${activeTab === '__custom__' ? 'active' : ''}`}
          onClick={() => setActiveTab('__custom__')}
        >
          ★ List
        </button>
      </div>
    </nav>
  );
}
