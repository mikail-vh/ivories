'use client';

import { useEffect, useRef, useState } from 'react';
import {
  parseChordPro,
  resolveChord,
  transposeChord,
  applyArrangement,
  type Section,
  type Line,
  type Token,
  type SongArrangement,
  type SectionPosition,
} from '@/lib/songs';
import { midisFor, playChord } from '@/lib/audio';

export type CanvasHandlers = {
  /* Commit a batch of position updates after a drag ends. The map is merged
   * into the existing positions; sections not present are untouched. */
  onReposition: (updates: Record<string, SectionPosition>) => void;
  /* Pull one or more sections off the canvas and back into the tray. The
   * caller passes a single id for individual unplaces (× button) or the full
   * chain for "the whole merged block" unplaces (drop-on-tray). */
  onUnplace: (ids: string[]) => void;
  /* Notify the parent when a drag begins/ends so the tray can light up
   * (drop-on-tray = unplace) without needing to subscribe to pointer events. */
  onDragChange?: (dragging: boolean) => void;
  /* Element to hit-test against on pointerup — when the pointer is released
   * inside this element, the drag becomes an unplace instead of a reposition. */
  trayRef?: React.RefObject<HTMLElement | null>;
};

type Props = {
  body: string;
  transpose: number;
  /* Children rendered absolutely-positioned inside each line — used for sticky notes. */
  renderLineOverlay?: (lineId: string) => React.ReactNode;
  arrangement?: SongArrangement;
  editable?: boolean;
  canvasHandlers?: CanvasHandlers;
};

export function SongRenderer({
  body,
  transpose,
  renderLineOverlay,
  arrangement,
  editable,
  canvasHandlers,
}: Props) {
  const sections = parseChordPro(body).sections;
  const { placed } = applyArrangement(sections, arrangement);

  if (editable && canvasHandlers) {
    return (
      <CanvasList
        sections={placed}
        positions={arrangement?.positions ?? {}}
        transpose={transpose}
        renderLineOverlay={renderLineOverlay}
        handlers={canvasHandlers}
      />
    );
  }

  return (
    <div className="song-body">
      {placed.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          transpose={transpose}
          renderLineOverlay={renderLineOverlay}
        />
      ))}
    </div>
  );
}

function CanvasList({
  sections,
  positions,
  transpose,
  renderLineOverlay,
  handlers,
}: {
  sections: Section[];
  positions: Record<string, SectionPosition>;
  transpose: number;
  renderLineOverlay?: (lineId: string) => React.ReactNode;
  handlers: CanvasHandlers;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  /* Resize the canvas to fit the lowest section so there's always something to
   * scroll onto. Re-run when sections render/move; ResizeObserver fires when
   * any child's box changes. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      let maxBottom = 0;
      canvas.querySelectorAll<HTMLElement>('.song-section').forEach((el) => {
        const top = parseFloat(el.style.top || '0');
        maxBottom = Math.max(maxBottom, top + el.offsetHeight);
      });
      canvas.style.minHeight = `${Math.max(400, maxBottom + 80)}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    canvas.querySelectorAll<HTMLElement>('.song-section').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [sections, positions]);

  return (
    <div className="song-body song-canvas" ref={canvasRef}>
      {sections.map((section, i) => {
        const pos = positions[section.id] ?? defaultPositionForIndex(i);
        return (
          <CanvasSection
            key={section.id}
            section={section}
            position={pos}
            transpose={transpose}
            renderLineOverlay={renderLineOverlay}
            handlers={handlers}
          />
        );
      })}
    </div>
  );
}

function defaultPositionForIndex(i: number): SectionPosition {
  /* Sensible 2-column cascade for new placements that don't have a snapshot. */
  const cols = 2;
  const w = 380;
  const gap = 16;
  const rowHeight = 220;
  return {
    x: (i % cols) * (w + gap),
    y: Math.floor(i / cols) * (rowHeight + gap),
    w,
  };
}

function CanvasSection({
  section,
  position,
  transpose,
  renderLineOverlay,
  handlers,
}: {
  section: Section;
  position: SectionPosition;
  transpose: number;
  renderLineOverlay?: (lineId: string) => React.ReactNode;
  handlers: CanvasHandlers;
}) {
  const ref = useRef<HTMLElement>(null);
  const [dragging, setDragging] = useState(false);

  const onGripPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    e.preventDefault();
    e.stopPropagation();
    const grip = e.currentTarget;
    const sectionEl = ref.current;
    const canvas = sectionEl?.parentElement;
    if (!sectionEl || !canvas) return;

    grip.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = position.x;
    const baseY = position.y;
    let curX = baseX;
    let curY = baseY;
    setDragging(true);
    handlers.onDragChange?.(true);

    const move = (ev: PointerEvent) => {
      curX = baseX + (ev.clientX - startX);
      curY = Math.max(0, baseY + (ev.clientY - startY));
      sectionEl.style.left = `${curX}px`;
      sectionEl.style.top = `${curY}px`;
    };
    const up = (ev: PointerEvent) => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      setDragging(false);
      handlers.onDragChange?.(false);

      /* Hit-test the tray to detect drop-to-unplace. */
      const trayEl = handlers.trayRef?.current ?? null;
      if (trayEl) {
        const r = trayEl.getBoundingClientRect();
        if (
          ev.clientX >= r.left && ev.clientX <= r.right &&
          ev.clientY >= r.top && ev.clientY <= r.bottom
        ) {
          handlers.onUnplace([section.id]);
          return;
        }
      }
      handlers.onReposition({
        [section.id]: { x: Math.round(curX), y: Math.round(curY), w: position.w },
      });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };

  return (
    <SectionView
      section={section}
      transpose={transpose}
      renderLineOverlay={renderLineOverlay}
      forwardRef={ref}
      style={{ left: position.x, top: position.y, width: position.w }}
      editable
      isDragging={dragging}
      onGripPointerDown={onGripPointerDown}
      onUnplace={() => handlers.onUnplace([section.id])}
    />
  );
}

