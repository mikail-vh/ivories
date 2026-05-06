'use client';

import { useRef, useState } from 'react';
import type { StickyNote as StickyNoteType } from '@/lib/songs';

export const NOTE_COLORS = ['#fff5a3', '#ffc6c6', '#c8e8ff', '#c8f5d0', '#e6ccff'] as const;

type Props = {
  note: StickyNoteType;
  onChange: (note: StickyNoteType) => void;
  onDelete: (id: string) => void;
};

export function StickyNote({ note, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(note.text === '');
  const [text, setText] = useState(note.text);
  const [lastProp, setLastProp] = useState(note.text);
  if (note.text !== lastProp) {
    setLastProp(note.text);
    setText(note.text);
  }
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false, startX: 0, startY: 0, baseX: 0, baseY: 0,
  });

  const isInteractive = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('.sticky-actions, textarea, button, input');

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing || isInteractive(e.target)) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: note.dx,
      baseY: note.dy,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('dragging');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !ref.current) return;
    const dx = drag.current.baseX + (e.clientX - drag.current.startX);
    const dy = drag.current.baseY + (e.clientY - drag.current.startY);
    ref.current.style.left = `${dx}px`;
    ref.current.style.top = `${dy}px`;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    e.currentTarget.classList.remove('dragging');

    if (!ref.current) return;
    const noteRect = ref.current.getBoundingClientRect();
    const noteCenterY = noteRect.top + noteRect.height / 2;

    const lineEls = document.querySelectorAll<HTMLElement>('[data-line-id]');
    let closestId = note.lineId;
    let closestEl: HTMLElement | null = null;
    let closestDist = Infinity;
    lineEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const d = Math.abs(c - noteCenterY);
      if (d < closestDist) { closestDist = d; closestId = el.dataset.lineId!; closestEl = el; }
    });

    if (closestEl && closestId !== note.lineId) {
      const newRect = (closestEl as HTMLElement).getBoundingClientRect();
      onChange({
        ...note,
        lineId: closestId,
        dx: noteRect.left - newRect.left,
        dy: noteRect.top - newRect.top,
      });
    } else {
      const finalDx = drag.current.baseX + (e.clientX - drag.current.startX);
      const finalDy = drag.current.baseY + (e.clientY - drag.current.startY);
      onChange({ ...note, dx: finalDx, dy: finalDy });
    }
  };

  const commitText = () => {
    setEditing(false);
    if (text !== note.text) onChange({ ...note, text });
  };

  return (
    <div
      ref={ref}
      className={`sticky-note ${editing ? 'editing' : ''}`}
      style={{
        left: note.dx,
        top: note.dy,
        width: note.w,
        minHeight: note.h,
        background: note.color,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setText(note.text); setEditing(false); }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitText();
          }}
          placeholder="Type a note…"
        />
      ) : (
        <div className="sticky-text" onClick={() => setEditing(true)}>
          {note.text || <span className="sticky-placeholder">Empty note — click to edit</span>}
        </div>
      )}

      <div className="sticky-actions">
        {NOTE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`sticky-color-btn ${note.color === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => onChange({ ...note, color: c })}
            aria-label="Pick colour"
          />
        ))}
        <button
          type="button"
          className="sticky-delete-btn"
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
          title="Delete note"
        >
          ×
        </button>
      </div>
    </div>
  );
}
