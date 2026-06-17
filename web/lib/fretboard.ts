/* Guitar fretboard voicing generator.
 *
 * Two libraries feed `generateVoicings(rootPc, quality)`:
 *   - OPEN_VOICINGS: root-specific hand-curated open chords (Open C, Em, A7…).
 *   - BARRE_SHAPES: movable forms with a reference root pitch class. To play
 *     the same shape at a different root, slide everything up by
 *     `(targetRoot − shape.rootPc) mod 12` semitones. Open strings become
 *     covered by an index-finger barre at the new base fret. */

export type Voicing = {
  /** Absolute fret per string, low E → high e. -1 = muted, 0 = open. */
  frets: number[];
  /** Finger per string. 1..4 = index..pinky. 0 = open or barred (no number drawn).
   *  -1 = muted. */
  fingers: number[];
  /** Diagram window's top fret. 1 when the nut is visible; lowest fretted
   *  position otherwise. */
  baseFret: number;
  /** When set, the index finger lays across this fret from `fromString` to
   *  `toString` (inclusive). Drawn as an arc above the dots. */
  barre?: { fret: number; fromString: number; toString: number };
  /** "Open C", "E shape", etc. — shown beneath the diagram. */
  label: string;
};

type BarreShape = {
  quality: string;
  rootPc: number;
  frets: number[];
  fingers: number[];
  /** Strings the barre covers (inclusive) once the shape is transposed up. */
  barreStrings?: [number, number];
  label: string;
};

type OpenVoicing = {
  rootPc: number;
  quality: string;
  frets: number[];
  fingers: number[];
  label: string;
};

const BARRE_SHAPES: BarreShape[] = [
  // Major
  { quality: '',     rootPc: 4, frets: [0, 2, 2, 1, 0, 0],  fingers: [0, 2, 3, 1, 0, 0],  barreStrings: [0, 5], label: 'E shape' },
  { quality: '',     rootPc: 9, frets: [-1, 0, 2, 2, 2, 0], fingers: [-1, 0, 1, 2, 3, 0], barreStrings: [1, 5], label: 'A shape' },

  // Minor
  { quality: 'm',    rootPc: 4, frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0],  barreStrings: [0, 5], label: 'Em shape' },
  { quality: 'm',    rootPc: 9, frets: [-1, 0, 2, 2, 1, 0], fingers: [-1, 0, 2, 3, 1, 0], barreStrings: [1, 5], label: 'Am shape' },

  // Dominant 7
  { quality: '7',    rootPc: 4, frets: [0, 2, 0, 1, 0, 0],  fingers: [0, 2, 0, 1, 0, 0],  barreStrings: [0, 5], label: 'E7 shape' },
  { quality: '7',    rootPc: 9, frets: [-1, 0, 2, 0, 2, 0], fingers: [-1, 0, 2, 0, 3, 0], barreStrings: [1, 5], label: 'A7 shape' },

  // Major 7
  { quality: 'maj7', rootPc: 4, frets: [0, 2, 1, 1, 0, 0],  fingers: [0, 3, 1, 2, 0, 0],  barreStrings: [0, 5], label: 'Emaj7 shape' },
  { quality: 'maj7', rootPc: 9, frets: [-1, 0, 2, 1, 2, 0], fingers: [-1, 0, 3, 1, 2, 0], barreStrings: [1, 5], label: 'Amaj7 shape' },

  // Minor 7
  { quality: 'm7',   rootPc: 4, frets: [0, 2, 0, 0, 0, 0],  fingers: [0, 2, 0, 0, 0, 0],  barreStrings: [0, 5], label: 'Em7 shape' },
  { quality: 'm7',   rootPc: 9, frets: [-1, 0, 2, 0, 1, 0], fingers: [-1, 0, 2, 0, 1, 0], barreStrings: [1, 5], label: 'Am7 shape' },

  // Sus2
  { quality: 'sus2', rootPc: 9, frets: [-1, 0, 2, 2, 0, 0], fingers: [-1, 0, 1, 2, 0, 0], barreStrings: [1, 5], label: 'Asus2 shape' },

  // Sus4
  { quality: 'sus4', rootPc: 4, frets: [0, 2, 2, 2, 0, 0],  fingers: [0, 1, 2, 3, 0, 0],  barreStrings: [0, 5], label: 'Esus4 shape' },
  { quality: 'sus4', rootPc: 9, frets: [-1, 0, 2, 2, 3, 0], fingers: [-1, 0, 1, 2, 4, 0], barreStrings: [1, 5], label: 'Asus4 shape' },

  // Diminished triad
  { quality: 'dim',  rootPc: 9, frets: [-1, 0, 1, 2, 1, -1], fingers: [-1, 0, 1, 3, 2, -1], barreStrings: [1, 4], label: 'Adim shape' },

  // Major 6
  { quality: '6',    rootPc: 9, frets: [-1, 0, 2, 2, 2, 2], fingers: [-1, 0, 1, 1, 1, 1], barreStrings: [1, 5], label: 'A6 shape' },

  // Minor 6
  { quality: 'm6',   rootPc: 9, frets: [-1, 0, 2, 2, 1, 2], fingers: [-1, 0, 2, 3, 1, 4], barreStrings: [1, 5], label: 'Am6 shape' },

  // Power chord (5)
  { quality: '5',    rootPc: 4, frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 3, -1, -1, -1], barreStrings: [0, 0], label: 'E5 shape' },
  { quality: '5',    rootPc: 9, frets: [-1, 0, 2, 2, -1, -1], fingers: [-1, 0, 1, 3, -1, -1], barreStrings: [1, 1], label: 'A5 shape' },
];

