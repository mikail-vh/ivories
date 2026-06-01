'use client';

import type { Voicing } from '@/lib/fretboard';
import type { FretboardOrientation } from '@/lib/store';

type Props = {
  voicing: Voicing;
  /** Number of fret cells to draw (default 4). */
  fretCount?: number;
  /** Vertical (strings top→bottom, default) or horizontal (strings left→right). */
  orientation?: FretboardOrientation;
  /** Reverse string order. In horizontal mode the default has high e on top;
   *  when flipped, low E is on top. In vertical mode the default has low E
   *  on the left; when flipped, high e is on the left. */
  flipped?: boolean;
};

export function ChordDiagram({ voicing, fretCount = 4, orientation = 'vertical', flipped = false }: Props) {
  return orientation === 'horizontal'
    ? <HorizontalDiagram voicing={voicing} fretCount={fretCount} flipped={flipped} />
    : <VerticalDiagram voicing={voicing} fretCount={fretCount} flipped={flipped} />;
}

function VerticalDiagram({ voicing, fretCount, flipped }: { voicing: Voicing; fretCount: number; flipped: boolean }) {
  const { frets, fingers, baseFret, barre, label } = voicing;
  const STRINGS = 6;
  const STRING_GAP = 12;
  const FRET_GAP   = 18;
  const PAD_X      = 14;
  const PAD_LEFT_EXTRA = 8;
  const PAD_TOP    = 18;
  const PAD_BOTTOM = 6;
  const W = PAD_X * 2 + STRING_GAP * (STRINGS - 1) + PAD_LEFT_EXTRA;
  const H = PAD_TOP + FRET_GAP * fretCount + PAD_BOTTOM;

  const showNut = baseFret === 1;
  const stringX = (s: number) =>
    flipped
      ? PAD_LEFT_EXTRA + PAD_X + (5 - s) * STRING_GAP
      : PAD_LEFT_EXTRA + PAD_X + s * STRING_GAP;
  const fretLineY = (row: number) => PAD_TOP + row * FRET_GAP;
  const fretCenterY = (row: number) => PAD_TOP + (row - 0.5) * FRET_GAP;
  const localRow = (f: number) => f - baseFret + 1;

  const barreCovered = (s: number, f: number): boolean =>
    !!barre && f === barre.fret && s >= barre.fromString && s <= barre.toString && fingers[s] === 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chord-diagram" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: fretCount + 1 }, (_, i) => (
        <line
          key={`f${i}`}
          x1={stringX(0) - 1} y1={fretLineY(i)}
          x2={stringX(STRINGS - 1) + 1} y2={fretLineY(i)}
          className={showNut && i === 0 ? 'cd-nut' : 'cd-fret'}
        />
      ))}
      {Array.from({ length: STRINGS }, (_, s) => (
        <line
          key={`s${s}`}
          x1={stringX(s)} y1={fretLineY(0)}
          x2={stringX(s)} y2={fretLineY(fretCount)}
          className="cd-string"
        />
      ))}
      {!showNut && (
        <text x={stringX(0) - 4} y={fretCenterY(1) + 3} textAnchor="end" className="cd-fret-label">
          {baseFret}fr
        </text>
      )}
      {barre && (() => {
        const xs = [stringX(barre.fromString), stringX(barre.toString)];
        const x1 = Math.min(...xs), x2 = Math.max(...xs);
        return (
          <rect
            x={x1 - 5}
            y={fretCenterY(localRow(barre.fret)) - 5}
            width={x2 - x1 + 10}
            height={10}
            rx={5}
            className="cd-barre"
          />
        );
      })()}
      {frets.map((f, s) => {
        if (f === -1) return <text key={`m${s}`} x={stringX(s)} y={PAD_TOP - 5} textAnchor="middle" className="cd-mute">×</text>;
        if (f === 0)  return <circle key={`o${s}`} cx={stringX(s)} cy={PAD_TOP - 8} r={2.5} className="cd-open" />;
        return null;
      })}
      {frets.map((f, s) => {
        if (f <= 0) return null;
        const row = localRow(f);
        if (row < 1 || row > fretCount) return null;
        if (barreCovered(s, f)) return null;
        return (
          <g key={`d${s}`}>
            <circle cx={stringX(s)} cy={fretCenterY(row)} r={5.5} className="cd-dot" />
            {fingers[s] > 0 && (
              <text x={stringX(s)} y={fretCenterY(row) + 3} textAnchor="middle" className="cd-finger">
                {fingers[s]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function HorizontalDiagram({ voicing, fretCount, flipped }: { voicing: Voicing; fretCount: number; flipped: boolean }) {
  const { frets, fingers, baseFret, barre, label } = voicing;
  const STRINGS = 6;
  const STRING_GAP = 12;
  const FRET_GAP   = 22;
  const PAD_TOP    = 8;
  const PAD_BOTTOM = 14;          // room for fret-position label under the grid
  const PAD_LEFT   = 18;          // room for muted-x / open-o markers
  const PAD_RIGHT  = 6;
  const W = PAD_LEFT + FRET_GAP * fretCount + PAD_RIGHT;
  const H = PAD_TOP + STRING_GAP * (STRINGS - 1) + PAD_BOTTOM;

  const showNut = baseFret === 1;
  /* Default: high e (s=5) on top, low E (s=0) on the bottom — standard tab
   * convention. `flipped` swaps to low E on top (left-handed view). */
  const stringY = (s: number) =>
    flipped ? PAD_TOP + s * STRING_GAP : PAD_TOP + (5 - s) * STRING_GAP;
  const fretLineX = (col: number) => PAD_LEFT + col * FRET_GAP;
  const fretCenterX = (col: number) => PAD_LEFT + (col - 0.5) * FRET_GAP;
  const localCol = (f: number) => f - baseFret + 1;

  const barreCovered = (s: number, f: number): boolean =>
    !!barre && f === barre.fret && s >= barre.fromString && s <= barre.toString && fingers[s] === 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chord-diagram" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: fretCount + 1 }, (_, i) => (
        <line
          key={`f${i}`}
          x1={fretLineX(i)} y1={stringY(0) - 1}
          x2={fretLineX(i)} y2={stringY(STRINGS - 1) + 1}
          className={showNut && i === 0 ? 'cd-nut' : 'cd-fret'}
        />
      ))}
      {Array.from({ length: STRINGS }, (_, s) => (
        <line
          key={`s${s}`}
          x1={fretLineX(0)} y1={stringY(s)}
          x2={fretLineX(fretCount)} y2={stringY(s)}
          className="cd-string"
        />
      ))}
      {!showNut && (
        <text x={fretCenterX(1)} y={H - 3} textAnchor="middle" className="cd-fret-label">
          {baseFret}fr
        </text>
      )}
      {barre && (() => {
        const ys = [stringY(barre.fromString), stringY(barre.toString)];
        const y1 = Math.min(...ys), y2 = Math.max(...ys);
        return (
          <rect
            x={fretCenterX(localCol(barre.fret)) - 5}
            y={y1 - 5}
            width={10}
            height={y2 - y1 + 10}
            rx={5}
            className="cd-barre"
          />
        );
      })()}
      {frets.map((f, s) => {
        if (f === -1) return <text key={`m${s}`} x={PAD_LEFT - 8} y={stringY(s) + 3} textAnchor="middle" className="cd-mute">×</text>;
        if (f === 0)  return <circle key={`o${s}`} cx={PAD_LEFT - 9} cy={stringY(s)} r={2.5} className="cd-open" />;
        return null;
      })}
      {frets.map((f, s) => {
        if (f <= 0) return null;
        const col = localCol(f);
        if (col < 1 || col > fretCount) return null;
        if (barreCovered(s, f)) return null;
        return (
          <g key={`d${s}`}>
            <circle cx={fretCenterX(col)} cy={stringY(s)} r={5.5} className="cd-dot" />
            {fingers[s] > 0 && (
              <text x={fretCenterX(col)} y={stringY(s) + 3} textAnchor="middle" className="cd-finger">
                {fingers[s]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
