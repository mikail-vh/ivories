'use client';

import { useState } from 'react';
import { embedUrl, type SpotifyTrack } from '@/lib/spotify';
import type { Song } from '@/lib/songs';
import { SpotifyPicker } from './SpotifyPicker';

type Props = {
  song: Song;
  onChange: (patch: Partial<Song>) => void;
};

export function SpotifyPanel({ song, onChange }: Props) {
  const [picking, setPicking] = useState(false);

  const initialQuery = song.title + (song.artist ? ` ${song.artist}` : '');

  const onPick = (track: SpotifyTrack) => {
    onChange({ spotifyTrackId: track.id });
    setPicking(false);
  };

  return (
    <section className="spotify-panel" aria-label="Spotify playback">
      {song.spotifyTrackId ? (
        <>
          <iframe
            key={song.spotifyTrackId}
            src={embedUrl(song.spotifyTrackId)}
            className="spotify-embed"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify player"
          />
          <div className="spotify-panel-actions">
            <button type="button" className="link-btn" onClick={() => setPicking(true)}>
              Change track
            </button>
            <button
              type="button"
              className="link-btn link-btn-muted"
              onClick={() => onChange({ spotifyTrackId: undefined })}
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="spotify-find-btn"
          onClick={() => setPicking(true)}
        >
          <SpotifyMark /> Find on Spotify
        </button>
      )}

      {picking && (
        <SpotifyPicker
          initialQuery={initialQuery}
          onPick={onPick}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.7-1.6-6.1-2-10.2-1.1a.75.75 0 1 1-.3-1.5c4.4-1 8.2-.6 11.2 1.2a.75.75 0 0 1 .3 1.1Zm1.5-3.2a.94.94 0 0 1-1.3.3c-3.1-1.9-7.8-2.4-11.5-1.3a.94.94 0 0 1-.6-1.8c4.2-1.3 9.3-.7 12.9 1.5a.94.94 0 0 1 .5 1.3Zm.1-3.4c-3.7-2.2-9.8-2.4-13.3-1.3a1.13 1.13 0 1 1-.7-2.1c4.1-1.3 10.8-1 15 1.5a1.13 1.13 0 0 1-1 2Z" />
    </svg>
  );
}
