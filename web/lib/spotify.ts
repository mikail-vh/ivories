/* Client-safe Spotify helpers. No secrets, no network. */

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  imageUrl?: string;
  durationMs: number;
};

const TRACK_ID_RE = /^[A-Za-z0-9]{22}$/;

/* Accept full URLs (open.spotify.com/track/<id> with optional ?si=…),
 * spotify URIs (spotify:track:<id>), or a bare 22-char ID. */
export function extractTrackId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (TRACK_ID_RE.test(s)) return s;

  const uriMatch = s.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];

  try {
    const url = new URL(s);
    if (!/(^|\.)spotify\.com$/.test(url.hostname)) return null;
    const m = url.pathname.match(/\/track\/([A-Za-z0-9]{22})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function embedUrl(trackId: string): string {
  return `https://open.spotify.com/embed/track/${trackId}`;
}
