'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSong, songsRepo, rehydrateSongs } from '@/lib/storage';
import { useAppStore } from '@/lib/store';
import { parseChordPro, parseChordSymbol, type Song, type StickyNote as StickyNoteType } from '@/lib/songs';
import { NOTE_NAMES_SHARP } from '@/lib/music';
import { SongRenderer } from './SongRenderer';
import { ChordPalette } from './ChordPalette';
import { StickyNote, NOTE_COLORS } from './StickyNote';

export function SongDetail({ id }: { id: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { rehydrateSongs().then(() => setHydrated(true)); }, []);
  useEffect(() => { useAppStore.persist.rehydrate(); }, []);

  const song = useSong(id);
  const showChordPalette = useAppStore((s) => s.showChordPalette);

  if (!hydrated) return <main className="song-page" />;
  if (!song) {
    return (
      <main className="song-page">
        <div className="songs-empty">
          <strong>Song not found</strong>
          <p>It may have been deleted. <Link href="/songs">Back to songs</Link>.</p>
        </div>
      </main>
    );
  }

  return <SongDetailLoaded song={song} showPalette={showChordPalette} />;
}

function SongDetailLoaded({ song, showPalette }: { song: Song; showPalette: boolean }) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const layout = useAppStore((s) => s.songLayout);
  const setSongLayout = useAppStore((s) => s.setSongLayout);

  const notesByLine = useMemo(() => {
    const map: Record<string, StickyNoteType[]> = {};
    for (const n of song.notes) (map[n.lineId] ??= []).push(n);
    return map;
  }, [song.notes]);

  const firstLineId = useMemo(() => {
    const sections = parseChordPro(song.body).sections;
    for (const sec of sections) {
      for (const line of sec.lines) {
        if (line.kind === 'lyric') return line.id;
      }
    }
    return sections[0]?.lines[0]?.id ?? 's0:l0';
  }, [song.body]);

  const updateSong = (patch: Partial<Song>) => {
    songsRepo.save({ ...song, ...patch });
  };

  const addNote = () => {
    const note: StickyNoteType = {
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      lineId: firstLineId,
      text: '',
      color: NOTE_COLORS[0],
      dx: 12,
      dy: 28,
      w: 180,
      h: 80,
    };
    updateSong({ notes: [...song.notes, note] });
  };

  const updateNote = (next: StickyNoteType) => {
    updateSong({ notes: song.notes.map(n => n.id === next.id ? next : n) });
  };

  const deleteNote = (id: string) => {
    updateSong({ notes: song.notes.filter(n => n.id !== id) });
  };

  return (
    <main className={`song-page layout-${layout} ${showPalette ? 'with-palette' : ''}`}>
      <div className="song-main">
        <header className="song-meta">
          <Link href="/songs" className="back-link">← Songs</Link>
          {editingMeta ? (
            <MetaEditor song={song} onSave={(p) => { updateSong(p); setEditingMeta(false); }} onCancel={() => setEditingMeta(false)} />
          ) : (
            <div className="song-meta-row">
              <div className="song-meta-titles">
                <h1>{song.title}</h1>
                {song.artist && <p className="song-meta-artist">{song.artist}</p>}
              </div>
              <div className="song-meta-chips">
                {song.key && <span className="chip">key {song.key}</span>}
                {song.tempo && <span className="chip">{song.tempo} bpm</span>}
                {song.capo && <span className="chip">capo {song.capo}</span>}
                <KeySwitcher
                  song={song}
                  onChange={(t) => updateSong({ transpose: t })}
                />
              </div>
              <div className="song-meta-actions">
                <div className="layout-toggle" role="tablist" aria-label="Layout mode">
                  <button
                    type="button"
                    className={`layout-btn ${layout === 'flow' ? 'active' : ''}`}
                    onClick={() => setSongLayout('flow')}
                    title="Vertical flow: traditional one-column layout"
                    aria-pressed={layout === 'flow'}
                  >
                    <FlowIcon /> Flow
                  </button>
                  <button
                    type="button"
                    className={`layout-btn ${layout === 'grid' ? 'active' : ''}`}
                    onClick={() => setSongLayout('grid')}
                    title="Grid: sections side-by-side, less scrolling"
                    aria-pressed={layout === 'grid'}
                  >
                    <GridIcon /> Grid
                  </button>
                </div>
                <button className="action-note" onClick={addNote} title="Add a sticky note">
                  <span className="action-icon">+</span> Note
                </button>
                <button className="action-secondary" onClick={() => setEditingBody(true)}>Edit lyrics</button>
                <button className="action-secondary" onClick={() => setEditingMeta(true)}>Edit info</button>
              </div>
            </div>
          )}
        </header>

        {editingBody ? (
          <BodyEditor
            body={song.body}
            onSave={(b) => { updateSong({ body: b }); setEditingBody(false); }}
            onCancel={() => setEditingBody(false)}
          />
        ) : (
          <SongRenderer
            body={song.body}
            transpose={song.transpose}
            renderLineOverlay={(lineId) => {
              const list = notesByLine[lineId];
              if (!list?.length) return null;
              return list.map((n) => (
                <StickyNote
                  key={n.id}
                  note={n}
                  onChange={updateNote}
                  onDelete={deleteNote}
                />
              ));
            }}
          />
        )}
      </div>

      {showPalette && (
        <div className="song-rail">
          <ChordPalette song={song} />
        </div>
      )}
    </main>
  );
}

