/* Backup / restore for the all-localStorage library.
 *
 * Everything the app stores lives in two localStorage keys — the song library
 * (`music:songs:v1`) and preferences (`piano-app:v1`). A single cache clear
 * wipes both, so we let users export a JSON snapshot and import it back. Songs
 * are merged by id (import never deletes); prefs are optional. */

import { songsRepo } from './storage';
import { useAppStore } from './store';
import type { Song } from './songs';

const SONGS_KEY = 'music:songs:v1';
const PREFS_KEY = 'piano-app:v1';
const BACKUP_APP = 'music-practice';

export type Backup = {
  app: string;
  backupVersion: number;
  exportedAt: string;
  songs: unknown;
  prefs: unknown;
};

export function buildBackup(): string {
  const read = (k: string) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const payload: Backup = {
    app: BACKUP_APP,
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    songs: read(SONGS_KEY),
    prefs: read(PREFS_KEY),
  };
  return JSON.stringify(payload, null, 2);
}

/* Trigger a file download of the current backup. */
export function downloadBackup() {
  const blob = new Blob([buildBackup()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `music-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type RestoreResult = { songs: number; prefs: boolean };

/* Merge a backup into the current library. Songs are upserted by id (existing
 * songs with the same id are overwritten; nothing is deleted). Prefs, if
 * present and applied, are shallow-merged into the store. */
export function restoreBackup(text: string, opts: { includePrefs?: boolean } = {}): RestoreResult {
  const data = JSON.parse(text) as Partial<Backup>;
  if (!data || typeof data !== 'object') throw new Error('Not a valid backup file.');
  if (data.app && data.app !== BACKUP_APP) throw new Error('This file is not a Music backup.');

  let songCount = 0;
  const songsPayload = data.songs as { state?: { songs?: Record<string, Song> } } | null;
  const songMap = songsPayload?.state?.songs;
  if (songMap && typeof songMap === 'object') {
    for (const song of Object.values(songMap)) {
      if (song && typeof song.id === 'string' && typeof song.body === 'string') {
        songsRepo.save(song);
        songCount += 1;
      }
    }
  }

  let prefsApplied = false;
  if (opts.includePrefs) {
    const prefsPayload = data.prefs as { state?: Record<string, unknown> } | null;
    if (prefsPayload?.state && typeof prefsPayload.state === 'object') {
      useAppStore.setState(prefsPayload.state as Partial<ReturnType<typeof useAppStore.getState>>);
      prefsApplied = true;
    }
  }

  return { songs: songCount, prefs: prefsApplied };
}
