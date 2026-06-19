'use client';

import { useEffect, useRef, useState } from 'react';
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
import { useFocusTrap } from '../useFocusTrap';
import { SpotifyPicker } from './SpotifyPicker';

type Props = {
  song: Song;
  onChange: (patch: Partial<Song>) => void;
};

/* "Titlerule" — a now-playing line that lives as a third row inside the song
 * title block. Collapsed it reads as an underlined caption whose underline
 * fills with live progress; on hover/focus a grouped-glass control pill morphs
 * open in place (play, art, scrub, expand) without the text reflowing. */
export function SpotifyPanel({ song, onChange }: Props) {
  const auth = useSpotifyAuth();
  const [picking, setPicking] = useState(false);
  const trackId = song.spotifyTrackId;
  const initialQuery = song.title + (song.artist ? ` ${song.artist}` : '');

  const onPick = (track: SpotifyTrack) => {
    onChange({ spotifyTrackId: track.id });
    setPicking(false);
  };

  return (
    <div className="np-host">
      {auth && trackId ? (
        <SpotifyController
          auth={auth}
          trackId={trackId}
          onChangeTrack={() => setPicking(true)}
          onRemove={() => onChange({ spotifyTrackId: undefined })}
        />
      ) : (
        <button
          type="button"
          className="np-rule np-idle"
          data-state="idle"
          onClick={() => (trackId ? startLogin() : setPicking(true))}
          title={trackId ? 'Sign in to play this track' : 'Add a Spotify track'}
        >
          <span className="np-icon"><SpotifyMark /></span>
          <span className="np-text"><b className="np-track">{trackId ? 'Sign in to play' : 'Add Spotify track'}</b></span>
        </button>
      )}

      {picking && (
        <SpotifyPicker initialQuery={initialQuery} onPick={onPick} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}

function SpotifyController({
  auth, trackId, onChangeTrack, onRemove,
}: {
  auth: SpotifyAuth;
  trackId: string;
  onChangeTrack: () => void;
  onRemove: () => void;
}) {
  const storeVolume = useAppStore((s) => s.spotifyVolume);
  const setStoreVolume = useAppStore((s) => s.setSpotifyVolume);
  const initialVolume = useRef(useAppStore.getState().spotifyVolume).current;

  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let created: SpotifyPlayer | null = null;
    let unsubscribe: (() => void) | undefined;
    createPlayer(initialVolume).then((p) => {
      if (cancelled) { p.destroy(); return; }
      created = p;
      unsubscribe = p.subscribe(() => force((v) => v + 1));
      setPlayer(p);
    }).catch((err) => console.error('Spotify player init failed', err));
    return () => {
      cancelled = true;
      unsubscribe?.();
      created?.destroy();
      setPlayer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once per auth
  }, [auth.refreshToken]);

  useEffect(() => {
    player?.setVolume(storeVolume).catch(() => {});
  }, [storeVolume, player]);

  const state = player?.state;
  const isPremiumError = player?.error instanceof PremiumRequiredError;
  const playerReady = player?.ready ?? false;
  const connecting = !playerReady && !isPremiumError;
  const isPlaying = !!state && state.paused === false;

  /* The SDK only emits state on discrete events, so tick a re-render while
   * playing and read the interpolated livePosition() — makes progress glide. */
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => force((v) => v + 1), 250);
    return () => clearInterval(id);
  }, [isPlaying]);

  const position = player?.livePosition() ?? 0;
  const duration = state?.duration ?? 0;
  const liveProgress = duration > 0 ? Math.min(1, position / duration) : 0;

  /* Gesture handler: unlock audio (autoplay policy), then toggle if loaded or
   * (re)load — which also clears the SDK "no list was loaded" error. */
  const togglePlayback = async () => {
    if (!player) return;
    await player.activate();
    if (player.state.trackId) player.togglePlay().catch(() => {});
    else player.play(trackId).catch(() => {});
  };

  return (
    <>
      <NowPlayingRule
        state={state}
        connecting={connecting}
        premiumError={isPremiumError}
        position={position}
        duration={duration}
        liveProgress={liveProgress}
        onToggle={togglePlayback}
        onSeek={(ms) => player?.seek(ms)}
        onExpand={() => setExpanded(true)}
      />
      {expanded && (
        <SpotifyModal
          state={state}
          position={position}
          duration={duration}
          liveProgress={liveProgress}
          connecting={connecting}
          premiumError={isPremiumError}
          error={player?.error ?? null}
          volume={storeVolume}
          setVolume={setStoreVolume}
          onToggle={togglePlayback}
          onSeek={(ms) => player?.seek(ms)}
          onChangeTrack={() => { setExpanded(false); onChangeTrack(); }}
          onRemove={() => { setExpanded(false); onRemove(); }}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}

type UIState = SpotifyPlayer['state'] | undefined;

function NowPlayingRule({
  state, connecting, premiumError, position, duration, liveProgress, onToggle, onSeek, onExpand,
}: {
  state: UIState;
  connecting: boolean;
  premiumError: boolean;
  position: number;
  duration: number;
  liveProgress: number;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onExpand: () => void;
}) {
  const dataState = connecting ? 'connecting'
    : premiumError ? 'premium'
    : !state?.trackName ? 'idle'
    : state.paused ? 'paused' : 'playing';
  const playing = state?.paused === false;
  const showEq = dataState === 'playing' || dataState === 'paused';

  return (
    <div
      className={`np-rule ${premiumError ? 'is-premium' : ''}`}
      data-state={dataState}
      style={{ '--p': liveProgress } as React.CSSProperties}
      tabIndex={0}
      role="group"
      aria-label={state?.trackName ? `Now playing: ${state.trackName}${state.artistName ? ` by ${state.artistName}` : ''}` : 'Spotify'}
    >
      <span className="np-icon" aria-hidden="true">
        {showEq ? <span className="np-eq"><i /><i /><i /></span> : <SpotifyMark />}
      </span>
      <button
        type="button"
        className="np-play"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        disabled={connecting || premiumError}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      {state?.albumImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="np-art" src={state.albumImageUrl} alt="" width={28} height={28} />
      )}
      <span className="np-text">
        <b className="np-track">{state?.trackName ?? (connecting ? 'Connecting…' : premiumError ? 'Premium needed to play in-app' : 'Spotify')}</b>
        {state?.artistName && <><span className="np-dash"> — </span><span className="np-artist">{state.artistName}</span></>}
      </span>
      <span className="np-times" aria-hidden="true"><em>{formatTime(position)}</em><em>{formatTime(duration)}</em></span>
      <input
        type="range"
        className="np-scrub"
        min={0}
        max={duration || 0}
        step={1000}
        value={Math.min(position, duration || 0)}
        onChange={(e) => onSeek(parseInt(e.target.value, 10))}
        aria-label="Seek"
        disabled={!duration}
        style={{ '--pct': `${Math.round(liveProgress * 100)}%` } as React.CSSProperties}
      />
      <button type="button" className="np-expand" onClick={(e) => { e.stopPropagation(); onExpand(); }} aria-label="Open Spotify controls">
        <ExpandIcon />
      </button>
    </div>
  );
}

function SpotifyModal({
  state, position, duration, liveProgress, connecting, premiumError, error, volume, setVolume,
  onToggle, onSeek, onChangeTrack, onRemove, onClose,
}: {
  state: UIState;
  position: number;
  duration: number;
  liveProgress: number;
  connecting: boolean;
  premiumError: boolean;
  error: Error | null;
  volume: number;
  setVolume: (v: number) => void;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onChangeTrack: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose} role="presentation">
      <div ref={ref} className="sf-modal glass-sheet anim-pop" role="dialog" aria-modal="true" aria-label="Spotify player" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sf-modal-head">
          <SpotifyMark />
          <span className="sf-modal-title">Spotify</span>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {premiumError ? (
          <p className="sf-modal-msg">Spotify Premium is required for in-app playback. You can still search and pick tracks.</p>
        ) : connecting ? (
          <p className="sf-modal-msg">Connecting to Spotify…</p>
        ) : (
          <>
            <div className="sf-now">
              {state?.albumImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={state.albumImageUrl} alt="" className="sf-now-cover" width={72} height={72} />
                : <span className="sf-now-cover sf-now-cover-empty" />}
              <div className="sf-now-meta">
                <span className="sf-now-title">{state?.trackName ?? '—'}</span>
                <span className="sf-now-artist">{state?.artistName ?? ''}</span>
              </div>
              <button type="button" className="spotify-play-btn" onClick={onToggle} aria-label={state?.paused === false ? 'Pause' : 'Play'}>
                {state?.paused === false ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>

            <div className="spotify-player-scrub">
              <span className="spotify-time">{formatTime(position)}</span>
              <input
                type="range" min={0} max={duration} step={1000}
                value={Math.min(position, duration)}
                onChange={(e) => onSeek(parseInt(e.target.value, 10))}
                aria-label="Position" className="spotify-scrub"
                style={{ '--pct': `${Math.round(liveProgress * 100)}%` } as React.CSSProperties}
                disabled={!duration}
              />
              <span className="spotify-time">{formatTime(duration)}</span>
            </div>

            <div className="spotify-controls">
              <SpeakerIcon level={volume} />
              <input
                type="range" min={0} max={100} step={1}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(parseInt(e.target.value, 10) / 100)}
                aria-label="Volume" className="spotify-volume"
                style={{ '--pct': `${Math.round(volume * 100)}%` } as React.CSSProperties}
              />
              <span className="spotify-volume-value">{Math.round(volume * 100)}</span>
            </div>
          </>
        )}

        {error && !premiumError && <p className="spotify-error-note">{error.message}</p>}

        <div className="sf-modal-foot">
          <span className="sf-modal-foot-spacer" />
          <button type="button" className="link-btn" onClick={onChangeTrack}>Change track</button>
          <button type="button" className="link-btn" onClick={signOut}>Sign out</button>
          <button type="button" className="link-btn link-btn-muted" onClick={onRemove}>Remove</button>
        </div>
      </div>
    </div>
  );
}

