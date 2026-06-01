'use client';

import { useRef, useState } from 'react';
import { NOTE_NAMES_SHARP } from '@/lib/music';

/** Standard tuning low → high: E2 A2 D3 G3 B3 E4. */
export const STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

type Props = {
  /** Number of frets to draw (excluding the nut). Default 12. */
  fretCount?: number;
  /** Highlighted pitch classes (0..11). Drawn as accent dots on every fret/string
   *  position whose pitch matches. */
  highlightPcs?: number[];
  /** Pitch class drawn extra-bold (the root note). */
  rootPc?: number;
  /** When true, draw note names on every fret position. */
  showLabels?: boolean;
  /** Capo fret (0 = no capo). When set, all open strings are treated as fretted
   *  at this fret for both display (left-of-capo dimmed/hidden) and onPress
   *  MIDI calculations. */
  capoFret?: number;
  /** When true, reverses string order — low E on top (left-handed view).
   *  Default false: high e on top, matching standard tab convention. */
  flipped?: boolean;
  /** Notifies of capo changes from drag. */
  onCapoChange?: (fret: number) => void;
  /** Click handler — called with the MIDI of the played note. */
  onPress?: (midi: number) => void;
};

export function Fretboard({
  fretCount = 12,
  highlightPcs = [],
  rootPc = -1,
  showLabels = false,
  capoFret = 0,
  flipped = false,
  onCapoChange,
  onPress,
}: Props) {
  const STRINGS = 6;
  const STRING_GAP = 26;
  const FRET_GAP   = 56;
  const PAD_LEFT   = 60;     // room for string names + open-string note markers
  const PAD_RIGHT  = 16;
  const PAD_TOP    = 18;     // room for fret-number labels
  const PAD_BOTTOM = 12;
  const W = PAD_LEFT + FRET_GAP * fretCount + PAD_RIGHT;
  const H = PAD_TOP + STRING_GAP * (STRINGS - 1) + PAD_BOTTOM;

  /* Default places high e (s=5) at the top and low E (s=0) at the bottom,
   * matching standard tab/horizontal-chord-chart convention. `flipped` reverses
   * to put low E on top (a left-handed view). */
  const stringY = (s: number) =>
    flipped ? PAD_TOP + s * STRING_GAP : PAD_TOP + (5 - s) * STRING_GAP;
  const fretLineX = (col: number) => PAD_LEFT + col * FRET_GAP;
  const fretCenterX = (col: number) => PAD_LEFT + (col - 0.5) * FRET_GAP;

  const pcSet = new Set(highlightPcs);
  const isRoot = (pc: number) => rootPc >= 0 && pc === rootPc;

  /* Standard fret markers (single dots at 3, 5, 7, 9; double at 12). */
  const SINGLE_MARKERS = [3, 5, 7, 9];
  const DOUBLE_MARKERS = [12];

  /** MIDI sounded by string s at fret f, honouring the capo. Open strings
   *  (f === 0) below the capo bar play the capo fret's pitch on that string. */
  const midiOf = (s: number, f: number) => STRING_OPEN_MIDI[s] + Math.max(f, capoFret);

  return (
    <CapoDraggable
      capoFret={capoFret}
      fretCount={fretCount}
      fretLineX={fretLineX}
      stringY={stringY}
      strings={STRINGS}
      stringGap={STRING_GAP}
      onCapoChange={onCapoChange}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="fretboard" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Guitar fretboard">
        {/* Position markers behind everything */}
        {SINGLE_MARKERS.filter(m => m <= fretCount).map(m => (
          <circle
            key={`mk${m}`}
            cx={fretCenterX(m)}
            cy={(stringY(2) + stringY(3)) / 2}
            r={4}
            className="fb-marker"
          />
        ))}
        {DOUBLE_MARKERS.filter(m => m <= fretCount).map(m => (
          <g key={`mk${m}`}>
            <circle cx={fretCenterX(m)} cy={(stringY(1) + stringY(2)) / 2} r={4} className="fb-marker" />
            <circle cx={fretCenterX(m)} cy={(stringY(3) + stringY(4)) / 2} r={4} className="fb-marker" />
          </g>
        ))}

        {/* Nut */}
        <line
          x1={fretLineX(0)} y1={stringY(0) - 4}
          x2={fretLineX(0)} y2={stringY(STRINGS - 1) + 4}
          className="fb-nut"
        />

        {/* Fret bars */}
        {Array.from({ length: fretCount }, (_, i) => (
          <line
            key={`f${i}`}
            x1={fretLineX(i + 1)} y1={stringY(0)}
            x2={fretLineX(i + 1)} y2={stringY(STRINGS - 1)}
            className="fb-fret"
          />
        ))}

        {/* Strings */}
        {Array.from({ length: STRINGS }, (_, s) => (
          <line
            key={`s${s}`}
            x1={fretLineX(0)} y1={stringY(s)}
            x2={fretLineX(fretCount)} y2={stringY(s)}
            className={`fb-string fb-string-${s}`}
          />
        ))}

        {/* String name labels (far left, with room for open-string note dot between them and the nut). */}
        {STRING_NAMES.map((name, s) => (
          <text key={`sn${s}`} x={14} y={stringY(s) + 4} textAnchor="middle" className="fb-string-name">
            {name}
          </text>
        ))}

        {/* Fret number labels above the board */}
        {Array.from({ length: fretCount }, (_, i) => (
          <text key={`fn${i + 1}`} x={fretCenterX(i + 1)} y={PAD_TOP - 6} textAnchor="middle" className="fb-fret-num">
            {i + 1}
          </text>
        ))}

        {/* Capo bar */}
        {capoFret > 0 && capoFret <= fretCount && (
          <rect
            x={fretCenterX(capoFret) - 9}
            y={stringY(0) - 8}
            width={18}
            height={stringY(STRINGS - 1) - stringY(0) + 16}
            rx={9}
            className="fb-capo"
            data-fret={capoFret}
          />
        )}

        {/* Clickable hit zones + highlights */}
        {Array.from({ length: STRINGS }, (_, s) => {
          const cells: React.ReactElement[] = [];
          for (let f = 0; f <= fretCount; f++) {
            const midi = midiOf(s, f);
            const pc = midi % 12;
            const hidden = f > 0 && f < capoFret;
            /* Open-string markers sit halfway between the string letter and
             * the nut so the two never collide. */
            const cx = f === 0 ? (28 + PAD_LEFT) / 2 : fretCenterX(f);
            const cy = stringY(s);
            const hl = pcSet.has(pc);
            const root = isRoot(pc);

            /* Background hit zone (rect over the cell). */
            const hitX = f === 0 ? 28 : fretLineX(f) - FRET_GAP;
            const hitW = f === 0 ? PAD_LEFT - 28 : FRET_GAP;
            const hitY = stringY(s) - STRING_GAP / 2;
            cells.push(
              <rect
                key={`hit-${s}-${f}`}
                x={hitX}
                y={hitY}
                width={hitW}
                height={STRING_GAP}
                fill="transparent"
                className={onPress && !hidden ? 'fb-hit' : ''}
                onClick={onPress && !hidden ? () => onPress(midi) : undefined}
                style={{ cursor: onPress && !hidden ? 'pointer' : 'default' }}
              />,
            );

            if (hidden) continue;

            if (hl || root) {
              cells.push(
                <circle
                  key={`dot-${s}-${f}`}
                  cx={cx} cy={cy}
                  r={9}
                  className={root ? 'fb-note fb-note-root' : 'fb-note'}
                  pointerEvents="none"
                />,
              );
              cells.push(
                <text
                  key={`dotlbl-${s}-${f}`}
                  x={cx} y={cy + 3.5}
                  textAnchor="middle"
                  className="fb-note-label"
                  pointerEvents="none"
                >
                  {NOTE_NAMES_SHARP[pc]}
                </text>,
              );
            } else if (showLabels) {
              cells.push(
                <text
                  key={`lbl-${s}-${f}`}
                  x={cx} y={cy + 3.5}
                  textAnchor="middle"
                  className="fb-faint-label"
                  pointerEvents="none"
                >
                  {NOTE_NAMES_SHARP[pc]}
                </text>,
              );
            }
          }
          return <g key={`row${s}`}>{cells}</g>;
        })}
      </svg>
    </CapoDraggable>
  );
}

