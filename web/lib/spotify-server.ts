import type { SpotifyTrack } from './spotify';

/* This module reads SPOTIFY_CLIENT_SECRET — only import from server code
 * (route handlers, server components). Never import from a client component. */

/* Client Credentials flow: app-only token, no user data. Good for /search
 * and other public endpoints. Token is cached in-module for the life of the
 * server process. In dev with HMR the module may reload and refetch — fine. */

type TokenCache = { token: string; expiresAt: number };
let cached: TokenCache | null = null;
const REFRESH_MARGIN_MS = 60_000;

export class SpotifyAuthMissingError extends Error {
  constructor() {
    super('Spotify credentials not configured');
    this.name = 'SpotifyAuthMissingError';
  }
}

async function getAppToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + REFRESH_MARGIN_MS) return cached.token;

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new SpotifyAuthMissingError();

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify token request failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cached.token;
}

type RawTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number; height: number }[] };
  duration_ms: number;
};

function pickImage(images: RawTrack['album']['images']): string | undefined {
  if (!images.length) return undefined;
  /* Spotify returns largest-first. Prefer ~64px for list rows. */
  const small = [...images].sort((a, b) => a.width - b.width).find(i => i.width >= 64);
  return (small ?? images[images.length - 1]).url;
}

function toTrack(raw: RawTrack): SpotifyTrack {
  return {
    id: raw.id,
    name: raw.name,
    artists: raw.artists.map(a => a.name),
    album: raw.album.name,
    imageUrl: pickImage(raw.album.images),
    durationMs: raw.duration_ms,
  };
}

export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const q = query.trim();
  if (!q) return [];
  const token = await getAppToken();
  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 20)));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) {
    cached = null;
    throw new Error('Spotify token rejected');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify search failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { tracks?: { items: RawTrack[] } };
  return (data.tracks?.items ?? []).map(toTrack);
}
