/* ChordPro-flavoured song model.
 *
 * Storage format is canonical ChordPro source (`[C]Hello [G]world`). Parsing
 * happens at view time, so notes/transpose stay decoupled from on-disk shape.
 * The parser is permissive: it also accepts "chord line above lyric line"
 * (common in tabs from the open web) and rewrites that into the bracketed
 * form before parsing. */

import { CHORDS, NOTE_NAMES_SHARP, type Chord } from './music';

export type ChordToken = { kind: 'chord'; text: string };
export type LyricToken = { kind: 'lyric'; text: string };
export type Token = ChordToken | LyricToken;

export type Line = {
  id: string;
  kind: 'lyric' | 'comment' | 'blank';
  tokens: Token[];
  text?: string;
};

export type Section = {
  id: string;
  name: string;
  lines: Line[];
};

export type StickyNote = {
  id: string;
  lineId: string;
  text: string;
  color: string;
  dx: number;
  dy: number;
  w: number;
  h: number;
};

export type Song = {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: string;
  capo?: string;
  body: string;
  transpose: number;
  notes: StickyNote[];
  createdAt: number;
  updatedAt: number;
};

export type SongMeta = Pick<Song, 'id' | 'title' | 'artist' | 'key' | 'updatedAt'>;

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const NOTE_PC: Record<string, number> = {
  'C': 0,  'C#': 1,  'Db': 1,
  'D': 2,  'D#': 3,  'Eb': 3,
  'E': 4,
  'F': 5,  'F#': 6,  'Gb': 6,
  'G': 7,  'G#': 8,  'Ab': 8,
  'A': 9,  'A#': 10, 'Bb': 10,
  'B': 11,
};

/* Quality grammar: optional chord-type prefix, optional digit(s), zero-or-more
 * accidental-decorated digits (e.g. ♯5, ♭9), and zero-or-more parenthesised
 * modifiers — `(no3)`, `(no5)`, `(9)`, etc. The parens are kept inside the
 * quality string so they reach `findKnownChord` and `chordIntervalsFor` for
 * interval-level handling. */
const QUALITY_RE_SRC =
  '(?:maj|min|m|M|dim|aug|sus|add|°|ø|Δ)?' +
  '(?:[0-9]+)?' +
  '(?:[#b♯♭][0-9]+)*' +
  '(?:sus[0-9]+)?' +
  '(?:add[0-9]+)?' +
  '(?:\\((?:no)?[0-9]+\\))*';

const STRICT_CHORD_RE = new RegExp(
  `^([A-G])([#b♯♭]?)(${QUALITY_RE_SRC})(?:\\/([A-G])([#b♯♭]?))?$`,
);

export type ParsedChord = { rootPc: number; quality: string; bassPc?: number };

export function parseChordSymbol(sym: string): ParsedChord | null {
  if (!sym) return null;
  const cleaned = sym.replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = cleaned.match(STRICT_CHORD_RE);
  if (!m) return null;
  const rootPc = NOTE_PC[m[1] + (m[2] || '')];
  if (rootPc === undefined) return null;
  const quality = m[3] || '';
  let bassPc: number | undefined;
  if (m[4]) {
    bassPc = NOTE_PC[m[4] + (m[5] || '')];
    if (bassPc === undefined) return null;
  }
  return { rootPc, quality, bassPc };
}

export const isLikelyChord = (token: string): boolean => parseChordSymbol(token) !== null;

export function transposeChord(sym: string, semis: number, useFlats = false): string {
  const p = parseChordSymbol(sym);
  if (!p) return sym;
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  const newRoot = ((p.rootPc + semis) % 12 + 12) % 12;
  let result = names[newRoot] + p.quality;
  if (p.bassPc !== undefined) {
    const newBass = ((p.bassPc + semis) % 12 + 12) % 12;
    result += '/' + names[newBass];
  }
  return result;
}

