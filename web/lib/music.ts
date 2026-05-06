export const NOTE_NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
export const NOTE_NAMES_DISPLAY = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'] as const;

export type Root = { pc: number; name: string; short: string };
export const ROOTS: Root[] = NOTE_NAMES_DISPLAY.map((n, i) => ({
  pc: i,
  name: n,
  short: NOTE_NAMES_SHARP[i],
}));

export type ChordCategory = 'Triads' | 'Added tone' | 'Sixths' | 'Sevenths' | 'Ninths' | 'Elevenths' | 'Thirteenths';
export const CHORD_CATEGORIES: ChordCategory[] = ['Triads', 'Added tone', 'Sixths', 'Sevenths', 'Ninths', 'Elevenths', 'Thirteenths'];

export type Chord = { cat: ChordCategory; suffix: string; label: string; intervals: number[] };
export type Scale = { suffix: string; label: string; intervals: number[] };

export const CHORDS: Chord[] = [
  { cat: 'Triads',     suffix: '5',     label: 'Power',          intervals: [0, 7] },
  { cat: 'Triads',     suffix: '',      label: 'Major',          intervals: [0, 4, 7] },
  { cat: 'Triads',     suffix: 'm',     label: 'Minor',          intervals: [0, 3, 7] },
  { cat: 'Triads',     suffix: 'dim',   label: 'Diminished',     intervals: [0, 3, 6] },
  { cat: 'Triads',     suffix: 'aug',   label: 'Augmented',      intervals: [0, 4, 8] },
  { cat: 'Triads',     suffix: 'sus2',  label: 'Sus 2',          intervals: [0, 2, 7] },
  { cat: 'Triads',     suffix: 'sus4',  label: 'Sus 4',          intervals: [0, 5, 7] },

  { cat: 'Added tone', suffix: '2',       label: 'Add 2 (1-2-3-5)', intervals: [0, 2, 4, 7] },
  { cat: 'Added tone', suffix: '4',       label: 'Add 4 (1-3-4-5)', intervals: [0, 4, 5, 7] },
  { cat: 'Added tone', suffix: 'add9',    label: 'Add 9',           intervals: [0, 4, 7, 14] },
  { cat: 'Added tone', suffix: 'add11',   label: 'Add 11',          intervals: [0, 4, 7, 17] },
  { cat: 'Added tone', suffix: 'madd9',   label: 'Minor add 9',     intervals: [0, 3, 7, 14] },
  { cat: 'Added tone', suffix: 'madd11',  label: 'Minor add 11',    intervals: [0, 3, 7, 17] },

  { cat: 'Sixths',     suffix: '6',     label: 'Major 6',        intervals: [0, 4, 7, 9] },
  { cat: 'Sixths',     suffix: 'm6',    label: 'Minor 6',        intervals: [0, 3, 7, 9] },
  { cat: 'Sixths',     suffix: '6/9',   label: 'Major 6/9',      intervals: [0, 4, 7, 9, 14] },
  { cat: 'Sixths',     suffix: 'm6/9',  label: 'Minor 6/9',      intervals: [0, 3, 7, 9, 14] },

  { cat: 'Sevenths',   suffix: '7',      label: 'Dominant 7',      intervals: [0, 4, 7, 10] },
  { cat: 'Sevenths',   suffix: 'maj7',   label: 'Major 7',         intervals: [0, 4, 7, 11] },
  { cat: 'Sevenths',   suffix: 'm7',     label: 'Minor 7',         intervals: [0, 3, 7, 10] },
  { cat: 'Sevenths',   suffix: 'mMaj7',  label: 'Minor major 7',   intervals: [0, 3, 7, 11] },
  { cat: 'Sevenths',   suffix: 'dim7',   label: 'Diminished 7',    intervals: [0, 3, 6, 9] },
  { cat: 'Sevenths',   suffix: 'm7♭5',   label: 'Half-diminished', intervals: [0, 3, 6, 10] },
  { cat: 'Sevenths',   suffix: 'aug7',   label: 'Augmented 7',     intervals: [0, 4, 8, 10] },
  { cat: 'Sevenths',   suffix: '7sus2',  label: '7 sus 2',         intervals: [0, 2, 7, 10] },
  { cat: 'Sevenths',   suffix: '7sus4',  label: '7 sus 4',         intervals: [0, 5, 7, 10] },
  { cat: 'Sevenths',   suffix: '7♭5',    label: '7 ♭5',            intervals: [0, 4, 6, 10] },
  { cat: 'Sevenths',   suffix: '7♯5',    label: '7 ♯5',            intervals: [0, 4, 8, 10] },
  { cat: 'Sevenths',   suffix: 'maj7♯5', label: 'Major 7 ♯5',      intervals: [0, 4, 8, 11] },
  { cat: 'Sevenths',   suffix: 'maj7♭5', label: 'Major 7 ♭5',      intervals: [0, 4, 6, 11] },

  { cat: 'Ninths',     suffix: '9',      label: 'Dominant 9',     intervals: [0, 4, 7, 10, 14] },
  { cat: 'Ninths',     suffix: 'maj9',   label: 'Major 9',        intervals: [0, 4, 7, 11, 14] },
  { cat: 'Ninths',     suffix: 'm9',     label: 'Minor 9',        intervals: [0, 3, 7, 10, 14] },
  { cat: 'Ninths',     suffix: 'mMaj9',  label: 'Minor major 9',  intervals: [0, 3, 7, 11, 14] },
  { cat: 'Ninths',     suffix: '9sus4',  label: '9 sus 4',        intervals: [0, 5, 7, 10, 14] },
  { cat: 'Ninths',     suffix: '7♭9',    label: '7 ♭9',           intervals: [0, 4, 7, 10, 13] },
  { cat: 'Ninths',     suffix: '7♯9',    label: '7 ♯9',           intervals: [0, 4, 7, 10, 15] },
  { cat: 'Ninths',     suffix: 'm7♭9',   label: 'Minor 7 ♭9',     intervals: [0, 3, 7, 10, 13] },

  { cat: 'Elevenths',  suffix: '11',       label: 'Dominant 11',  intervals: [0, 4, 7, 10, 14, 17] },
  { cat: 'Elevenths',  suffix: 'maj11',    label: 'Major 11',     intervals: [0, 4, 7, 11, 14, 17] },
  { cat: 'Elevenths',  suffix: 'm11',      label: 'Minor 11',     intervals: [0, 3, 7, 10, 14, 17] },
  { cat: 'Elevenths',  suffix: '7♯11',     label: '7 ♯11',        intervals: [0, 4, 7, 10, 14, 18] },
  { cat: 'Elevenths',  suffix: 'maj7♯11',  label: 'Major 7 ♯11',  intervals: [0, 4, 7, 11, 14, 18] },

  { cat: 'Thirteenths', suffix: '13',     label: 'Dominant 13',   intervals: [0, 4, 7, 10, 14, 21] },
  { cat: 'Thirteenths', suffix: 'maj13',  label: 'Major 13',      intervals: [0, 4, 7, 11, 14, 21] },
  { cat: 'Thirteenths', suffix: 'm13',    label: 'Minor 13',      intervals: [0, 3, 7, 10, 14, 21] },
  { cat: 'Thirteenths', suffix: '13sus4', label: '13 sus 4',      intervals: [0, 5, 7, 10, 14, 21] },
];

