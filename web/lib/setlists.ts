/* Setlists: named, ordered collections of songs you play through in sequence.
 * Stored client-side like the song library (swappable repo behind the hooks).
 * Songs are referenced by id; deleting a song just leaves a stale id that the
 * UI filters out, so we never need cascading deletes. */

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Setlist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
};

type SetlistsState = {
  setlists: Record<string, Setlist>;
  upsert: (s: Setlist) => void;
  remove: (id: string) => void;
};

export const useSetlistsStore = create<SetlistsState>()(
  persist(
    (set) => ({
      setlists: {},
      upsert: (s) =>
        set((state) => ({ setlists: { ...state.setlists, [s.id]: { ...s, updatedAt: Date.now() } } })),
      remove: (id) =>
        set((state) => {
          const next = { ...state.setlists };
          delete next[id];
          return { setlists: next };
        }),
    }),
    { name: 'music:setlists:v1', skipHydration: true },
  ),
);

export async function rehydrateSetlists(): Promise<void> {
  await Promise.resolve(useSetlistsStore.persist.rehydrate());
}

function newId(): string {
  return `set_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const setlistsRepo = {
  list(): Setlist[] {
    return Object.values(useSetlistsStore.getState().setlists).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Setlist | null {
    return useSetlistsStore.getState().setlists[id] ?? null;
  },
  save(s: Setlist): void {
    useSetlistsStore.getState().upsert(s);
  },
  delete(id: string): void {
    useSetlistsStore.getState().remove(id);
  },
  create(name: string): Setlist {
    const now = Date.now();
    const s: Setlist = { id: newId(), name: name.trim() || 'New set', songIds: [], createdAt: now, updatedAt: now };
    useSetlistsStore.getState().upsert(s);
    return s;
  },
  addSong(id: string, songId: string): void {
    const s = setlistsRepo.get(id);
    if (!s || s.songIds.includes(songId)) return;
    setlistsRepo.save({ ...s, songIds: [...s.songIds, songId] });
  },
  removeSong(id: string, songId: string): void {
    const s = setlistsRepo.get(id);
    if (!s) return;
    setlistsRepo.save({ ...s, songIds: s.songIds.filter((x) => x !== songId) });
  },
  move(id: string, index: number, dir: -1 | 1): void {
    const s = setlistsRepo.get(id);
    if (!s) return;
    const target = index + dir;
    if (target < 0 || target >= s.songIds.length) return;
    const ids = [...s.songIds];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setlistsRepo.save({ ...s, songIds: ids });
  },
};

const EMPTY: Setlist[] = [];
let listSnap: { map: Record<string, Setlist> | null; result: Setlist[] } = { map: null, result: [] };

export function useSetlists(): Setlist[] {
  return useSyncExternalStore(
    (cb) => useSetlistsStore.subscribe(cb),
    () => {
      const map = useSetlistsStore.getState().setlists;
      if (listSnap.map === map) return listSnap.result;
      const result = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
      listSnap = { map, result };
      return result;
    },
    () => EMPTY,
  );
}

export function useSetlist(id: string): Setlist | null {
  return useSyncExternalStore(
    (cb) => useSetlistsStore.subscribe(cb),
    () => useSetlistsStore.getState().setlists[id] ?? null,
    () => null,
  );
}
