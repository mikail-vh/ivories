'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

const SECTIONS = [
  { href: '/chords',   label: 'Chords'   },
  { href: '/songs',    label: 'Songs'    },
  { href: '/settings', label: 'Settings' },
];

export function AppNav() {
  const pathname = usePathname();
  const theme = useAppStore(s => s.theme);
  const toggleTheme = useAppStore(s => s.toggleTheme);

  /* Apply theme/persist hooks at the app shell level so every section gets it. */
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <nav className="app-nav">
      <Link href="/" className="brand">🎹 <span className="accent">Music</span></Link>
      <div className="section-links">
        {SECTIONS.map(s => {
          const active = pathname === s.href || pathname.startsWith(s.href + '/');
          return (
            <Link key={s.href} href={s.href} className={`section-link ${active ? 'active' : ''}`}>
              {s.label}
            </Link>
          );
        })}
      </div>
      <button onClick={toggleTheme} className="icon" aria-label="Toggle theme">
        {theme === 'light' ? '☾' : '☀'}
      </button>
    </nav>
  );
}
