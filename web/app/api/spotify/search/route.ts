import { type NextRequest } from 'next/server';
import { SpotifyAuthMissingError, searchTracks } from '@/lib/spotify-server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return Response.json({ tracks: [] });

  try {
    const tracks = await searchTracks(q);
    return Response.json({ tracks });
  } catch (err) {
    if (err instanceof SpotifyAuthMissingError) {
      return Response.json(
        { error: 'not_configured', message: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local' },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? err.message : 'Search failed';
    return Response.json({ error: 'search_failed', message }, { status: 502 });
  }
}
