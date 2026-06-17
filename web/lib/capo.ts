/* Suggested-capo helper (à la Ultimate Guitar): find a capo position that
 * turns a song's chords into easy open shapes WITHOUT changing the sounding
 * key. With a capo on fret N you fret shapes transposed DOWN N semitones, so
 * we score each candidate fret by how many of the song's chords become common
 * open-position shapes, and suggest the best improvement over no capo. */

import { uniqueChordsInSong, parseChordSymbol, transposeChord, type Song } from './songs';

type ShapeClass = 'maj' | 'min' | 'dom7' | 'min7' | 'maj7';

/* Pitch classes (relative to C=0) that have a comfortable open shape per type. */
const OPEN: Record<ShapeClass, Set<number>> = {
  maj: new Set([0, 2, 4, 5, 7, 9]),   // C D E F G A
  min: new Set([2, 4, 9]),            // Dm Em Am
  dom7: new Set([0, 2, 4, 7, 9, 11]), // C7 D7 E7 G7 A7 B7
  min7: new Set([2, 4, 9]),           // Dm7 Em7 Am7
  maj7: new Set([0, 2, 4, 5, 7, 9]),  // Cmaj7 Dmaj7 Emaj7 Fmaj7 Gmaj7 Amaj7
};

function classify(quality: string): ShapeClass | null {
  if (quality === '') return 'maj';
  if (quality === 'm') return 'min';
  if (quality === '7') return 'dom7';
  if (quality === 'maj7') return 'maj7';
  if (quality === 'm7') return 'min7';
  return null;
}

function isOpenShape(rootPc: number, cls: ShapeClass | null): boolean {
  return cls !== null && OPEN[cls].has(((rootPc % 12) + 12) % 12);
}

const MAX_CAPO = 7;

export type CapoSuggestion = { fret: number; shapes: string[] };

/* Returns the most helpful capo (1..7) and the shapes you'd play there, or null
 * when no capo meaningfully improves over playing it open. */
export function suggestCapo(song: Song): CapoSuggestion | null {
  const chords = uniqueChordsInSong(song).map((c) => c.sym);
  if (chords.length === 0) return null;

  const score = (capo: number) =>
    chords.reduce((n, sym) => {
      const shape = transposeChord(sym, -capo);
      const p = parseChordSymbol(shape);
      return n + (p && isOpenShape(p.rootPc, classify(p.quality)) ? 1 : 0);
    }, 0);

  const open = score(0);
  let best = { fret: 0, count: open };
  for (let capo = 1; capo <= MAX_CAPO; capo++) {
    const c = score(capo);
    if (c > best.count) best = { fret: capo, count: c };
  }

  /* Only suggest when it's a real win: a capo, more open chords than playing
   * open, and at least half the chords landing on easy shapes. */
  if (best.fret === 0 || best.count <= open || best.count < Math.ceil(chords.length / 2)) {
    return null;
  }
  const shapes = chords.map((sym) => transposeChord(sym, -best.fret));
  return { fret: best.fret, shapes };
}
