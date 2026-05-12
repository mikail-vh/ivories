'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSongList, songsRepo, rehydrateSongs } from '@/lib/storage';
import { handleAuthCallback } from '@/lib/spotify-auth';
import { ImportDialog } from './ImportDialog';

export function SongsIndex() {
  const songs = useSongList();
  const [importing, setImporting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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

  return (
    <main className="songs-page">
      <header className="songs-header">
        <div>
          <h1>Songs</h1>
          <p>Your library — paste in lyrics and chords, see them rendered with a piano alongside.</p>
        </div>
        <button className="btn-primary" onClick={() => setImporting(true)}>
          + New song
        </button>
      </header>

      {!hydrated ? null : songs.length === 0 ? (
        <div className="songs-empty">
          <strong>No songs yet</strong>
          <p>Click <em>New song</em> to paste in ChordPro, OnSong, or a chord-above-lyric tab. File drop works too.</p>
          <button className="btn-primary" onClick={() => setImporting(true)}>Import your first song</button>
        </div>
      ) : (
        <ul className="songs-list">
          {songs.map(s => (
            <li key={s.id} className="song-row">
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
          ))}
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