/* Detect the auth code on first mount (after Spotify redirects back) and keep
 * the component reactive to the current localStorage auth state. */
function useSpotifyAuth(): SpotifyAuth | null {
  const [auth, setAuth] = useState<SpotifyAuth | null>(() => loadAuth());
  useEffect(() => {
    handleAuthCallback().then((next) => { if (next) setAuth(next); }).catch(() => {});
  }, []);
  useEffect(() => {
    const onStorage = () => setAuth(loadAuth());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return auth;
}

function signOut() {
  clearAuth();
  window.location.reload();
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor">
      <path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.7-1.6-6.1-2-10.2-1.1a.75.75 0 1 1-.3-1.5c4.4-1 8.2-.6 11.2 1.2a.75.75 0 0 1 .3 1.1Zm1.5-3.2a.94.94 0 0 1-1.3.3c-3.1-1.9-7.8-2.4-11.5-1.3a.94.94 0 0 1-.6-1.8c4.2-1.3 9.3-.7 12.9 1.5a.94.94 0 0 1 .5 1.3Zm.1-3.4c-3.7-2.2-9.8-2.4-13.3-1.3a1.13 1.13 0 1 1-.7-2.1c4.1-1.3 10.8-1 15 1.5a1.13 1.13 0 0 1-1 2Z" />
    </svg>
  );
}
function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>;
}
function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
    </svg>
  );
}
function SpeakerIcon({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
      {level > 0.05 && <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />}
      {level > 0.5 && <path d="M17.5 7a7 7 0 0 1 0 10" />}
    </svg>
  );
}