const OPEN_VOICINGS: OpenVoicing[] = [
  // Major
  { rootPc: 0,  quality: '',     frets: [-1, 3, 2, 0, 1, 0],  fingers: [-1, 3, 2, 0, 1, 0],  label: 'Open C' },
  { rootPc: 2,  quality: '',     frets: [-1, -1, 0, 2, 3, 2], fingers: [-1, -1, 0, 1, 3, 2], label: 'Open D' },
  { rootPc: 4,  quality: '',     frets: [0, 2, 2, 1, 0, 0],   fingers: [0, 2, 3, 1, 0, 0],   label: 'Open E' },
  { rootPc: 7,  quality: '',     frets: [3, 2, 0, 0, 0, 3],   fingers: [2, 1, 0, 0, 0, 3],   label: 'Open G' },
  { rootPc: 9,  quality: '',     frets: [-1, 0, 2, 2, 2, 0],  fingers: [-1, 0, 1, 2, 3, 0],  label: 'Open A' },

  // Minor
  { rootPc: 4,  quality: 'm',    frets: [0, 2, 2, 0, 0, 0],   fingers: [0, 2, 3, 0, 0, 0],   label: 'Open Em' },
  { rootPc: 9,  quality: 'm',    frets: [-1, 0, 2, 2, 1, 0],  fingers: [-1, 0, 2, 3, 1, 0],  label: 'Open Am' },
  { rootPc: 2,  quality: 'm',    frets: [-1, -1, 0, 2, 3, 1], fingers: [-1, -1, 0, 2, 3, 1], label: 'Open Dm' },

  // Dom 7
  { rootPc: 4,  quality: '7',    frets: [0, 2, 0, 1, 0, 0],   fingers: [0, 2, 0, 1, 0, 0],   label: 'Open E7' },
  { rootPc: 9,  quality: '7',    frets: [-1, 0, 2, 0, 2, 0],  fingers: [-1, 0, 2, 0, 3, 0],  label: 'Open A7' },
  { rootPc: 2,  quality: '7',    frets: [-1, -1, 0, 2, 1, 2], fingers: [-1, -1, 0, 2, 1, 3], label: 'Open D7' },
  { rootPc: 7,  quality: '7',    frets: [3, 2, 0, 0, 0, 1],   fingers: [3, 2, 0, 0, 0, 1],   label: 'Open G7' },
  { rootPc: 0,  quality: '7',    frets: [-1, 3, 2, 3, 1, 0],  fingers: [-1, 3, 2, 4, 1, 0],  label: 'Open C7' },
  { rootPc: 11, quality: '7',    frets: [-1, 2, 1, 2, 0, 2],  fingers: [-1, 2, 1, 3, 0, 4],  label: 'Open B7' },

  // Major 7
  { rootPc: 0,  quality: 'maj7', frets: [-1, 3, 2, 0, 0, 0],  fingers: [-1, 3, 2, 0, 0, 0],  label: 'Open Cmaj7' },
  { rootPc: 2,  quality: 'maj7', frets: [-1, -1, 0, 2, 2, 2], fingers: [-1, -1, 0, 1, 1, 1], label: 'Open Dmaj7' },
  { rootPc: 7,  quality: 'maj7', frets: [3, 2, 0, 0, 0, 2],   fingers: [3, 2, 0, 0, 0, 1],   label: 'Open Gmaj7' },
  { rootPc: 9,  quality: 'maj7', frets: [-1, 0, 2, 1, 2, 0],  fingers: [-1, 0, 3, 1, 2, 0],  label: 'Open Amaj7' },
  { rootPc: 5,  quality: 'maj7', frets: [-1, -1, 3, 2, 1, 0], fingers: [-1, -1, 3, 2, 1, 0], label: 'Open Fmaj7' },

  // Minor 7
  { rootPc: 4,  quality: 'm7',   frets: [0, 2, 0, 0, 0, 0],   fingers: [0, 2, 0, 0, 0, 0],   label: 'Open Em7' },
  { rootPc: 9,  quality: 'm7',   frets: [-1, 0, 2, 0, 1, 0],  fingers: [-1, 0, 2, 0, 1, 0],  label: 'Open Am7' },
  { rootPc: 2,  quality: 'm7',   frets: [-1, -1, 0, 2, 1, 1], fingers: [-1, -1, 0, 2, 1, 1], label: 'Open Dm7' },

  // Sus2
  { rootPc: 9,  quality: 'sus2', frets: [-1, 0, 2, 2, 0, 0],  fingers: [-1, 0, 1, 2, 0, 0],  label: 'Open Asus2' },
  { rootPc: 2,  quality: 'sus2', frets: [-1, -1, 0, 2, 3, 0], fingers: [-1, -1, 0, 1, 3, 0], label: 'Open Dsus2' },

  // Sus4
  { rootPc: 4,  quality: 'sus4', frets: [0, 2, 2, 2, 0, 0],   fingers: [0, 1, 2, 3, 0, 0],   label: 'Open Esus4' },
  { rootPc: 9,  quality: 'sus4', frets: [-1, 0, 2, 2, 3, 0],  fingers: [-1, 0, 1, 2, 3, 0],  label: 'Open Asus4' },
  { rootPc: 2,  quality: 'sus4', frets: [-1, -1, 0, 2, 3, 3], fingers: [-1, -1, 0, 1, 3, 4], label: 'Open Dsus4' },

  // Power chord (5)
  { rootPc: 4,  quality: '5',    frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, -1, -1, -1], label: 'E5' },
  { rootPc: 9,  quality: '5',    frets: [-1, 0, 2, 2, -1, -1], fingers: [-1, 0, 1, 2, -1, -1], label: 'A5' },
  { rootPc: 2,  quality: '5',    frets: [-1, -1, 0, 2, 3, -1], fingers: [-1, -1, 0, 1, 3, -1], label: 'D5' },
];