/* Resolve a parsed chord quality to one of our known shapes from lib/music.
 * Strips parenthesised modifiers like `(no3)` first so the base quality can
 * match a known suffix; the modifiers are reapplied at the interval level by
 * `chordIntervalsFor`. */
export function findKnownChord(quality: string): Chord | null {
  const stripped = quality.replace(/\((?:no)?[0-9]+\)/g, '');
  const q = stripped.replace(/maj/i, 'maj').replace(/M(?![a-z])/, 'maj');
  const exact = CHORDS.find(c => c.suffix === q);
  if (exact) return exact;
  const ci = CHORDS.find(c => c.suffix.toLowerCase() === q.toLowerCase());
  if (ci) return ci;
  return CHORDS.find(c => c.suffix === '') ?? null;
}

/* Map a scale degree (1, 3, 5, 7, 9, 11, 13) to every interval that voices it.
 * Used to strip notes for `(noN)` modifiers. */
function intervalsForDegree(degree: number): number[] {
  switch (degree) {
    case 1:  return [0];
    case 2:  return [1, 2];
    case 3:  return [3, 4];
    case 4:  return [5, 6];
    case 5:  return [6, 7, 8];
    case 6:  return [8, 9];
    case 7:  return [10, 11];
    case 9:  return [13, 14, 15];
    case 11: return [16, 17, 18];
    case 13: return [20, 21, 22];
    default: return [];
  }
}

export function chordIntervalsFor(quality: string): number[] | null {
  const noDegrees = [...quality.matchAll(/\(no([0-9]+)\)/g)].map(m => parseInt(m[1], 10));
  const baseQuality = quality.replace(/\(no[0-9]+\)/g, '');
  const known = findKnownChord(baseQuality);
  if (!known) return null;
  if (noDegrees.length === 0) return known.intervals;
  const remove = new Set<number>();
  for (const d of noDegrees) for (const iv of intervalsForDegree(d)) remove.add(iv);
  return known.intervals.filter(iv => !remove.has(iv));
}

export function resolveChord(sym: string): { rootPc: number; intervals: number[] } | null {
  const p = parseChordSymbol(sym);
  if (!p) return null;
  const intervals = chordIntervalsFor(p.quality);
  if (!intervals || intervals.length === 0) return null;
  return { rootPc: p.rootPc, intervals };
}

export function chordSymbolToTitle(sym: string): string {
  const p = parseChordSymbol(sym);
  if (!p) return sym;
  return NOTE_NAMES_SHARP[p.rootPc] + p.quality;
}

export function uniqueChordsInSong(song: Song): { sym: string; rootPc: number; intervals: number[] }[] {
  const seen = new Map<string, { sym: string; rootPc: number; intervals: number[] }>();
  const sections = parseChordPro(song.body).sections;
  for (const sec of sections) {
    for (const line of sec.lines) {
      for (const tok of line.tokens) {
        if (tok.kind !== 'chord') continue;
        const transposed = transposeChord(tok.text, song.transpose);
        if (seen.has(transposed)) continue;
        const r = resolveChord(transposed);
        if (!r) continue;
        seen.set(transposed, { sym: transposed, rootPc: r.rootPc, intervals: r.intervals });
      }
    }
  }
  return [...seen.values()];
}

/* Convert "chord line above lyric line" style to inline ChordPro brackets,
 * preserving whitespace alignment between chord positions and lyric chars. */
function preprocessChordLines(src: string): string {
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';
    if (
      isPureChordLine(line) &&
      next.trim() !== '' &&
      !isPureChordLine(next) &&
      !isDirective(next)
    ) {
      out.push(mergeChordLineWithLyric(line, next));
      i++;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function isPureChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[a-z]{4,}/.test(trimmed)) return false;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return false;
  let chordCount = 0;
  for (const t of tokens) {
    if (isLikelyChord(t)) chordCount++;
  }
  return chordCount === tokens.length;
}

