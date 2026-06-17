'use client';

import { useEffect, useState } from 'react';
import { type SpotifyTrack } from '@/lib/spotify';
import type { Song } from '@/lib/songs';
import {
  clearAuth,
  handleAuthCallback,
  loadAuth,
  startLogin,
  type SpotifyAuth,
} from '@/lib/spotify-auth';
import {
  createPlayer,
  formatTime,
  PremiumRequiredError,
  type SpotifyPlayer,
} from '@/lib/spotify-player';
import { useAppStore } from '@/lib/store';
import { SpotifyPicker } from './SpotifyPicker';

type Props = {
  song: Song;
  onChange: (patch: Partial<Song>) => void;
};

export function SpotifyPanel({ song, onChange }: Props) {
  const [picking, setPicking] = useState(false);
  const auth = useSpotifyAuth();

  const initialQuery = song.title + (song.artist ? ` ${song.artist}` : '');

  const onPick = (track: SpotifyTrack) => {
    onChange({ spotifyTrackId: track.id });
    setPicking(false);
  };

  return (
    <section className="spotify-panel" aria-label="Spotify playback">
      {!auth ? (
        <SignInButton hasTrack={!!song.spotifyTrackId} onPick={() => setPicking(true)} />
      ) : song.spotifyTrackId ? (
        <SpotifyPlayerUI
          auth={auth}
          trackId={song.spotifyTrackId}
          onChangeTrack={() => setPicking(true)}
          onRemove={() => onChange({ spotifyTrackId: undefined })}
        />
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

/* Detect the auth code on first mount (after Spotify redirects back) and
 * keep the rest of the component reactive to the current localStorage state. */
function useSpotifyAuth(): SpotifyAuth | null {
  const [auth, setAuth] = useState<SpotifyAuth | null>(() => loadAuth());

  useEffect(() => {
    handleAuthCallback().then((next) => {
      if (next) setAuth(next);
    }).catch(() => { /* leave as-is — sign in button will appear */ });
  }, []);

  useEffect(() => {
    const onStorage = () => setAuth(loadAuth());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return auth;
}

function SignInButton({ hasTrack, onPick }: { hasTrack: boolean; onPick: () => void }) {
  return (
    <div className="spotify-signin-row">
      <button
        type="button"
        className="spotify-find-btn"
        onClick={() => startLogin()}
      >
        <SpotifyMark /> Sign in with Spotify
      </button>
      {!hasTrack && (
        <button type="button" className="link-btn" onClick={onPick}>
          Pick a track first
        </button>
      )}
      <span className="spotify-signin-note">
        Premium required for full-track playback.
      </span>
    </div>
  );
}

function SpotifyPlayerUI({
  auth,
  trackId,
  onChangeTrack,
  onRemove,
}: {
  auth: SpotifyAuth;
  trackId: string;
  onChangeTrack: () => void;
  onRemove: () => void;
}) {
  const initialVolume = useAppStore.getState().spotifyVolume;
  const storeVolume = useAppStore((s) => s.spotifyVolume);
  const setStoreVolume = useAppStore((s) => s.setSpotifyVolume);

  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [, force] = useState(0);

  /* Create the player once. The auth token is fetched lazily by the SDK via
   * the getOAuthToken callback, so we don't need to recreate when it
   * refreshes — only when the user actually signs out. */
  useEffect(() => {
    let cancelled = false;
    let created: SpotifyPlayer | null = null;
    let unsubscribe: (() => void) | undefined;
    createPlayer(initialVolume).then((p) => {
      if (cancelled) { p.destroy(); return; }
      created = p;
      unsubscribe = p.subscribe(() => force(v => v + 1));
      setPlayer(p);
    }).catch((err) => {
      console.error('Spotify player init failed', err);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      created?.destroy();
      setPlayer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-once
  }, [auth.refreshToken]);

  /* Start playing whenever the chosen track changes and the player is ready. */
  useEffect(() => {
    if (!player?.ready) return;
    player.play(trackId).catch(() => { /* error is surfaced via player.error */ });
  }, [trackId, player]);

  /* Push volume changes through. */
  useEffect(() => {
    player?.setVolume(storeVolume).catch(() => {});
  }, [storeVolume, player]);

  const state = player?.state;
  const isPremiumError = player?.error instanceof PremiumRequiredError;

  if (isPremiumError) {
    return (
      <div className="spotify-error">
        <strong>Spotify Premium required.</strong>
        <p>
          The Web Playback SDK only works with a Premium account. You can still
          search and pick tracks — playback in this panel is unavailable.
        </p>
        <div className="spotify-controls">
          <span className="spotify-controls-spacer" />
          <button type="button" className="link-btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  if (!player?.ready) {
    return (
      <div className="spotify-player-loading">
        <span>Connecting to Spotify…</span>
        <span className="spotify-controls-spacer" />
        <button type="button" className="link-btn" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  const progress = state && state.duration > 0 ? state.position / state.duration : 0;

  return (
    <div className="spotify-player">
      <div className="spotify-player-track">
        {state?.albumImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.albumImageUrl} alt="" className="spotify-player-cover" width={48} height={48} />
        )}
        <div className="spotify-player-meta">
          <span className="spotify-player-title">{state?.trackName ?? '—'}</span>
          <span className="spotify-player-artist">{state?.artistName ?? ''}</span>
        </div>
        <button
          type="button"
          className="spotify-play-btn"
          onClick={() => player.togglePlay()}
          aria-label={state?.paused ? 'Play' : 'Pause'}
        >
          {state?.paused ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>

      <div className="spotify-player-scrub">
        <span className="spotify-time">{formatTime(state?.position ?? 0)}</span>
        <input
          type="range"
          min={0}
          max={state?.duration ?? 0}
          step={1000}
          value={state?.position ?? 0}
          onChange={(e) => player.seek(parseInt(e.target.value, 10))}
          aria-label="Spotify position"
          className="spotify-scrub"
          style={{ '--pct': `${Math.round(progress * 100)}%` } as React.CSSProperties}
          disabled={!state?.duration}
        />
        <span className="spotify-time">{formatTime(state?.duration ?? 0)}</span>
      </div>

      <div className="spotify-controls">
        <SpeakerIcon level={storeVolume} />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(storeVolume * 100)}
          onChange={(e) => setStoreVolume(parseInt(e.target.value, 10) / 100)}
          aria-label="Spotify volume"
          className="spotify-volume"
          style={{ '--pct': `${Math.round(storeVolume * 100)}%` } as React.CSSProperties}
        />
        <span className="spotify-volume-value">{Math.round(storeVolume * 100)}</span>
        <span className="spotify-controls-spacer" />
        <button type="button" className="link-btn" onClick={onChangeTrack}>Change track</button>
        <button type="button" className="link-btn" onClick={signOut}>Sign out</button>
        <button type="button" className="link-btn link-btn-muted" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

function signOut() {
  clearAuth();
  /* Force the surrounding component to re-read auth state. The `storage`
   * event only fires on cross-tab updates, so we trigger a reload of the
   * current page instead — simplest cleanup of any SDK + iframe state. */
  window.location.reload();
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.7-1.6-6.1-2-10.2-1.1a.75.75 0 1 1-.3-1.5c4.4-1 8.2-.6 11.2 1.2a.75.75 0 0 1 .3 1.1Zm1.5-3.2a.94.94 0 0 1-1.3.3c-3.1-1.9-7.8-2.4-11.5-1.3a.94.94 0 0 1-.6-1.8c4.2-1.3 9.3-.7 12.9 1.5a.94.94 0 0 1 .5 1.3Zm.1-3.4c-3.7-2.2-9.8-2.4-13.3-1.3a1.13 1.13 0 1 1-.7-2.1c4.1-1.3 10.8-1 15 1.5a1.13 1.13 0 0 1-1 2Z" />
    </svg>
  );
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>;
}

function SpeakerIcon({ level }: { level: number }) {
  const showWave1 = level > 0.05;
  const showWave2 = level > 0.5;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
      {showWave1 && <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />}
      {showWave2 && <path d="M17.5 7a7 7 0 0 1 0 10" />}
    </svg>
  );
}