function SectionView({
  section,
  transpose,
  renderLineOverlay,
  forwardRef,
  style,
  editable,
  isDragging,
  onGripPointerDown,
  onUnplace,
}: {
  section: Section;
  transpose: number;
  renderLineOverlay?: (lineId: string) => React.ReactNode;
  forwardRef?: React.RefObject<HTMLElement | null>;
  style?: React.CSSProperties;
  editable?: boolean;
  isDragging?: boolean;
  onGripPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onUnplace?: () => void;
}) {
  /* Promote a leading comment line to the section title (covers the common
   * pattern where users tag sections with `{c: Verse 1}` instead of `{sov}`). */
  const titleLine = section.lines.find((l) => l.kind !== 'blank');
  const titleText =
    titleLine?.kind === 'comment' ? titleLine.text : null;
  const linesToRender = titleText
    ? section.lines.filter((l) => l !== titleLine)
    : section.lines;

  const headerName = titleText ?? (section.name === 'verse' ? null : section.name);

  return (
    <section
      ref={forwardRef}
      data-section-id={section.id}
      className={[
        'song-section',
        `section-${section.name}`,
        editable ? 'editable' : '',
        isDragging ? 'dragging' : '',
      ].filter(Boolean).join(' ')}
      style={style}
    >
      {editable && (
        <div className="section-edit-rail">
          <button
            type="button"
            className="section-grip"
            title="Drag to reposition"
            aria-label="Drag to reposition"
            onPointerDown={onGripPointerDown}
          >
            <GripIcon />
          </button>
          {onUnplace && (
            <button
              type="button"
              className="section-unplace"
              onClick={onUnplace}
              title="Send to tray"
              aria-label="Send section to tray"
            >
              ×
            </button>
          )}
        </div>
      )}
      {headerName && <h3 className="song-section-name">{headerName}</h3>}
      {groupTabLines(linesToRender).map((g) =>
        g.kind === 'tab' ? (
          <TabBlockView
            key={g.lines[0].id}
            lines={g.lines}
            renderLineOverlay={renderLineOverlay}
          />
        ) : (
          <LineView
            key={g.line.id}
            line={g.line}
            transpose={transpose}
            overlay={renderLineOverlay?.(g.line.id)}
          />
        ),
      )}
    </section>
  );
}

type LineGroup =
  | { kind: 'tab'; lines: Line[] }
  | { kind: 'line'; line: Line };

/* Coalesce consecutive `kind: 'tab'` lines into one group so they share a
 * single `<pre>` block — keeps the ASCII grid intact instead of stamping
 * each string onto its own padded `.song-line` row. */
function groupTabLines(lines: Line[]): LineGroup[] {
  const out: LineGroup[] = [];
  for (const line of lines) {
    if (line.kind === 'tab') {
      const last = out[out.length - 1];
      if (last && last.kind === 'tab') last.lines.push(line);
      else out.push({ kind: 'tab', lines: [line] });
    } else {
      out.push({ kind: 'line', line });
    }
  }
  return out;
}

function TabBlockView({
  lines,
  renderLineOverlay,
}: {
  lines: Line[];
  renderLineOverlay?: (lineId: string) => React.ReactNode;
}) {
  const overlays = renderLineOverlay
    ? lines.map((l) => renderLineOverlay(l.id)).filter(Boolean)
    : [];
  return (
    <div className="song-line song-line-tab-wrap" data-line-id={lines[0].id}>
      <pre className="song-line-tab">{lines.map((l) => l.text ?? '').join('\n')}</pre>
      {overlays}
    </div>
  );
}

