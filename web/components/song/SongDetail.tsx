'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSong, songsRepo, rehydrateSongs } from '@/lib/storage';
import { useAppStore } from '@/lib/store';
import {
  parseChordPro,
  parseChordSymbol,
  applyArrangement,
  type Song,
  type Section as SongSection,
  type SongArrangement,
  type SectionPosition,
  type SongRoadmap,
  type StickyNote as StickyNoteType,
} from '@/lib/songs';
import { NOTE_NAMES_SHARP } from '@/lib/music';
import { SongRenderer, type CanvasHandlers } from './SongRenderer';
import { ChordPalette } from './ChordPalette';
import { Roadmap } from './Roadmap';
import { SpotifyPanel } from './SpotifyPanel';
import { SongToolbar } from './SongToolbar';
import { useAutoscroll } from './useAutoscroll';
import { StickyNote, NOTE_COLORS } from './StickyNote';
import { extractTrackId } from '@/lib/spotify';
import type { GridPreset, LyricSize } from '@/lib/store';

export function SongDetail({ id }: { id: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { rehydrateSongs().then(() => setHydrated(true)); }, []);
  useEffect(() => { useAppStore.persist.rehydrate(); }, []);

  /* Lock html + body to viewport size while mounted. Inline styles beat any
   * CSS rule (including `!important`) so this gives us a hard guarantee that
   * neither root element can scroll — only the song-page itself does. We
   * also reset any existing scroll position the user may already be at, so
   * remounting the song page can't leave the document offset to the right. */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlWidth: html.style.width,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyWidth: body.style.width,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
    html.style.overflow = 'hidden';
    html.style.height = '100vh';
    html.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.height = '100vh';
    body.style.width = '100%';
    html.classList.add('song-page-active');
    body.classList.add('song-page-active');
    window.scrollTo(0, 0);
    /* Also reset the song-page's internal scroll: with `overflow-y: auto` it
     * has its own scroll independent of the window, and with the flex-column
     * layout at narrow widths it can land mid-content if the layout settled
     * before all children measured. */
    requestAnimationFrame(() => {
      const sp = document.querySelector<HTMLElement>('main.song-page');
      if (sp) sp.scrollTo(0, 0);
    });
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.width = prev.htmlWidth;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.width = prev.bodyWidth;
      html.classList.remove('song-page-active');
      body.classList.remove('song-page-active');
      window.scrollTo(prev.scrollX, prev.scrollY);
    };
  }, []);

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
  const gridPreset = useAppStore((s) => s.songGridPreset);
  const setGridPreset = useAppStore((s) => s.setGridPreset);
  const toggleChordPalette = useAppStore((s) => s.toggleChordPalette);
  const layoutExpanded = useAppStore((s) => s.layoutExpanded);
  const setLayoutExpanded = useAppStore((s) => s.setLayoutExpanded);
  const chordPaletteSide = useAppStore((s) => s.chordPaletteSide);
  const setChordPaletteSide = useAppStore((s) => s.setChordPaletteSide);
  const lyricSize = useAppStore((s) => s.lyricSize);
  const setLyricSize = useAppStore((s) => s.setLyricSize);
  const lyricsOnly = useAppStore((s) => s.lyricsOnly);
  const toggleLyricsOnly = useAppStore((s) => s.toggleLyricsOnly);
  const autoscrollSpeed = useAppStore((s) => s.autoscrollSpeed);
  const setAutoscrollSpeed = useAppStore((s) => s.setAutoscrollSpeed);
  const markSongOpened = useAppStore((s) => s.markSongOpened);

  useEffect(() => { markSongOpened(song.id); }, [song.id, markSongOpened]);

  const songMainRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [draggingSection, setDraggingSection] = useState(false);

  /* Hands-free auto-scroll drives the song-page scroll container. */
  const getScrollEl = useCallback(() => pageRef.current, []);
  const autoscroll = useAutoscroll(getScrollEl, autoscrollSpeed);

  const notesByLine = useMemo(() => {
    const map: Record<string, StickyNoteType[]> = {};
    for (const n of song.notes) (map[n.lineId] ??= []).push(n);
    return map;
  }, [song.notes]);

  const parsedSections = useMemo(
    () => parseChordPro(song.body).sections,
    [song.body],
  );

  const firstLineId = useMemo(() => {
    for (const sec of parsedSections) {
      for (const line of sec.lines) {
        if (line.kind === 'lyric') return line.id;
      }
    }
    return parsedSections[0]?.lines[0]?.id ?? 's0:l0';
  }, [parsedSections]);

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

  /* Arrangement: undefined → auto (parser order, CSS grid). Defined → free-flow
   * canvas with absolute-positioned sections; placed sections render on canvas,
   * unplaced sit in the tray. Flow mode always ignores arrangement. */
  const arrangement = song.arrangement;
  const effectiveArrangement = layout === 'grid' ? arrangement : undefined;
  const customizing = layout === 'grid' && arrangement !== undefined;

  /* Pause auto-scroll whenever we leave the reader (edit/customize modes hide
   * the toolbar but the scroll loop lives here on the parent). */
  useEffect(() => {
    if (editingBody || customizing) autoscroll.stop();
  }, [editingBody, customizing, autoscroll]);
  const { tray: traySections } = useMemo(
    () => applyArrangement(parsedSections, effectiveArrangement),
    [parsedSections, effectiveArrangement],
  );

  const setArrangement = (next: SongArrangement | undefined) => updateSong({ arrangement: next });

  /* Snapshot the current grid layout's pixel positions so the user starts
   * customizing from the same visual state. Without a snapshot, sections would
   * default-cascade into a 2-col grid that may not match what they had. */
  const customizeLayout = () => {
    const container = songMainRef.current?.querySelector<HTMLElement>('.song-body');
    const positions: Record<string, SectionPosition> = {};
    if (container) {
      const containerRect = container.getBoundingClientRect();
      container.querySelectorAll<HTMLElement>('[data-section-id]').forEach((el) => {
        const id = el.dataset.sectionId;
        if (!id) return;
        const r = el.getBoundingClientRect();
        positions[id] = {
          x: Math.max(0, Math.round(r.left - containerRect.left)),
          y: Math.max(0, Math.round(r.top - containerRect.top)),
          w: Math.round(r.width),
        };
      });
    }
    setArrangement({ placed: parsedSections.map((s) => s.id), positions });
  };
  const clearBoard = () => setArrangement({ placed: [], positions: arrangement?.positions });
  const resetArrangement = () => setArrangement(undefined);

  /* Append a tray section to the canvas at the cascade slot below all
   * currently-placed sections. The tray "click to place" uses this. */
  const placeFromTray = (id: string) => {
    const placed = arrangement?.placed ?? parsedSections.map((s) => s.id);
    if (placed.includes(id)) return;
    const positions = { ...(arrangement?.positions ?? {}) };
    if (!positions[id]) {
      let maxBottom = 0;
      for (const pid of placed) {
        const p = positions[pid];
        if (p) maxBottom = Math.max(maxBottom, p.y + 240);
      }
      positions[id] = { x: 0, y: maxBottom, w: 380 };
    }
    setArrangement({ placed: [...placed, id], positions });
  };
  const reposition = (updates: Record<string, SectionPosition>) => {
    const placed = arrangement?.placed ?? parsedSections.map((s) => s.id);
    const positions = { ...(arrangement?.positions ?? {}), ...updates };
    setArrangement({ placed, positions });
  };
  const unplace = (ids: string[]) => {
    const placed = arrangement?.placed ?? parsedSections.map((s) => s.id);
    const positions = arrangement?.positions ?? {};
    const idSet = new Set(ids);
    setArrangement({ placed: placed.filter((p) => !idSet.has(p)), positions });
  };
  const canvasHandlers: CanvasHandlers = {
    onReposition: reposition,
    onUnplace: unplace,
    onDragChange: setDraggingSection,
    trayRef,
  };

  const showEmptyHint = customizing && (arrangement?.placed.length ?? 0) === 0;

  /* Roadmap: opt-in panel showing the play order. Toggle from the cog menu;
   * the panel itself drag-positions and lets the user add/remove sections
   * and notes. We render it as a sibling of song-main so it can float over
   * either column without affecting their layout. */
  const roadmap = song.roadmap;
  const roadmapEnabled = roadmap?.enabled ?? false;
  const updateRoadmap = (next: SongRoadmap) => updateSong({ roadmap: next });
  const toggleRoadmap = () => {
    if (roadmapEnabled) {
      updateSong({ roadmap: { ...(roadmap ?? { items: [] }), enabled: false } });
    } else {
      updateSong({
        roadmap: roadmap
          ? { ...roadmap, enabled: true }
          : { enabled: true, items: [] },
      });
    }
  };

  const pageClass = [
    'song-page',
    `layout-${layout}`,
    `preset-${gridPreset}`,
    `lyric-${lyricSize}`,
    layoutExpanded ? 'layout-expanded' : '',
    showPalette ? 'with-palette' : '',
    showPalette && chordPaletteSide === 'left' ? 'palette-left' : '',
    customizing ? 'customizing' : '',
    lyricsOnly ? 'lyrics-only' : '',
  ].filter(Boolean).join(' ');

  const keyLabel = effectiveKeyLabel(song);

  return (
    <main className={pageClass} ref={pageRef}>
      {/* Song meta is a top-level sibling (not inside `.song-main`) so CSS
       * order can place it above the palette on narrow viewports while the
       * palette goes between meta and body. */}
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
            <div className="song-meta-aside">
              <div className="song-meta-chips">
                <KeyChip song={song} />
                {song.tempo && <span className="chip">{song.tempo} bpm</span>}
                {song.capo && <span className="chip">capo {song.capo}</span>}
              </div>
              <button
                type="button"
                className="roadmap-shortcut"
                onClick={toggleRoadmap}
                aria-label="Toggle roadmap"
                aria-pressed={roadmapEnabled}
                title="Roadmap"
              >
                <RoadmapIcon />
              </button>
              <SettingsMenu
                song={song}
                layout={layout}
                setLayout={setSongLayout}
                gridPreset={gridPreset}
                setGridPreset={setGridPreset}
                showPalette={showPalette}
                toggleChordPalette={toggleChordPalette}
                layoutExpanded={layoutExpanded}
                setLayoutExpanded={setLayoutExpanded}
                chordPaletteSide={chordPaletteSide}
                setChordPaletteSide={setChordPaletteSide}
                lyricSize={lyricSize}
                setLyricSize={setLyricSize}
                roadmapEnabled={roadmapEnabled}
                toggleRoadmap={toggleRoadmap}
                onChangeTranspose={(t) => updateSong({ transpose: t })}
                onAddNote={addNote}
                onEditBody={() => setEditingBody(true)}
                onEditMeta={() => setEditingMeta(true)}
                customizing={customizing}
                canCustomize={layout === 'grid'}
                onCustomize={customizeLayout}
                onClearBoard={clearBoard}
                onResetArrangement={resetArrangement}
              />
            </div>
          </div>
        )}
      </header>

      {!editingBody && !customizing && (
        <SongToolbar
          transpose={song.transpose}
          onTranspose={(t) => updateSong({ transpose: t })}
          keyLabel={keyLabel}
          lyricSize={lyricSize}
          setLyricSize={setLyricSize}
          lyricsOnly={lyricsOnly}
          toggleLyricsOnly={toggleLyricsOnly}
          scrolling={autoscroll.playing}
          onToggleScroll={autoscroll.toggle}
          speed={autoscrollSpeed}
          setSpeed={setAutoscrollSpeed}
        />
      )}

      {showPalette && (
        <div className="song-rail">
          <ChordPalette song={song} />
        </div>
      )}

      <div className="song-main" ref={songMainRef}>
        {customizing && (
          <SectionTray
            ref={trayRef}
            sections={traySections}
            onPlace={placeFromTray}
            highlight={draggingSection}
          />
        )}

        <SpotifyPanel song={song} onChange={updateSong} />

        {editingBody ? (
          <BodyEditor
            body={song.body}
            onSave={(b) => { updateSong({ body: b }); setEditingBody(false); }}
            onCancel={() => setEditingBody(false)}
          />
        ) : (
          <>
            <SongRenderer
              body={song.body}
              transpose={song.transpose}
              arrangement={effectiveArrangement}
              editable={customizing}
              canvasHandlers={customizing ? canvasHandlers : undefined}
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
            {showEmptyHint && (
              <div className="empty-canvas">
                <p>The board is empty. Click a section in the tray to place it on the canvas.</p>
              </div>
            )}
          </>
        )}
      </div>

      {roadmapEnabled && roadmap && (
        <Roadmap
          roadmap={roadmap}
          sections={parsedSections}
          onChange={updateRoadmap}
          onClose={toggleRoadmap}
        />
      )}
    </main>
  );
}