const isDirective = (line: string) => /^\s*\{/.test(line);

function mergeChordLineWithLyric(chordLine: string, lyricLine: string): string {
  const re = /\S+/g;
  const positions: { pos: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(chordLine)) !== null) {
    positions.push({ pos: m.index, text: m[0] });
  }
  if (positions.length === 0) return lyricLine;
  let line = lyricLine;
  const maxPos = positions[positions.length - 1].pos;
  if (line.length < maxPos) line = line.padEnd(maxPos, ' ');
  for (let i = positions.length - 1; i >= 0; i--) {
    const { pos, text } = positions[i];
    line = line.slice(0, pos) + `[${text}]` + line.slice(pos);
  }
  return line;
}

const SECTION_DIRECTIVES: Record<string, string> = {
  soc: 'chorus',          start_of_chorus: 'chorus',
  sov: 'verse',           start_of_verse: 'verse',
  sob: 'bridge',          start_of_bridge: 'bridge',
};
const SECTION_END = new Set(['eoc', 'end_of_chorus', 'eov', 'end_of_verse', 'eob', 'end_of_bridge']);

export function parseChordPro(src: string): {
  meta: { title?: string; artist?: string; key?: string; tempo?: string; capo?: string };
  sections: Section[];
} {
  const meta: { title?: string; artist?: string; key?: string; tempo?: string; capo?: string } = {};
  const sections: Section[] = [];
  let sIdx = 0;
  let lIdx = 0;
  const newSection = (name: string): Section => {
    const sec: Section = { id: `s${sIdx++}`, name, lines: [] };
    sections.push(sec);
    lIdx = 0;
    return sec;
  };
  let current = newSection('verse');

  const processed = preprocessChordLines(src);

  for (const raw of processed.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');

    const dirMatch = line.match(/^\s*\{([^:}]+)(?::\s*(.*?))?\}\s*$/);
    if (dirMatch) {
      const key = dirMatch[1].trim().toLowerCase();
      const value = (dirMatch[2] ?? '').trim();
      if (key === 'title' || key === 't') meta.title = value;
      else if (key === 'subtitle' || key === 'st' || key === 'artist') meta.artist = value;
      else if (key === 'key') meta.key = value;
      else if (key === 'tempo') meta.tempo = value;
      else if (key === 'capo') meta.capo = value;
      else if (key === 'comment' || key === 'c') {
        current.lines.push({ id: `${current.id}:l${lIdx++}`, kind: 'comment', tokens: [], text: value });
      } else if (SECTION_DIRECTIVES[key]) {
        current = newSection(SECTION_DIRECTIVES[key]);
      } else if (SECTION_END.has(key)) {
        current = newSection('verse');
      }
      continue;
    }

    if (line.trim() === '') {
      current.lines.push({ id: `${current.id}:l${lIdx++}`, kind: 'blank', tokens: [] });
      continue;
    }

    current.lines.push({
      id: `${current.id}:l${lIdx++}`,
      kind: 'lyric',
      tokens: parseInlineLine(line),
    });
  }

  return { meta, sections: sections.filter(s => s.lines.length > 0) };
}

function parseInlineLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let buf = '';
  while (i < line.length) {
    if (line[i] === '[') {
      const close = line.indexOf(']', i + 1);
      if (close === -1) {
        buf += line[i++];
        continue;
      }
      if (buf) { tokens.push({ kind: 'lyric', text: buf }); buf = ''; }
      tokens.push({ kind: 'chord', text: line.slice(i + 1, close) });
      i = close + 1;
    } else {
      buf += line[i++];
    }
  }
  if (buf) tokens.push({ kind: 'lyric', text: buf });
  return tokens;
}

export function newSong(input: { title?: string; body: string }): Song {
  const now = Date.now();
  const parsed = parseChordPro(input.body);
  const id = `song_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    title: input.title || parsed.meta.title || 'Untitled',
    artist: parsed.meta.artist,
    key: parsed.meta.key,
    tempo: parsed.meta.tempo,
    capo: parsed.meta.capo,
    body: input.body,
    transpose: 0,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
}
