/* Songs repository, designed to swap backends without touching UI.
 *
 * Today: a zustand-backed in-memory map persisted to localStorage.
 * Tomorrow: replace the implementation behind `songsRepo` with IndexedDB,
 * Supabase, etc. Components only see the repo interface and the React hooks. */

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Song, type SongMeta } from './songs';

type SongsState = {
  songs: Record<string, Song>;
  upsert: (song: Song) => void;
  remove: (id: string) => void;
};

export const useSongsStore = create<SongsState>()(
  persist(
    (set) => ({
      songs: {},
      upsert: (song) =>
        set((state) => ({ songs: { ...state.songs, [song.id]: { ...song, updatedAt: Date.now() } } })),
      remove: (id) =>
        set((state) => {
          const next = { ...state.songs };
          delete next[id];
          return { songs: next };
        }),
    }),
    {
      name: 'music:songs:v1',
      skipHydration: true,
    }
  )
);

export async function rehydrateSongs(): Promise<void> {
  await Promise.resolve(useSongsStore.persist.rehydrate());
}

export const songsRepo = {
  list(): SongMeta[] {
    return Object.values(useSongsStore.getState().songs)
      .map(s => ({ id: s.id, title: s.title, artist: s.artist, key: s.key, updatedAt: s.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Song | null {
    return useSongsStore.getState().songs[id] ?? null;
  },
  save(song: Song): void {
    useSongsStore.getState().upsert(song);
  },
  delete(id: string): void {
    useSongsStore.getState().remove(id);
  },
};

const EMPTY_LIST: SongMeta[] = [];

export function useSongList(): SongMeta[] {
  return useSyncExternalStore(
    (cb) => useSongsStore.subscribe(cb),
    () => songsListSnapshot(),
    () => EMPTY_LIST,
  );
}

let lastSnapshot: { songs: Record<string, Song> | null; result: SongMeta[] } = { songs: null, result: [] };
function songsListSnapshot(): SongMeta[] {
  const songs = useSongsStore.getState().songs;
  if (lastSnapshot.songs === songs) return lastSnapshot.result;
  const result = Object.values(songs)
    .map(s => ({ id: s.id, title: s.title, artist: s.artist, key: s.key, updatedAt: s.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  lastSnapshot = { songs, result };
  return result;
}

export function useSong(id: string): Song | null {
  return useSyncExternalStore(
    (cb) => useSongsStore.subscribe(cb),
    () => useSongsStore.getState().songs[id] ?? null,
    () => null,
  );
}
