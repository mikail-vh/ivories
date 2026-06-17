'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSetlists, setlistsRepo, rehydrateSetlists } from '@/lib/setlists';

export function SetlistsIndex() {
  const setlists = useSetlists();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => { rehydrateSetlists().then(() => setHydrated(true)); }, []);

  const create = async () => {
    /* Ensure the store is hydrated first, so creating doesn't write into an
     * empty map that a late rehydrate would then overwrite. */
    await rehydrateSetlists();
    const s = setlistsRepo.create(name);
    setName('');
    setCreating(false);
    router.push(`/setlists/${s.id}`);
  };

  return (
    <main className="songs-page">
      <header className="songs-header">
        <div>
          <h1>Setlists</h1>
          <p>Build ordered lists of songs to play through — for practice or a gig.</p>
        </div>
        <div className="songs-header-actions">
          <Link href="/songs" className="btn-ghost">Songs</Link>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ New set</button>
        </div>
      </header>

      {creating && (
        <div className="setlist-create">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Set name — e.g. Friday gig"
            aria-label="Setlist name"
            onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }}
          />
          <button className="btn-primary" onClick={create}>Create</button>
          <button className="btn-ghost" onClick={() => { setCreating(false); setName(''); }}>Cancel</button>
        </div>
      )}

      {!hydrated ? null : setlists.length === 0 && !creating ? (
        <div className="songs-empty">
          <strong>No setlists yet</strong>
          <p>Group songs into a set you can play through in order, then launch it in Stage Mode.</p>
          <button className="btn-primary" onClick={() => setCreating(true)}>Create a setlist</button>
        </div>
      ) : (
        <ul className="songs-list">
          {setlists.map((s) => (
            <li key={s.id} className="song-row">
              <Link href={`/setlists/${s.id}`} className="song-row-link">
                <div className="song-row-titles">
                  <span className="song-row-title">{s.name}</span>
                  <span className="song-row-artist">{s.songIds.length} song{s.songIds.length === 1 ? '' : 's'}</span>
                </div>
              </Link>
              <button
                className="song-row-delete"
                onClick={() => { if (confirm(`Delete setlist "${s.name}"?`)) setlistsRepo.delete(s.id); }}
                aria-label={`Delete ${s.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
