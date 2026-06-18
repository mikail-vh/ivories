/* Authorization Code with PKCE — runs entirely in the browser. We never
 * touch the Spotify client secret (there is none in this flow); the only
 * piece of public config is the client ID. Tokens are kept in localStorage
 * so a refresh on the song page picks up where the user left off.
 *
 * Scopes: `streaming` is required for the Web Playback SDK to work. The
 * `user-modify-playback-state` + `user-read-playback-state` scopes let us
 * start tracks on our SDK device and observe what's playing. */

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const TOKEN_KEY = 'music:spotify-auth:v1';
const VERIFIER_KEY = 'music:spotify-verifier';
const RETURN_URL_KEY = 'music:spotify-return-url';
/* The Web Playback SDK requires `streaming`, which Spotify only grants
 * alongside `user-read-email` + `user-read-private`. */
const SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state', 'user-read-playback-state'];

export type SpotifyAuth = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function clientId(): string {
  const id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!id) throw new Error('NEXT_PUBLIC_SPOTIFY_CLIENT_ID is not set');
  return id;
}

function redirectUri(): string {
  /* Use a stable URL so a single Redirect URI entry in the Spotify Dashboard
   * covers every song page. We stash the original URL in sessionStorage and
   * restore it after the token exchange. */
  return `${window.location.origin}/songs`;
}

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(64);
  crypto.getRandomValues(random);
  const verifier = base64UrlEncode(random.buffer);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64UrlEncode(digest) };
}

/* Kick off the OAuth flow: store the verifier, then redirect to Spotify.
 * Spotify will bounce the user back to redirectUri() with `?code=...`. */
export async function startLogin(): Promise<void> {
  const { verifier, challenge } = await makePkce();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  /* Stash where to come back to. The redirect URI itself is fixed so the
   * Spotify Dashboard only needs one entry per environment. */
  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    scope: SCOPES.join(' '),
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    /* Force the consent screen so a previously-granted (narrower) scope set
     * can't leave us with a token missing `streaming`. */
    show_dialog: 'true',
  });
  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

/* Detect & exchange a Spotify auth code from the current URL. Returns the
 * resulting auth blob on success, or null if no `code` param was present.
 * After a successful exchange we clean the query string so a refresh of the
 * page doesn't re-trigger the exchange (which would 400 — codes are one-use). */
export async function handleAuthCallback(): Promise<SpotifyAuth | null> {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return null;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: clientId(),
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify token exchange failed: ${res.status} ${text}`);
  }
  const json = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  const auth: SpotifyAuth = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  saveAuth(auth);
  sessionStorage.removeItem(VERIFIER_KEY);
  /* Restore the user to whatever song page they kicked off from. We use a
   * full `location.replace` (not history.replaceState) because the redirect
   * URI lands on /songs but the user originally clicked sign-in from
   * /songs/<id>, so we need an actual navigation to remount the song page.
   * If no return URL was stashed (e.g. they reloaded /songs?code=… directly)
   * we just strip the query in place. */
  const returnUrl = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  if (returnUrl && returnUrl !== window.location.href) {
    window.location.replace(returnUrl);
  } else {
    const u = new URL(window.location.href);
    u.search = '';
    window.history.replaceState({}, '', u.toString());
  }
  return auth;
}

export function loadAuth(): SpotifyAuth | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyAuth;
  } catch {
    return null;
  }
}

function saveAuth(auth: SpotifyAuth): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* Refresh a near-expired access token. Refresh tokens can rotate (Spotify
 * may return a new one), so we persist whatever comes back. */
export async function refreshIfNeeded(margin = 60_000): Promise<SpotifyAuth | null> {
  const auth = loadAuth();
  if (!auth) return null;
  if (auth.expiresAt > Date.now() + margin) return auth;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
    client_id: clientId(),
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    /* Refresh failed — token may be revoked or invalid. Wipe local state so
     * the UI falls back to the sign-in prompt. */
    clearAuth();
    return null;
  }
  const json = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };
  const next: SpotifyAuth = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? auth.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  saveAuth(next);
  return next;
}