export function generateVoicings(rootPc: number, quality: string): Voicing[] {
  const out: Voicing[] = [];

  for (const o of OPEN_VOICINGS) {
    if (o.rootPc === rootPc && o.quality === quality) {
      out.push({
        frets: o.frets.slice(),
        fingers: o.fingers.slice(),
        baseFret: computeBaseFret(o.frets),
        label: o.label,
      });
    }
  }

  for (const s of BARRE_SHAPES) {
    if (s.quality !== quality) continue;
    const delta = ((rootPc - s.rootPc) % 12 + 12) % 12;
    if (delta === 0) continue;          // open form covered by OPEN_VOICINGS (or intentionally skipped)
    if (delta > 11) continue;

    const frets = s.frets.map((f) => (f < 0 ? -1 : f + delta));
    const fingers = s.fingers.map((fg, i) => {
      if (s.frets[i] < 0) return -1;
      if (s.frets[i] === 0) return 1;   // open becomes barre
      return Math.min(4, fg + 1);       // every other finger shifts up by one
    });
    const barre = s.barreStrings && s.barreStrings[0] !== s.barreStrings[1]
      ? { fret: delta, fromString: s.barreStrings[0], toString: s.barreStrings[1] }
      : undefined;

    out.push({
      frets,
      fingers,
      baseFret: computeBaseFret(frets),
      barre,
      label: `${s.label} (${delta}fr)`,
    });
  }

  /* De-dupe identical fret patterns that can come from multiple shape paths
   * (rare but possible when an open voicing coincides with a low barre). */
  const seen = new Set<string>();
  return out
    .filter((v) => {
      const k = v.frets.join(',');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.baseFret - b.baseFret);
}

function computeBaseFret(frets: number[]): number {
  const hasOpen = frets.some((f) => f === 0);
  if (hasOpen) return 1;
  const used = frets.filter((f) => f > 0);
  return used.length === 0 ? 1 : Math.min(...used);
}

/** Whether we have at least one guitar voicing for this (rootPc, quality)
 *  combination. Used by /chords to hide chords without voicings in guitar mode. */
export function hasVoicing(rootPc: number, quality: string): boolean {
  for (const o of OPEN_VOICINGS) {
    if (o.rootPc === rootPc && o.quality === quality) return true;
  }
  for (const s of BARRE_SHAPES) {
    if (s.quality === quality) return true;
  }
  return false;
}

/** Standard tuning MIDIs: E2 A2 D3 G3 B3 E4. */
const STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/** MIDIs that a voicing sounds — used to play guitar-pitched notes
 *  (instead of just chord intervals on a piano synth). */
export function voicingMidis(voicing: Voicing): number[] {
  const out: number[] = [];
  for (let s = 0; s < 6; s++) {
    const f = voicing.frets[s];
    if (f < 0) continue;
    out.push(STRING_OPEN_MIDI[s] + f);
  }
  return out;
}
