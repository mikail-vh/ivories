'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';

type SectionDef = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const SECTIONS: SectionDef[] = [
  { href: '/chords',     label: 'Chords',     icon: <ChordsIcon />  },
  { href: '/songs',      label: 'Songs',      icon: <SongsIcon />   },
  { href: '/playground', label: 'Playground', icon: <PlayIcon />    },
  { href: '/settings',   label: 'Settings',   icon: <GearIcon />    },
];

export function AppNav() {
  const pathname = usePathname();
  const theme = useAppStore(s => s.theme);
  const placement = useAppStore(s => s.navPlacement);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  /* Drive the layout from a body class so page-level CSS can reserve space
   * for the nav in the right place. */
  useEffect(() => {
    const cls = document.body.classList;
    ['nav-placement-bottom', 'nav-placement-top', 'nav-placement-right'].forEach(c => cls.remove(c));
    cls.add(`nav-placement-${placement}`);
  }, [placement]);

  /* Auto-hide on scroll-down, reveal on scroll-up (only when bottom-placed —
   * top/right placements stay visible since they're not in the scroll path). */
  useEffect(() => {
    if (placement !== 'bottom') return;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      /* Always show near the top. */
      if (y < 80) { setHidden(false); lastY.current = y; return; }
      /* Hysteresis: need a real swipe-worth of scroll before flipping state,
       * otherwise the nav nervously vanishes on a single scroll tick. */
      if (Math.abs(delta) < 24) return;
      setHidden(delta > 0);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [placement]);

  /* Hide only applies when bottom-placed — top/right always show. */
  const isHidden = hidden && placement === 'bottom';

  return (
    <>
      <nav
        className={`app-nav glass-capsule placement-${placement} ${isHidden ? 'hidden' : ''}`}
        aria-label="Primary"
      >
        {SECTIONS.map(s => {
          const active = pathname === s.href || pathname.startsWith(s.href + '/');
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`nav-tab ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-tab-icon" aria-hidden="true">{s.icon}</span>
              <span className="nav-tab-label">{s.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function ChordsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M9 6v8M15 6v8M9 14h6" />
      <rect x="7.2" y="6" width="2" height="5" fill="currentColor" />
      <rect x="13.2" y="6" width="2" height="5" fill="currentColor" />
    </svg>
  );
}

function SongsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
