'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSetlist, setlistsRepo, rehydrateSetlists } from '@/lib/setlists';
import { rehydrateSongs, useSongList } from '@/lib/storage';
import { useFocusTrap } from '../useFocusTrap';

export function SetlistDetail({ id }: { id: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { Promise.all([rehydrateSetlists(), rehydrateSongs()]).then(() => setHydrated(true)); }, []);

  const setlist = useSetlist(id);
  const library = useSongList();
  const router = useRouter();
  const [picking, setPicking] = useState(false);

  const byId = useMemo(() => new Map(library.map((s) => [s.id, s])), [library]);
  const setSongs = useMemo(
    () => (setlist?.songIds ?? []).map((sid) => byId.get(sid)).filter((s): s is NonNullable<typeof s> => !!s),
    [setlist?.songIds, byId],
  );

  if (hydrated && !setlist) {
    return (
      <main className="songs-page">
        <div className="songs-empty"><strong>Setlist not found</strong><p>It may have been deleted. <Link href="/setlists">Back to setlists</Link>.</p></div>
      </main>
    );
  }
  if (!setlist) return <main className="songs-page" />;

  const start = () => {
    if (setlist.songIds.length === 0) return;
    router.push(`/songs/${setlist.songIds[0]}?setlist=${setlist.id}&i=0`);
  };

  return (
    <main className="songs-page">
      <Link href="/setlists" className="back-link">← Setlists</Link>
      <header className="songs-header">
        <div className="setlist-titlewrap">
          <input
            className="setlist-title-input"
            value={setlist.name}
            onChange={(e) => setlistsRepo.save({ ...setlist, name: e.target.value })}
            onBlur={(e) => { if (!e.target.value.trim()) setlistsRepo.save({ ...setlist, name: 'Untitled set' }); }}
            aria-label="Setlist name"
          />
          <p>{setSongs.length} song{setSongs.length === 1 ? '' : 's'}</p>
        </div>
        <div className="songs-header-actions">
          <button className="btn-ghost" onClick={() => setPicking(true)}>+ Add songs</button>
          <button className="btn-primary" disabled={setSongs.length === 0} onClick={start}>▶ Start set</button>
        </div>
      </header>

      {setSongs.length === 0 ? (
        <div className="songs-empty">
          <strong>This set is empty</strong>
          <p>Add songs from your library to build the running order.</p>
          <button className="btn-primary" onClick={() => setPicking(true)}>Add songs</button>
        </div>
      ) : (
        <ol className="setlist-songs">
          {setSongs.map((s, i) => (
            <li key={s.id} className="setlist-row">
              <span className="setlist-num">{i + 1}</span>
              <Link href={`/songs/${s.id}?setlist=${setlist.id}&i=${i}`} className="setlist-row-link">
                <span className="song-row-title">{s.title}</span>
                {s.artist && <span className="song-row-artist">{s.artist}</span>}
              </Link>
              <div className="setlist-row-actions">
                <button className="setlist-move" onClick={() => setlistsRepo.move(setlist.id, i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="setlist-move" onClick={() => setlistsRepo.move(setlist.id, i, 1)} disabled={i === setSongs.length - 1} aria-label="Move down">↓</button>
                <button className="setlist-remove" onClick={() => setlistsRepo.removeSong(setlist.id, s.id)} aria-label={`Remove ${s.title}`}>×</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {picking && (
        <AddSongsPicker
          inSet={new Set(setlist.songIds)}
          library={library}
          onToggle={(songId, isIn) => (isIn ? setlistsRepo.removeSong(setlist.id, songId) : setlistsRepo.addSong(setlist.id, songId))}
          onClose={() => setPicking(false)}
        />
      )}
    </main>
  );
}

function AddSongsPicker({
  inSet, library, onToggle, onClose,
}: {
  inSet: Set<string>;
  library: { id: string; title: string; artist?: string }[];
  onToggle: (songId: string, isIn: boolean) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose} role="presentation">
      <div ref={dialogRef} className="setlist-picker glass-sheet anim-pop" role="dialog" aria-modal="true" aria-label="Add songs" onMouseDown={(e) => e.stopPropagation()}>
        <div className="setlist-picker-head">
          <h2>Add songs</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {library.length === 0 ? (
          <p className="palette-empty">Your library is empty — import a song first.</p>
        ) : (
          <ul className="setlist-picker-list">
            {library.map((s) => {
              const isIn = inSet.has(s.id);
              return (
                <li key={s.id}>
                  <button type="button" className={`setlist-pick ${isIn ? 'added' : ''}`} onClick={() => onToggle(s.id, isIn)}>
                    <span className="setlist-pick-titles">
                      <span className="song-row-title">{s.title}</span>
                      {s.artist && <span className="song-row-artist">{s.artist}</span>}
                    </span>
                    <span className="setlist-pick-state">{isIn ? '✓ Added' : '+ Add'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
