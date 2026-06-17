'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSongList, songsRepo, rehydrateSongs } from '@/lib/storage';
import { useAppStore } from '@/lib/store';
import { handleAuthCallback } from '@/lib/spotify-auth';
import { ImportDialog } from './ImportDialog';

export function SongsIndex() {
  const songs = useSongList();
  const [importing, setImporting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState('');
  const favoriteSongs = useAppStore((s) => s.favoriteSongs);
  const toggleFavoriteSong = useAppStore((s) => s.toggleFavoriteSong);

  useEffect(() => {
    rehydrateSongs().then(() => setHydrated(true));
  }, []);

  /* /songs is the registered Spotify redirect URI. If we arrive here with a
   * `?code=` query string, finish the OAuth handshake and jump back to the
   * song page the user kicked off from. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!new URLSearchParams(window.location.search).has('code')) return;
    handleAuthCallback().catch(() => { /* leave the user on /songs */ });
  }, []);

  const favSet = useMemo(() => new Set(favoriteSongs), [favoriteSongs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? songs.filter((s) =>
          [s.title, s.artist, s.key].filter(Boolean).some((f) => f!.toLowerCase().includes(q)))
      : songs;
    /* Starred songs float to the top; within each band keep recency order. */
    return [...matches].sort((a, b) => {
      const fa = favSet.has(a.id) ? 1 : 0;
      const fb = favSet.has(b.id) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.updatedAt - a.updatedAt;
    });
  }, [songs, query, favSet]);

  return (
    <main className="songs-page">
      <header className="songs-header">
        <div>
          <h1>Songs</h1>
          <p>Your library — paste in lyrics and chords, see them rendered with a piano alongside.</p>
        </div>
        <div className="songs-header-actions">
          <Link href="/setlists" className="btn-ghost">Setlists</Link>
          <button className="btn-primary" onClick={() => setImporting(true)}>
            + New song
          </button>
        </div>
      </header>

      {hydrated && songs.length > 0 && (
        <div className="library-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, artist or key…"
            aria-label="Search songs"
          />
          {query && (
            <button className="library-search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
          )}
        </div>
      )}

      {!hydrated ? null : songs.length === 0 ? (
        <div className="songs-empty">
          <strong>No songs yet</strong>
          <p>Click <em>New song</em> to paste in ChordPro, OnSong, or a chord-above-lyric tab. File drop works too.</p>
          <button className="btn-primary" onClick={() => setImporting(true)}>Import your first song</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="songs-empty">
          <strong>No matches</strong>
          <p>Nothing matches &ldquo;{query}&rdquo;. Try a different title, artist, or key.</p>
        </div>
      ) : (
        <ul className="songs-list">
          {filtered.map((s) => {
            const starred = favSet.has(s.id);
            return (
              <li key={s.id} className="song-row">
                <button
                  className={`song-row-star ${starred ? 'on' : ''}`}
                  title={starred ? 'Unstar' : 'Star'}
                  aria-label={starred ? `Unstar ${s.title}` : `Star ${s.title}`}
                  aria-pressed={starred}
                  onClick={() => toggleFavoriteSong(s.id)}
                >
                  {starred ? '★' : '☆'}
                </button>
                <Link href={`/songs/${s.id}`} className="song-row-link">
                  <div className="song-row-titles">
                    <span className="song-row-title">{s.title}</span>
                    {s.artist && <span className="song-row-artist">{s.artist}</span>}
                  </div>
                  <div className="song-row-meta">
                    {s.key && <span className="chip">{s.key}</span>}
                    <span className="song-row-date">{relativeTime(s.updatedAt)}</span>
                  </div>
                </Link>
                <button
                  className="song-row-delete"
                  title="Delete song"
                  aria-label={`Delete ${s.title}`}
                  onClick={() => {
                    if (confirm(`Delete "${s.title}"?`)) songsRepo.delete(s.id);
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onCreated={(id) => {
            setImporting(false);
            window.location.href = `/songs/${id}`;
          }}
        />
      )}
    </main>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
