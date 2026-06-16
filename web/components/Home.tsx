'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { rehydrateSongs, songsRepo } from '@/lib/storage';
import type { SongMeta } from '@/lib/songs';

const QUICK_LINKS = [
  { href: '/songs', label: 'Songs', sub: 'Your library', icon: <SongsIcon /> },
  { href: '/chords', label: 'Chords', sub: 'Cheat sheet', icon: <ChordsIcon /> },
  { href: '/playground', label: 'Playground', sub: 'Scales & fretboard', icon: <PlayIcon /> },
  { href: '/settings', label: 'Settings', sub: 'Theme & sound', icon: <GearIcon /> },
];

export function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [greet, setGreet] = useState('');
  const recentIds = useAppStore((s) => s.recentSongs);
  const favoriteSongs = useAppStore((s) => s.favoriteSongs);

  useEffect(() => {
    // Deferred a microtask so it's client-only (no SSR/client time mismatch)
    // and not a synchronous setState in the effect body.
    Promise.resolve().then(() => setGreet(greeting()));
    useAppStore.persist.rehydrate();
    rehydrateSongs().then(() => setHydrated(true));
  }, []);

  /* Recently-opened, then any starred not already shown — gives a "jump back
   * in" shelf that's useful even before you've opened anything this session. */
  const shelf = useMemo<SongMeta[]>(() => {
    if (!hydrated) return [];
    const seen = new Set<string>();
    const out: SongMeta[] = [];
    for (const id of [...recentIds, ...favoriteSongs]) {
      if (seen.has(id)) continue;
      const song = songsRepo.get(id);
      if (!song) continue;
      seen.add(id);
      out.push({ id: song.id, title: song.title, artist: song.artist, key: song.key, updatedAt: song.updatedAt });
      if (out.length >= 6) break;
    }
    if (out.length === 0) {
      for (const m of songsRepo.list().slice(0, 4)) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [hydrated, recentIds, favoriteSongs]);

  return (
    <main className="home-page">
      <header className="home-hero">
        {greet && <p className="home-eyebrow">{greet}</p>}
        <h1>Let&rsquo;s make some music.</h1>
        <p className="home-tagline">Practice chords, learn songs, and jam — all in one place.</p>
      </header>

      {hydrated && shelf.length > 0 && (
        <section className="home-shelf">
          <h2 className="home-section-title">Jump back in</h2>
          <div className="home-shelf-row">
            {shelf.map((s) => (
              <Link key={s.id} href={`/songs/${s.id}`} className="home-song-card surface">
                <span className="home-song-card-key">{s.key ?? '♪'}</span>
                <span className="home-song-card-title">{s.title}</span>
                {s.artist && <span className="home-song-card-artist">{s.artist}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="home-actions">
        {QUICK_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="home-action surface press-spring">
            <span className="home-action-icon">{l.icon}</span>
            <span className="home-action-text">
              <span className="home-action-label">{l.label}</span>
              <span className="home-action-sub">{l.sub}</span>
            </span>
            <span className="home-action-chevron" aria-hidden="true">›</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late night';
}

function SongsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function ChordsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M9 6v8M15 6v8M9 14h6" />
      <rect x="7.2" y="6" width="2" height="5" fill="currentColor" /><rect x="13.2" y="6" width="2" height="5" fill="currentColor" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
