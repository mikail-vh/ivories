'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  sectionDisplayLabel,
  type RoadmapItem,
  type Section,
  type SongRoadmap,
} from '@/lib/songs';

type Props = {
  roadmap: SongRoadmap;
  sections: Section[];
  onChange: (next: SongRoadmap) => void;
  onClose: () => void;
};

/* Roadmap is a thin floating panel. The user can drag the header to move it
 * (sticky-note-style absolute positioning). The default sits in the top-left
 * of the page. The cog menu's "Roadmap" toggle controls `enabled`; this
 * component is unmounted when disabled. */
export function Roadmap({ roadmap, sections, onChange, onClose }: Props) {
  const items = roadmap.items;
  const blocks = useMemo(() => groupConsecutive(items, sections), [items, sections]);

  const [adding, setAdding] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  /* On narrow viewports the roadmap renders as a quick-preview overlay —
   * dismissing it on outside-click matches the user's expectation of a
   * tap-to-peek behavior. On desktop the panel stays draggable and persists
   * until explicitly closed via its X button. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 700px)');
    let mobile = mql.matches;
    const onDocPointer = (e: PointerEvent) => {
      if (!mobile) return;
      const panel = panelRef.current;
      const target = e.target as Node | null;
      if (!panel || !target) return;
      /* Ignore clicks inside the panel, on the shortcut button, or on the
       * cog popover (which has its own roadmap toggle). */
      if (panel.contains(target)) return;
      if ((target as Element).closest?.('.roadmap-shortcut, .settings-popover, .action-cog')) return;
      onClose();
    };
    const onMql = (e: MediaQueryListEvent) => { mobile = e.matches; };
    mql.addEventListener('change', onMql);
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      mql.removeEventListener('change', onMql);
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, [onClose]);

  /* Compute a sensible default position when the user hasn't dragged the
   * panel yet: anchor below the song body's top, so we don't cover the title
   * or chord palette. Falls back to a viewport-relative default if the body
   * isn't measurable yet. */
  const defaultPosition = () => {
    if (typeof window === 'undefined') return { x: 16, y: 90 };
    const body = document.querySelector<HTMLElement>('.song-body');
    if (body) {
      const r = body.getBoundingClientRect();
      return { x: 16, y: Math.max(90, Math.round(r.top + 8)) };
    }
    return { x: 16, y: 90 };
  };

  /* Clamp the stored position into the viewport on mount and on resize.
   * If the user dragged the panel off-screen at one viewport size and then
   * resized smaller (or the panel was hidden and shown again at a different
   * size), we don't want it stuck out of sight. We require at least 120px
   * of the panel to remain visible on all sides. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const clampNow = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const w = panel.offsetWidth || 220;
      const h = panel.offsetHeight || 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 120;
      const stored = roadmap.position ?? defaultPosition();
      const x = Math.max(8, Math.min(stored.x, vw - margin));
      const y = Math.max(60, Math.min(stored.y, vh - margin));
      /* If the panel would be entirely off-screen even after clamping the
       * top-left, snap it to a centered visible spot. */
      const fullyOff =
        x + w < margin || y + h < margin || x > vw - margin || y > vh - margin;
      const next = fullyOff
        ? { x: Math.max(8, Math.round((vw - w) / 2)), y: Math.max(60, Math.round((vh - h) / 3)) }
        : { x, y };
      if (next.x !== stored.x || next.y !== stored.y) {
        onChange({ ...roadmap, position: next });
      }
    };
    clampNow();
    window.addEventListener('resize', clampNow);
    return () => window.removeEventListener('resize', clampNow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItems = (next: RoadmapItem[]) => onChange({ ...roadmap, items: next });

  const addSection = (sectionId: string) => {
    updateItems([...items, { id: makeId(), kind: 'section', sectionId }]);
    setAdding(false);
  };
  const addNoteAfter = (afterIdx: number | null) => {
    const next = [...items];
    const newItem: RoadmapItem = { id: makeId(), kind: 'note', text: '' };
    if (afterIdx === null) next.push(newItem);
    else next.splice(afterIdx + 1, 0, newItem);
    updateItems(next);
  };
  const removeItem = (itemId: string) => {
    updateItems(items.filter((i) => i.id !== itemId));
  };
  const updateNote = (itemId: string, text: string) => {
    updateItems(items.map((i) => (i.id === itemId && i.kind === 'note' ? { ...i, text } : i)));
  };

  const scrollTo = (sectionId: string) => {
    const el = document.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('section-flash');
    setTimeout(() => el.classList.remove('section-flash'), 800);
  };

  /* Drag the panel by its header. We store the position back to the song so
   * it sticks across reloads. The drag uses pointer events; the rest of the
   * panel's interior controls remain clickable. */
  const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const fallback = defaultPosition();
    const baseX = roadmap.position?.x ?? fallback.x;
    const baseY = roadmap.position?.y ?? fallback.y;
    const panel = panelRef.current;
    let curX = baseX;
    let curY = baseY;

    const move = (ev: PointerEvent) => {
      curX = Math.max(8, baseX + (ev.clientX - startX));
      curY = Math.max(60, baseY + (ev.clientY - startY));
      if (panel) {
        panel.style.left = `${curX}px`;
        panel.style.top = `${curY}px`;
      }
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      onChange({ ...roadmap, position: { x: Math.round(curX), y: Math.round(curY) } });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const pos = roadmap.position ?? defaultPosition();

  return (
    <aside
      className="roadmap-panel"
      ref={panelRef}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="roadmap-header" onPointerDown={beginDrag} role="button" aria-label="Drag to move">
        <span className="roadmap-grip" aria-hidden="true">⋮⋮</span>
        <span className="roadmap-title">Roadmap</span>
        <button
          type="button"
          className="roadmap-close"
          onClick={onClose}
          aria-label="Close roadmap"
          title="Close"
        >
          ×
        </button>
      </div>

      <ol className="roadmap-list">
        {blocks.length === 0 && (
          <li className="roadmap-empty">No sections yet. Use the picker below.</li>
        )}
        {blocks.map((block) =>
          block.kind === 'section' ? (
            <li key={block.itemIds.join('-')} className="roadmap-row">
              <button
                type="button"
                className={`roadmap-block section-${block.sectionName.toLowerCase().includes('chorus') ? 'chorus' : block.sectionName.toLowerCase() === 'bridge' ? 'bridge' : 'verse'}`}
                onClick={() => scrollTo(block.sectionId)}
                title="Jump to this section"
              >
                <span className="roadmap-block-name">{block.label}</span>
                {block.count > 1 && <span className="roadmap-block-count">× {block.count}</span>}
              </button>
              <button
                type="button"
                className="roadmap-row-action"
                onClick={() => removeItem(block.itemIds[block.itemIds.length - 1])}
                title={block.count > 1 ? 'Remove last repeat' : 'Remove block'}
                aria-label="Remove block"
              >
                −
              </button>
              <button
                type="button"
                className="roadmap-row-action"
                onClick={() => addNoteAfter(itemIndexOfLast(items, block.itemIds))}
                title="Add a note below"
                aria-label="Add a note below"
              >
                ✎
              </button>
            </li>
          ) : (
            <li key={block.itemId} className="roadmap-row roadmap-row-note">
              <RoadmapNote
                text={block.text}
                onChange={(t) => updateNote(block.itemId, t)}
              />
              <button
                type="button"
                className="roadmap-row-action"
                onClick={() => removeItem(block.itemId)}
                title="Remove note"
                aria-label="Remove note"
              >
                −
              </button>
            </li>
          ),
        )}
      </ol>

      <div className="roadmap-add">
        {adding ? (
          <SectionPicker
            sections={sections}
            onPick={addSection}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <div className="roadmap-add-buttons">
            <button type="button" className="popover-item" onClick={() => setAdding(true)}>
              + Section
            </button>
            <button type="button" className="popover-item" onClick={() => addNoteAfter(null)}>
              + Note
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

type RoadmapBlock =
  | {
      kind: 'section';
      sectionId: string;
      sectionName: string;
      label: string;
      count: number;
      itemIds: string[];
    }
  | { kind: 'note'; text: string; itemId: string };

function groupConsecutive(items: RoadmapItem[], sections: Section[]): RoadmapBlock[] {
  const labelFor = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    return sec ? sectionDisplayLabel(sec) : 'Removed';
  };
  const nameFor = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    return sec?.name ?? 'verse';
  };
  const blocks: RoadmapBlock[] = [];
  for (const item of items) {
    if (item.kind === 'note') {
      blocks.push({ kind: 'note', text: item.text, itemId: item.id });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last && last.kind === 'section' && last.sectionId === item.sectionId) {
      last.count += 1;
      last.itemIds.push(item.id);
    } else {
      blocks.push({
        kind: 'section',
        sectionId: item.sectionId,
        sectionName: nameFor(item.sectionId),
        label: labelFor(item.sectionId),
        count: 1,
        itemIds: [item.id],
      });
    }
  }
  return blocks;
}

function itemIndexOfLast(items: RoadmapItem[], ids: string[]): number {
  const lastId = ids[ids.length - 1];
  return items.findIndex((it) => it.id === lastId);
}

function RoadmapNote({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  const [value, setValue] = useState(text);
  const [editing, setEditing] = useState(text === '');
  if (editing) {
    return (
      <input
        autoFocus
        className="roadmap-note-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (value !== text) onChange(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setValue(text);
            setEditing(false);
          }
        }}
        placeholder="Note…"
      />
    );
  }
  return (
    <button
      type="button"
      className="roadmap-note"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {text || <span className="roadmap-note-placeholder">Empty note</span>}
    </button>
  );
}

function SectionPicker({
  sections,
  onPick,
  onCancel,
}: {
  sections: Section[];
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="roadmap-picker">
      <div className="roadmap-picker-header">
        <span>Add section</span>
        <button type="button" className="roadmap-picker-cancel" onClick={onCancel} aria-label="Cancel">
          ×
        </button>
      </div>
      <div className="roadmap-picker-items">
        {sections.length === 0 ? (
          <span className="roadmap-empty">No sections detected in this song.</span>
        ) : (
          sections.map((s) => {
            const label = sectionDisplayLabel(s);
            return (
              <button
                key={s.id}
                type="button"
                className={`roadmap-picker-chip section-${s.name}`}
                onClick={() => onPick(s.id)}
              >
                {label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function makeId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