/* The tray is the resting place for unplaced sections plus the drop target
 * for unplacing. Drag-from-canvas-onto-tray is hit-tested in `CanvasSection`
 * (pointer events are captured by the grip) using `trayRef`; click-to-place
 * is handled here. `highlight` lights it up while a canvas section is being
 * dragged so the user sees they can drop here to remove. */
function SectionTray({
  ref,
  sections,
  onPlace,
  highlight,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  sections: SongSection[];
  onPlace: (id: string) => void;
  highlight: boolean;
}) {
  const cls = [
    'section-tray',
    sections.length === 0 ? 'empty' : '',
    highlight ? 'hover' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} ref={ref}>
      <span className="tray-label">Tray</span>
      {sections.length === 0 ? (
        <span className="tray-hint">Drag a section here to remove it from the board.</span>
      ) : (
        <div className="tray-items">
          {sections.map((s) => {
            const titleLine = s.lines.find((l) => l.kind !== 'blank');
            const titleText = titleLine?.kind === 'comment' ? titleLine.text : null;
            const label = titleText ?? (s.name === 'verse' ? 'Section' : s.name);
            return (
              <button
                key={s.id}
                type="button"
                className={`tray-chip section-${s.name}`}
                onClick={() => onPlace(s.id)}
                title="Click to place on the board"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsMenu({
  song,
  layout,
  setLayout,
  gridPreset,
  setGridPreset,
  showPalette,
  toggleChordPalette,
  layoutExpanded,
  setLayoutExpanded,
  chordPaletteSide,
  setChordPaletteSide,
  lyricSize,
  setLyricSize,
  roadmapEnabled,
  toggleRoadmap,
  onChangeTranspose,
  onAddNote,
  onEditBody,
  onEditMeta,
  customizing,
  canCustomize,
  onCustomize,
  onClearBoard,
  onResetArrangement,
}: {
  song: Song;
  layout: 'flow' | 'grid';
  setLayout: (l: 'flow' | 'grid') => void;
  gridPreset: GridPreset;
  setGridPreset: (p: GridPreset) => void;
  showPalette: boolean;
  toggleChordPalette: () => void;
  layoutExpanded: boolean;
  setLayoutExpanded: (e: boolean) => void;
  chordPaletteSide: 'left' | 'right';
  setChordPaletteSide: (s: 'left' | 'right') => void;
  lyricSize: LyricSize;
  setLyricSize: (s: LyricSize) => void;
  roadmapEnabled: boolean;
  toggleRoadmap: () => void;
  onChangeTranspose: (transpose: number) => void;
  onAddNote: () => void;
  onEditBody: () => void;
  onEditMeta: () => void;
  customizing: boolean;
  canCustomize: boolean;
  onCustomize: () => void;
  onClearBoard: () => void;
  onResetArrangement: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = (fn: () => void) => () => { fn(); setOpen(false); };

  return (
    <div className="settings-menu-host" ref={ref}>
      <button
        type="button"
        className={`action-cog ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Song settings"
        aria-expanded={open}
        title="Song settings"
      >
        <CogIcon />
      </button>
      {open && (
        <div className="settings-popover" role="menu">
          <div className="popover-section">
            <div className="popover-label">Key</div>
            <KeySwitcher song={song} onChange={onChangeTranspose} />
          </div>

          <div className="popover-section">
            <div className="popover-label">Layout</div>
            <div className="preset-row">
              <span className="preset-label">Mode</span>
              <div className="layout-toggle" role="tablist" aria-label="Layout mode">
                <button
                  type="button"
                  className={`layout-btn ${layout === 'flow' ? 'active' : ''}`}
                  onClick={() => setLayout('flow')}
                  aria-pressed={layout === 'flow'}
                >
                  <FlowIcon /> Flow
                </button>
                <button
                  type="button"
                  className={`layout-btn ${layout === 'grid' ? 'active' : ''}`}
                  onClick={() => setLayout('grid')}
                  aria-pressed={layout === 'grid'}
                >
                  <GridIcon /> Grid
                </button>
              </div>
            </div>
            <div className="preset-row">
              <span className="preset-label">Width</span>
              <div className="preset-toggle">
                <button
                  type="button"
                  className={`preset-btn ${!layoutExpanded ? 'active' : ''}`}
                  onClick={() => setLayoutExpanded(false)}
                  aria-pressed={!layoutExpanded}
                  title="Centered with comfortable gutters"
                >
                  Compact
                </button>
                <button
                  type="button"
                  className={`preset-btn ${layoutExpanded ? 'active' : ''}`}
                  onClick={() => setLayoutExpanded(true)}
                  aria-pressed={layoutExpanded}
                  title="Use the full viewport width"
                >
                  Expanded
                </button>
              </div>
            </div>
            <div className="preset-row">
              <span className="preset-label">Text size</span>
              <div className="preset-toggle">
                {(['sm', 'md', 'lg'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`preset-btn ${lyricSize === s ? 'active' : ''}`}
                    onClick={() => setLyricSize(s)}
                    aria-pressed={lyricSize === s}
                  >
                    {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            </div>
            {layout === 'grid' && !customizing && (
              <div className="preset-row">
                <span className="preset-label">Columns</span>
                <div className="preset-toggle">
                  {(['auto', '2col', '3col'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`preset-btn ${gridPreset === p ? 'active' : ''}`}
                      onClick={() => setGridPreset(p)}
                      aria-pressed={gridPreset === p}
                    >
                      {p === 'auto' ? 'Auto' : p === '2col' ? '2' : '3'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canCustomize && (
            <div className="popover-section">
              <div className="popover-label">Arrangement</div>
              {!customizing ? (
                <button type="button" className="popover-item" onClick={close(onCustomize)}>
                  Customize layout
                </button>
              ) : (
                <>
                  <button type="button" className="popover-item" onClick={close(onClearBoard)}>
                    Clear the board
                  </button>
                  <button type="button" className="popover-item" onClick={close(onResetArrangement)}>
                    Reset to auto
                  </button>
                </>
              )}
            </div>
          )}

          <div className="popover-section">
            <div className="popover-label">Panels</div>
            <ToggleRow label="Roadmap" value={roadmapEnabled} onToggle={toggleRoadmap} />
            <ToggleRow label="Chord palette" value={showPalette} onToggle={toggleChordPalette} />
            {showPalette && (
              <div className="preset-row">
                <span className="preset-label">Palette side</span>
                <div className="preset-toggle">
                  <button
                    type="button"
                    className={`preset-btn ${chordPaletteSide === 'left' ? 'active' : ''}`}
                    onClick={() => setChordPaletteSide('left')}
                    aria-pressed={chordPaletteSide === 'left'}
                  >
                    ← Left
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${chordPaletteSide === 'right' ? 'active' : ''}`}
                    onClick={() => setChordPaletteSide('right')}
                    aria-pressed={chordPaletteSide === 'right'}
                  >
                    Right →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="popover-section">
            <div className="popover-label">Edit</div>
            <button type="button" className="popover-item" onClick={close(onAddNote)}>
              Add sticky note
            </button>
            <button type="button" className="popover-item" onClick={close(onEditBody)}>
              Edit lyrics
            </button>
            <button type="button" className="popover-item" onClick={close(onEditMeta)}>
              Edit info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`popover-toggle ${value ? 'on' : 'off'}`}
      onClick={onToggle}
      role="switch"
      aria-checked={value}
    >
      <span>{label}</span>
      <span className="popover-toggle-track" aria-hidden="true">
        <span className="popover-toggle-thumb" />
      </span>
    </button>
  );
}

function RoadmapIcon() {
  /* A simple "list with a marker" glyph — three short stacked rows with a
   * dot to evoke a song outline / setlist. */
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CogIcon() {
  /* Solid-fill gear (Heroicons-style). Filled paths read at small sizes far
   * better than the stroke-based cog, which was nearly invisible against the
   * popover background. */
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5z"
      />
    </svg>
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
    <label className="key-picker" title="Pick a key — chords transpose to match">
      <span className="key-picker-label">Key</span>
      <span className="key-picker-select-wrap">
        <select
          className="key-picker-select"
          value={currentPc}
          onChange={(e) => onPick(parseInt(e.target.value, 10))}
        >
          {NOTE_NAMES_SHARP.map((n, pc) => (
            <option key={pc} value={pc}>
              {n}{originalPc === pc ? '  (original)' : ''}
            </option>
          ))}
        </select>
        <span className="key-picker-chevron" aria-hidden="true">▾</span>
      </span>
    </label>
  );
}

function KeyChip({ song }: { song: Song }) {
  const label = effectiveKeyLabel(song);
  if (!label) return null;
  return (
    <span className={`chip key-chip-info ${song.transpose !== 0 ? 'transposed' : ''}`}>
      key {label}
    </span>
  );
}

function effectiveKeyLabel(song: Song): string | null {
  if (!song.key) return null;
  const m = song.key.match(/^([A-G][#b♯♭]?)(.*)$/);
  if (!m) return song.key;
  const [, root, suffix] = m;
  const p = parseChordSymbol(root);
  if (!p) return song.key;
  const newPc = ((p.rootPc + song.transpose) % 12 + 12) % 12;
  return NOTE_NAMES_SHARP[newPc] + suffix;
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
  const [spotify, setSpotify] = useState(song.spotifyTrackId ?? '');
  const spotifyTrimmed = spotify.trim();
  const spotifyParsed = spotifyTrimmed ? extractTrackId(spotifyTrimmed) : null;
  const spotifyInvalid = spotifyTrimmed !== '' && spotifyParsed === null;

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
      <label className="field">
        <span className="field-label">
          Spotify URL <span className="field-hint">paste an open.spotify.com link, or leave blank to use search</span>
        </span>
        <input
          value={spotify}
          onChange={(e) => setSpotify(e.target.value)}
          placeholder="https://open.spotify.com/track/…"
          aria-invalid={spotifyInvalid || undefined}
        />
        {spotifyInvalid && (
          <span className="field-error">Doesn&apos;t look like a Spotify track link.</span>
        )}
      </label>
      <div className="meta-editor-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary"
          disabled={spotifyInvalid}
          onClick={() => onSave({
            title: title.trim() || song.title,
            artist: artist.trim() || undefined,
            key: key.trim() || undefined,
            tempo: tempo.trim() || undefined,
            spotifyTrackId: spotifyParsed ?? undefined,
          })}
        >Save</button>
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
