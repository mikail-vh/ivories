/* Wrapper around the Spotify Web Playback SDK. Singleton — only one Player
 * is allocated per page. Premium-only by Spotify's own enforcement (the
 * `account_error` event fires with a Premium-required message for free
 * accounts). We surface that as a typed error so the UI can show a clear
 * message instead of looking broken. */

import { refreshIfNeeded } from './spotify-auth';

type PlayerState = {
  paused: boolean;
  position: number;
  duration: number;
  trackId: string | null;
  trackName: string | null;
  artistName: string | null;
  albumImageUrl: string | null;
};

type SpotifySDK = {
  Player: new (options: PlayerOptions) => SpotifyPlayerInstance;
};

type PlayerOptions = {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
};

type SpotifyPlayerEvent =
  | 'ready' | 'not_ready'
  | 'player_state_changed'
  | 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error';

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: SpotifyPlayerEvent, cb: (data: unknown) => void) => void;
  removeListener: (event: SpotifyPlayerEvent) => void;
  resume: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  getVolume: () => Promise<number>;
  getCurrentState: () => Promise<RawState | null>;
};

type RawState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: RawTrack };
};
type RawTrack = {
  id: string | null;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: SpotifySDK;
  }
}

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js';
let sdkPromise: Promise<SpotifySDK> | null = null;

function loadSDK(): Promise<SpotifySDK> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Spotify) return Promise.resolve(window.Spotify);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<SpotifySDK>((resolve) => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (window.Spotify) resolve(window.Spotify);
    };
    if (!document.querySelector(`script[src="${SDK_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = SDK_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return sdkPromise;
}

export class PremiumRequiredError extends Error {
  constructor() { super('Spotify Premium required'); this.name = 'PremiumRequiredError'; }
}

export type SpotifyPlayer = {
  state: PlayerState;
  deviceId: string | null;
  ready: boolean;
  play: (trackId: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  /* Last fatal error from the SDK or API. Cleared on a successful play. */
  error: Error | null;
  /* Subscribe to state/error/ready changes. Returns an unsubscribe fn. */
  subscribe: (cb: () => void) => () => void;
  destroy: () => void;
};

function toState(raw: RawState | null): PlayerState {
  if (!raw) return { paused: true, position: 0, duration: 0, trackId: null, trackName: null, artistName: null, albumImageUrl: null };
  const t = raw.track_window.current_track;
  return {
    paused: raw.paused,
    position: raw.position,
    duration: raw.duration,
    trackId: t.id,
    trackName: t.name,
    artistName: t.artists.map(a => a.name).join(', '),
    albumImageUrl: t.album.images[0]?.url ?? null,
  };
}

export async function createPlayer(initialVolume = 0.7): Promise<SpotifyPlayer> {
  const SDK = await loadSDK();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(fn => fn());

  let deviceId: string | null = null;
  let ready = false;
  let state: PlayerState = toState(null);
  let error: Error | null = null;

  const instance = new SDK.Player({
    name: 'Music practice tool',
    getOAuthToken: async (cb) => {
      const a = await refreshIfNeeded();
      if (a) cb(a.accessToken);
    },
    volume: initialVolume,
  });

  instance.addListener('ready', (data) => {
    deviceId = (data as { device_id: string }).device_id;
    ready = true;
    notify();
  });
  instance.addListener('not_ready', () => {
    ready = false;
    notify();
  });
  instance.addListener('player_state_changed', (raw) => {
    state = toState(raw as RawState | null);
    notify();
  });
  instance.addListener('account_error', () => {
    /* Spotify dispatches this for free accounts attempting to use the SDK. */
    error = new PremiumRequiredError();
    notify();
  });
  instance.addListener('authentication_error', (e) => {
    error = new Error('Spotify authentication failed: ' + ((e as { message?: string }).message ?? ''));
    notify();
  });
  instance.addListener('initialization_error', (e) => {
    error = new Error('Spotify SDK init failed: ' + ((e as { message?: string }).message ?? ''));
    notify();
  });
  instance.addListener('playback_error', (e) => {
    error = new Error('Spotify playback error: ' + ((e as { message?: string }).message ?? ''));
    notify();
  });

  await instance.connect();

  /* Start playing a given track on our SDK device. Spotify's SDK doesn't have
   * a direct loadUri — we use the Web API's PUT /v1/me/player/play with the
   * device_id to point at the in-browser device we just created. */
  const play = async (trackId: string) => {
    const a = await refreshIfNeeded();
    if (!a) throw new Error('Not signed in');
    if (!deviceId) throw new Error('Player not ready');
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${a.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    });
    if (res.status === 403) {
      error = new PremiumRequiredError();
      notify();
      throw error;
    }
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => '');
      throw new Error(`Spotify play failed: ${res.status} ${text}`);
    }
    error = null;
    notify();
  };

  return {
    get state() { return state; },
    get deviceId() { return deviceId; },
    get ready() { return ready; },
    get error() { return error; },
    play,
    pause: () => instance.pause(),
    resume: () => instance.resume(),
    togglePlay: () => instance.togglePlay(),
    seek: (positionMs) => instance.seek(positionMs),
    setVolume: (volume) => instance.setVolume(volume),
    subscribe: (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    destroy: () => instance.disconnect(),
  };
}

export function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '0:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
