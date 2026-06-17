'use client';

import { useEffect, useState } from 'react';
import { Piano } from '../Piano';
import { Fretboard } from './Fretboard';
import { useAppStore } from '@/lib/store';
import {
  CHORDS, SCALES, NOTE_NAMES_DISPLAY, NOTE_NAMES_SHARP, ROOTS,
  pitchClassesFor,
} from '@/lib/music';
import { playNote, playChord, playGuitarChord } from '@/lib/audio';

type Mode = 'free' | 'chord' | 'scale';

export default function PlaygroundApp() {
  const chordView = useAppStore(s => s.chordView);
  const setChordView = useAppStore(s => s.setChordView);
  const showLabels = useAppStore(s => s.playgroundShowLabels);
  const toggleLabels = useAppStore(s => s.togglePlaygroundLabels);
  const guitarTone = useAppStore(s => s.guitarTone);
  const flipped = useAppStore(s => s.fretboardFlipped);

  const [mode, setMode] = useState<Mode>('free');
  const [chordRoot, setChordRoot] = useState(0);   // C
  const [chordIdx, setChordIdx] = useState(1);     // major
  const [scaleRoot, setScaleRoot] = useState(0);
  const [scaleIdx, setScaleIdx] = useState(0);    // major
  const [capoFret, setCapoFret] = useState(0);

  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  /* Derive overlay highlights from current mode. */
  const overlayPcs: number[] =
    mode === 'chord' ? pitchClassesFor(chordRoot, CHORDS[chordIdx]?.intervals ?? [])
    : mode === 'scale' ? pitchClassesFor(scaleRoot, SCALES[scaleIdx]?.intervals ?? [])
    : [];
  const overlayRoot =
    mode === 'chord' ? chordRoot
    : mode === 'scale' ? scaleRoot
    : -1;

  /* Improv helper: scales rooted at the chord's root that contain every chord
   * tone — i.e. safe scales to solo over the selected chord. */
  const chordPcs = mode === 'chord' ? pitchClassesFor(chordRoot, CHORDS[chordIdx]?.intervals ?? []) : [];
  const fittingScales = mode === 'chord'
    ? SCALES.map((s, i) => ({ s, i, pcs: pitchClassesFor(chordRoot, s.intervals) }))
        .filter(({ pcs }) => chordPcs.every((pc) => pcs.includes(pc)))
    : [];

  /* Capo shifts the *sounding* pitch up — the visual chord shape stays the
   * same on the fretboard but plays N semitones higher. */
  const playChordOverlay = () => {
    const chord = CHORDS[chordIdx];
    if (!chord) return;
    const midis = midisInChord(chordRoot, chord.intervals, capoFret);
    if (chordView === 'guitar') playGuitarChord(midis, { tone: guitarTone });
    else playChord(midis);
  };

  return (
    <main className="playground-page">
      <header className="playground-head">
        <div className="playground-titles">
          <h1>Playground</h1>
          <p>Free-play, audition chords, or explore scales across the whole instrument.</p>
        </div>
        <div className="playground-controls">
          <Segment
            value={chordView}
            options={[
              { value: 'piano', label: 'Piano' },
              { value: 'guitar', label: 'Guitar' },
            ]}
            onChange={(v) => setChordView(v)}
          />
          <Segment
            value={mode}
            options={[
              { value: 'free' as Mode, label: 'Free play' },
              { value: 'chord' as Mode, label: 'Chord' },
              { value: 'scale' as Mode, label: 'Scale' },
            ]}
            onChange={(v) => setMode(v)}
          />
          <label className="labels-toggle">
            <input type="checkbox" checked={showLabels} onChange={toggleLabels} />
            <span>Note labels</span>
          </label>
        </div>
      </header>

      {mode === 'chord' && (
        <div className="playground-pickers">
          <RootPicker label="Root" value={chordRoot} onChange={setChordRoot} />
          <ChordPicker idx={chordIdx} onChange={setChordIdx} />
          <button type="button" className="play-overlay-btn" onClick={playChordOverlay}>
            ▶ Play {NOTE_NAMES_SHARP[chordRoot]}{CHORDS[chordIdx]?.suffix}
          </button>
        </div>
      )}

      {mode === 'chord' && fittingScales.length > 0 && (
        <div className="playground-suggest">
          <span className="playground-suggest-label">Solo with</span>
          <div className="playground-suggest-chips">
            {fittingScales.map(({ s, i }) => (
              <button
                key={i}
                type="button"
                className="suggest-chip"
                title={`Show ${NOTE_NAMES_SHARP[chordRoot]} ${s.label} on the board`}
                onClick={() => { setScaleRoot(chordRoot); setScaleIdx(i); setMode('scale'); }}
              >
                {NOTE_NAMES_SHARP[chordRoot]} {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'scale' && (
        <div className="playground-pickers">
          <RootPicker label="Root" value={scaleRoot} onChange={setScaleRoot} />
          <ScalePicker idx={scaleIdx} onChange={setScaleIdx} />
        </div>
      )}

      <section className="playground-board">
        {chordView === 'guitar' ? (
          <>
            <Fretboard
              fretCount={12}
              highlightPcs={overlayPcs}
              rootPc={overlayRoot}
              showLabels={showLabels}
              capoFret={capoFret}
              flipped={flipped}
              onCapoChange={setCapoFret}
              onPress={(midi) => playNote(midi)}
            />
            <div className="capo-controls">
              <span className="capo-label">Capo:</span>
              <button type="button" onClick={() => setCapoFret(0)} disabled={capoFret === 0}>Off</button>
              {[1, 2, 3, 4, 5, 7].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={capoFret === f ? 'active' : ''}
                  onClick={() => setCapoFret(f)}
                >
                  {f}fr
                </button>
              ))}
              <span className="capo-hint">Or drag the capo bar on the fretboard.</span>
            </div>
          </>
        ) : (
          <Piano
            pitchClasses={overlayPcs}
            rootPc={overlayRoot}
            octaves={3}
            startOctave={3}
            startPc={0}
            padKeys={0}
            hideRoot={false}
            onPress={(midi) => playNote(midi)}
            showAllLabels={showLabels}
          />
        )}
      </section>
    </main>
  );
}

function midisInChord(rootPc: number, intervals: number[], capoFret: number): number[] {
  const base = 60 + rootPc + capoFret;
  return intervals.map((i) => base + i);
}

function Segment<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="playground-segment" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RootPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="playground-picker">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
        {ROOTS.map((r) => (
          <option key={r.pc} value={r.pc}>{NOTE_NAMES_DISPLAY[r.pc]}</option>
        ))}
      </select>
    </label>
  );
}

function ChordPicker({ idx, onChange }: { idx: number; onChange: (i: number) => void }) {
  return (
    <label className="playground-picker">
      <span>Chord</span>
      <select value={idx} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
        {CHORDS.map((c, i) => (
          <option key={i} value={i}>{c.label} ({c.suffix || 'maj'})</option>
        ))}
      </select>
    </label>
  );
}

function ScalePicker({ idx, onChange }: { idx: number; onChange: (i: number) => void }) {
  return (
    <label className="playground-picker">
      <span>Scale</span>
      <select value={idx} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
        {SCALES.map((s, i) => (
          <option key={i} value={i}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}