type Chunk = { chord?: string; lyric: string };

function pairChunks(tokens: Token[]): Chunk[] {
  const chunks: Chunk[] = [];
  let pending: string | undefined;
  for (const tok of tokens) {
    if (tok.kind === 'chord') {
      if (pending !== undefined) {
        /* Two chords with no lyric between them — show the first as a standalone block. */
        chunks.push({ chord: pending, lyric: ' ' });
      }
      pending = tok.text;
    } else {
      chunks.push({ chord: pending, lyric: tok.text || ' ' });
      pending = undefined;
    }
  }
  if (pending !== undefined) chunks.push({ chord: pending, lyric: ' ' });
  return chunks;
}

function LineView({
  line,
  transpose,
  overlay,
}: {
  line: Line;
  transpose: number;
  overlay?: React.ReactNode;
}) {
  if (line.kind === 'blank') {
    return <div className="song-line song-line-blank" data-line-id={line.id}>{overlay}</div>;
  }
  if (line.kind === 'comment') {
    return (
      <div className="song-line song-line-comment" data-line-id={line.id}>
        <span>{line.text}</span>
        {overlay}
      </div>
    );
  }

  const chunks = pairChunks(line.tokens);

  return (
    <div className="song-line song-line-lyric" data-line-id={line.id}>
      <div className="song-line-tokens">
        {chunks.map((c, i) => (
          <span key={i} className={`chunk ${c.chord ? 'chunk-with-chord' : ''}`}>
            {c.chord ? (
              <ChordButton sym={transposeChord(c.chord, transpose)} />
            ) : (
              <span className="chunk-chord-spacer">&nbsp;</span>
            )}
            <span className="chunk-text">{c.lyric}</span>
          </span>
        ))}
      </div>
      {overlay}
    </div>
  );
}

function ChordButton({ sym }: { sym: string }) {
  /* Lead sheets sometimes wrap a chord in parens to mark it as optional or
   * anticipated (e.g. `(E)`). We keep the parens visible but strip them for
   * chord resolution so the click still triggers the sound. */
  const hasOpenParen = sym.startsWith('(');
  const hasCloseParen = sym.endsWith(')');
  const inner = sym.slice(hasOpenParen ? 1 : 0, hasCloseParen ? sym.length - 1 : sym.length);

  /* Slash chords (`B/D#`) split into two independent triggers. The "/" stays
   * visible as a non-interactive separator. Parens, if present, wrap the
   * whole pair so the symbol still reads correctly as `(B/D#)`. */
  const slashIdx = inner.indexOf('/');
  if (slashIdx > 0 && slashIdx < inner.length - 1) {
    const main = inner.slice(0, slashIdx);
    const bass = inner.slice(slashIdx + 1);
    return (
      <span className="chunk-chord-slash">
        {hasOpenParen && <span className="chord-paren" aria-hidden="true">(</span>}
        <button
          type="button"
          className="chunk-chord chord-main"
          onClick={() => playChordSym(main)}
          title={`Play ${main}`}
        >
          {main}
        </button>
        <span className="chord-slash" aria-hidden="true">/</span>
        <button
          type="button"
          className="chunk-chord chord-bass"
          onClick={() => playBassSym(bass)}
          title={`Play ${bass} (bass)`}
        >
          {bass}
        </button>
        {hasCloseParen && <span className="chord-paren" aria-hidden="true">)</span>}
      </span>
    );
  }
  return (
    <button type="button" className="chunk-chord" onClick={() => playChordSym(inner)} title={`Play ${inner}`}>
      {sym}
    </button>
  );
}

function playChordSym(sym: string) {
  const r = resolveChord(sym);
  if (!r) return;
  playChord(midisFor(r.rootPc, r.intervals));
}

function playBassSym(sym: string) {
  /* The right side of a slash chord is treated as a full chord trigger (a
   * bare letter like "D#" resolves to D# major). Earlier we played just the
   * single bass note, but users expected both halves of the slash to behave
   * the same way — clicking either fires a chord. */
  const r = resolveChord(sym);
  if (!r) return;
  playChord(midisFor(r.rootPc, r.intervals));
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="5" cy="3"  r="1.4" fill="currentColor" />
      <circle cx="5" cy="8"  r="1.4" fill="currentColor" />
      <circle cx="5" cy="13" r="1.4" fill="currentColor" />
      <circle cx="11" cy="3"  r="1.4" fill="currentColor" />
      <circle cx="11" cy="8"  r="1.4" fill="currentColor" />
      <circle cx="11" cy="13" r="1.4" fill="currentColor" />
    </svg>
  );
}