export const SCALES: Scale[] = [
  { suffix: 'major',    label: 'Major scale',      intervals: [0, 2, 4, 5, 7, 9, 11] },
  { suffix: 'minor',    label: 'Natural minor',    intervals: [0, 2, 3, 5, 7, 8, 10] },
  { suffix: 'harmonic', label: 'Harmonic minor',   intervals: [0, 2, 3, 5, 7, 8, 11] },
  { suffix: 'pent-maj', label: 'Major pentatonic', intervals: [0, 2, 4, 7, 9] },
  { suffix: 'pent-min', label: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10] },
  { suffix: 'blues',    label: 'Blues',            intervals: [0, 3, 5, 6, 7, 10] },
  { suffix: 'dorian',   label: 'Dorian mode',      intervals: [0, 2, 3, 5, 7, 9, 10] },
  { suffix: 'mixolyd',  label: 'Mixolydian mode',  intervals: [0, 2, 4, 5, 7, 9, 10] },
];

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
export const isBlackKey = (pc: number): boolean => BLACK_PCS.has(pc);
/** Pitch class to start the piano on so the chord root appears at (or near) the start. */
export const startPcForRoot = (rootPc: number): number =>
  isBlackKey(rootPc) ? (rootPc - 1 + 12) % 12 : rootPc;

export const pcOf = (rootPc: number, interval: number) => (rootPc + interval) % 12;
export const pitchClassesFor = (rootPc: number, intervals: number[]) =>
  intervals.map(i => pcOf(rootPc, i));
export const noteListString = (rootPc: number, intervals: number[]) =>
  intervals.map(i => NOTE_NAMES_SHARP[pcOf(rootPc, i)]).join(' · ');

export const chordTitle = (rootPc: number, chord: Chord) =>
  `${NOTE_NAMES_SHARP[rootPc]}${chord.suffix}`;
export const scaleTitle = (rootPc: number, scale: Scale) =>
  `${NOTE_NAMES_SHARP[rootPc]} ${scale.label}`;