/* Wraps the SVG and adds a transparent overlay that lets the user drag the
 * capo bar between fret positions. When `onCapoChange` is undefined, the
 * children render unwrapped (no drag). */
function CapoDraggable({
  capoFret, fretCount, fretLineX, stringY, strings, stringGap, onCapoChange, children,
}: {
  capoFret: number;
  fretCount: number;
  fretLineX: (col: number) => number;
  stringY: (s: number) => number;
  strings: number;
  stringGap: number;
  onCapoChange?: (fret: number) => void;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  if (!onCapoChange) return <div className="fretboard-wrap">{children}</div>;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    /* Only start a drag when grabbing the capo bar itself. */
    if (!target.closest('.fb-capo')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.setPointerCapture(e.pointerId);
  };

  const fretFromClientX = (clientX: number): number => {
    const wrap = wrapRef.current;
    if (!wrap) return capoFret;
    const svg = wrap.querySelector('svg');
    if (!svg) return capoFret;
    const rect = svg.getBoundingClientRect();
    const W = svg.viewBox.baseVal.width;
    const localX = ((clientX - rect.left) / rect.width) * W;
    /* Find nearest fret centre. */
    let best = capoFret;
    let bestDist = Infinity;
    for (let f = 1; f <= fretCount; f++) {
      const cx = (fretLineX(f) + fretLineX(f - 1)) / 2;
      const d = Math.abs(localX - cx);
      if (d < bestDist) { bestDist = d; best = f; }
    }
    /* Allow dragging off the neck (clientX before the nut) to remove the capo. */
    if (localX < fretLineX(0) - 10) return 0;
    return best;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const next = fretFromClientX(e.clientX);
    if (next !== capoFret) onCapoChange(next);
  };

  const onPointerUp = () => setDragging(false);

  return (
    <div
      ref={wrapRef}
      className={`fretboard-wrap ${dragging ? 'capo-dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
      {/* hint silenced when needed by unused dims */}
      <span hidden>{strings}{stringGap}{stringY(0)}</span>
    </div>
  );
}
