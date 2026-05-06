'use client';

import {
  parseChordPro,
  resolveChord,
  transposeChord,
  type Section,
  type Line,
  type Token,
} from '@/lib/songs';
import { midisFor, playChord } from '@/lib/audio';

type Props = {
  body: string;
  transpose: number;
  /* Children rendered absolutely-positioned inside each line — used for sticky notes. */
  renderLineOverlay?: (lineId: string) => React.ReactNode;
};

export function SongRenderer({ body, transpose, renderLineOverlay }: Props) {
  const { sections } = parseChordPro(body);
  return (
    <div className="song-body">
      {sections.map((section) => (
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

function SectionView({
  section,
  transpose,
  renderLineOverlay,
}: {
  section: Section;
  transpose: number;
  renderLineOverlay?: (lineId: string) => React.ReactNode;
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
    <section className={`song-section section-${section.name}`}>
      {headerName && <h3 className="song-section-name">{headerName}</h3>}
      {linesToRender.map((line) => (
        <LineView
          key={line.id}
          line={line}
          transpose={transpose}
          overlay={renderLineOverlay?.(line.id)}
        />
      ))}
    </section>
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
        chunks.push({ chord: pending, lyric: ' ' });
      }
      pending = tok.text;
    } else {
      chunks.push({ chord: pending, lyric: tok.text || ' ' });
      pending = undefined;
    }
  }
  if (pending !== undefined) chunks.push({ chord: pending, lyric: ' ' });
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
  const onPlay = () => {
    const r = resolveChord(sym);
    if (!r) return;
    playChord(midisFor(r.rootPc, r.intervals));
  };
  return (
    <button type="button" className="chunk-chord" onClick={onPlay} title={`Play ${sym}`}>
      {sym}
    </button>
  );
}
