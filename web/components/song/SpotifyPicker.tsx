'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDuration, type SpotifyTrack } from '@/lib/spotify';

type Props = {
  initialQuery?: string;
  onPick: (track: SpotifyTrack) => void;
  onClose: () => void;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; tracks: SpotifyTrack[] }
  | { kind: 'not_configured' }
  | { kind: 'error'; message: string };

export function SpotifyPicker({ initialQuery = '', onPick, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus({ kind: 'loading' });
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.status === 503) { setStatus({ kind: 'not_configured' }); return; }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus({ kind: 'error', message: data.message ?? `Search failed (${res.status})` });
          return;
        }
        const data = (await res.json()) as { tracks: SpotifyTrack[] };
        setStatus({ kind: 'ok', tracks: data.tracks });
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Search failed' });
      }
    }, 250);

    return () => { controller.abort(); clearTimeout(timer); };
  }, [query]);

  const onQueryChange = (next: string) => {
    setQuery(next);
    if (!next.trim()) setStatus({ kind: 'idle' });
  };

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dialog spotify-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>Find on Spotify</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="dialog-body">
          <label className="field">
            <span className="field-label">Search <span className="field-hint">artist + title works best</span></span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="e.g. Tracy Chapman Fast Car"
            />
          </label>

          <div className="spotify-results" role="listbox" aria-label="Search results">
            {status.kind === 'idle' && (
              <p className="spotify-hint">Type to search Spotify.</p>
            )}
            {status.kind === 'loading' && (
              <p className="spotify-hint">Searching…</p>
            )}
            {status.kind === 'not_configured' && (
              <div className="spotify-error">
                <strong>Spotify isn&apos;t configured.</strong>
                <p>
                  Add <code>SPOTIFY_CLIENT_ID</code> and <code>SPOTIFY_CLIENT_SECRET</code> to <code>.env.local</code> and restart the dev server.
                </p>
              </div>
            )}
            {status.kind === 'error' && (
              <div className="spotify-error">
                <strong>Search failed.</strong>
                <p>{status.message}</p>
              </div>
            )}
            {status.kind === 'ok' && status.tracks.length === 0 && (
              <p className="spotify-hint">No results.</p>
            )}
            {status.kind === 'ok' && status.tracks.map(track => (
              <button
                key={track.id}
                type="button"
                className="spotify-result"
                onClick={() => onPick(track)}
              >
                {track.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.imageUrl} alt="" className="spotify-cover" width={48} height={48} />
                ) : (
                  <div className="spotify-cover spotify-cover-placeholder" />
                )}
                <div className="spotify-result-meta">
                  <span className="spotify-result-title">{track.name}</span>
                  <span className="spotify-result-sub">
                    {track.artists.join(', ')} · {track.album}
                  </span>
                </div>
                <span className="spotify-result-duration">{formatDuration(track.durationMs)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
