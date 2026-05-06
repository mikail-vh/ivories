import { NOTE_NAMES_SHARP, isBlackKey } from '@/lib/music';

type PianoProps = {
  pitchClasses?: number[];
  rootPc?: number;
  octaves?: number;
  startOctave?: number;
  /** Pitch class the keyboard begins at (must be a white-key pc: 0,2,4,5,7,9,11). */
  startPc?: number;
  /** Minimum number of extra semitones to render on each side of the octave. */
  padKeys?: number;
  hideRoot?: boolean;
  /** When provided, individual keys become clickable and call this with the MIDI number. */
  onPress?: (midi: number) => void;
};

export function Piano({
  pitchClasses = [],
  rootPc = -1,
  octaves = 1,
  startOctave = 4,
  startPc = 0,
  padKeys = 0,
  hideRoot = false,
  onPress,
}: PianoProps) {
  const effRoot = hideRoot ? -1 : rootPc;
  const effPcs = (hideRoot && rootPc >= 0) ? pitchClasses.filter(p => p !== rootPc) : pitchClasses;

  /* Extend padding outward so both edges of the keyboard land on a white key. */
  let leftPad = padKeys;
  while (padKeys > 0 && isBlackKey(((startPc - leftPad) % 12 + 12) % 12)) leftPad += 1;
  let rightPad = padKeys;
  while (padKeys > 0 && isBlackKey((startPc + octaves * 12 + rightPad) % 12)) rightPad += 1;

  const WHITE_W = 40, WHITE_H = 160;
  const BLACK_W = 24, BLACK_H = 100;
  const totalSemitones = octaves * 12 + 1 + leftPad + rightPad;
  const renderStartPc = ((startPc - leftPad) % 12 + 12) % 12;
  const renderStartMidi = (startOctave + 1) * 12 + startPc - leftPad;

  let whiteCount = 0;
  for (let s = 0; s < totalSemitones; s++) {
    const pc = (renderStartPc + s) % 12;
    if (!isBlackKey(pc)) whiteCount++;
  }
  const totalW = whiteCount * WHITE_W;

  const pcSet = new Set(effPcs);
  const isHl = (pc: number) => pcSet.has(pc);
  const isRoot = (pc: number) => effRoot >= 0 && pc === effRoot;

  const whiteKeys: React.ReactElement[] = [];
  const labels: React.ReactElement[] = [];
  const blackKeys: React.ReactElement[] = [];

  const interactive = !!onPress;
  const keyClass = interactive ? 'piano-key' : '';
  const handle = interactive
    ? (midi: number) => (e: React.MouseEvent<SVGRectElement>) => { e.preventDefault(); onPress!(midi); }
    : null;

  let whiteIdx = 0;
  for (let s = 0; s < totalSemitones; s++) {
    const pc = (renderStartPc + s) % 12;
    const midi = renderStartMidi + s;
    const black = isBlackKey(pc);
    const root = isRoot(pc);
    const hl = isHl(pc);

    if (black) {
      const x = whiteIdx * WHITE_W - BLACK_W / 2;
      const fill = root ? 'var(--color-root-dark)' : hl ? 'var(--color-note-dark)' : 'var(--color-black-key)';
      blackKeys.push(
        <rect key={`b-${s}`} x={x} y={0} width={BLACK_W} height={BLACK_H} rx={2}
          fill={fill} stroke="#000" strokeWidth={1}
          className={keyClass} onClick={handle?.(midi)} />
      );
      if (hl || root) {
        labels.push(
          <text key={`bl-${s}`} x={x + BLACK_W / 2} y={BLACK_H - 8}
            textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}
            className="font-mono pointer-events-none">{NOTE_NAMES_SHARP[pc]}</text>
        );
      }
    } else {
      const x = whiteIdx * WHITE_W;
      const fill = root ? 'var(--color-root)' : hl ? 'var(--color-note)' : 'var(--color-white-key)';
      whiteKeys.push(
        <rect key={`w-${s}`} x={x} y={0} width={WHITE_W} height={WHITE_H} rx={3}
          fill={fill} stroke="#222" strokeWidth={1.2}
          className={keyClass} onClick={handle?.(midi)} />
      );
      if (hl || root) {
        labels.push(
          <text key={`wl-${s}`} x={x + WHITE_W / 2} y={WHITE_H - 14}
            textAnchor="middle" fontSize={14} fill="#fff" fontWeight={700}
            className="font-mono pointer-events-none">{NOTE_NAMES_SHARP[pc]}</text>
        );
      }
      whiteIdx++;
    }
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${WHITE_H}`} preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg" className="piano-svg">
      {whiteKeys}
      {blackKeys}
      {labels}
    </svg>
  );
}