function KeySwitcher({ song, onChange }: { song: Song; onChange: (transpose: number) => void }) {
  const originalPc = effectiveOriginalKeyPc(song);
  const currentPc = ((originalPc + song.transpose) % 12 + 12) % 12;
  const onPick = (newPc: number) => {
    let semis = newPc - originalPc;
    while (semis > 6) semis -= 12;
    while (semis < -5) semis += 12;
    onChange(semis);
  };
  return (
    <label className="key-switcher" title="Pick a key — chords transpose to match">
      <span className="key-label">Key</span>
      <select
        className="key-select"
        value={currentPc}
        onChange={(e) => onPick(parseInt(e.target.value, 10))}
      >
        {NOTE_NAMES_SHARP.map((n, pc) => (
          <option key={pc} value={pc}>{n}</option>
        ))}
      </select>
      {song.transpose === 0 ? (
        <span className="key-orig">orig</span>
      ) : (
        <button
          type="button"
          className="key-reset"
          onClick={(e) => { e.preventDefault(); onChange(0); }}
          title="Back to original key"
        >
          ↺
        </button>
      )}
    </label>
  );
}

function effectiveOriginalKeyPc(song: Song): number {
  if (song.key) {
    const m = song.key.match(/^([A-G][#b♯♭]?)/);
    if (m) {
      const p = parseChordSymbol(m[1]);
      if (p) return p.rootPc;
    }
  }
  const sections = parseChordPro(song.body).sections;
  for (const s of sections) {
    for (const l of s.lines) {
      for (const t of l.tokens) {
        if (t.kind === 'chord') {
          const p = parseChordSymbol(t.text);
          if (p) return p.rootPc;
        }
      }
    }
  }
  return 0;
}

function MetaEditor({
  song, onSave, onCancel,
}: {
  song: Song;
  onSave: (p: Partial<Song>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? '');
  const [key, setKey] = useState(song.key ?? '');
  const [tempo, setTempo] = useState(song.tempo ?? '');

  return (
    <div className="meta-editor">
      <label className="field">
        <span className="field-label">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Artist</span>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="field-label">Key</span>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. G" />
        </label>
        <label className="field">
          <span className="field-label">Tempo</span>
          <input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="bpm" />
        </label>
      </div>
      <div className="meta-editor-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({
          title: title.trim() || song.title,
          artist: artist.trim() || undefined,
          key: key.trim() || undefined,
          tempo: tempo.trim() || undefined,
        })}>Save</button>
      </div>
    </div>
  );
}

function FlowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="14" y2="17" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}

function BodyEditor({
  body, onSave, onCancel,
}: {
  body: string;
  onSave: (b: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(body);
  return (
    <div className="body-editor">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} />
      <div className="body-editor-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(text)}>Save</button>
      </div>
    </div>
  );
}
