'use client';

import { useEffect } from 'react';
import { useAppStore, AUDIO_DEFAULTS, THEME_PRESETS, ACCENT_SWATCHES, type ChordView, type GuitarTone, type FretboardOrientation, type NavPlacement, type ThemeMode } from '@/lib/store';
import { midisFor, playChord, playGuitarChord, playNote } from '@/lib/audio';
import { generateVoicings, voicingMidis } from '@/lib/fretboard';
import { ChordDiagram } from '@/components/song/ChordDiagram';

export default function SettingsPage() {
  const audioVolume = useAppStore(s => s.audioVolume);
  const audioSustain = useAppStore(s => s.audioSustain);
  const audioBrightness = useAppStore(s => s.audioBrightness);
  const audioReverb = useAppStore(s => s.audioReverb);
  const audioReverbSize = useAppStore(s => s.audioReverbSize);
  const setAudio = useAppStore(s => s.setAudio);
  const resetAudio = useAppStore(s => s.resetAudio);
  const showChordPalette = useAppStore(s => s.showChordPalette);
  const toggleChordPalette = useAppStore(s => s.toggleChordPalette);
  const chordView = useAppStore(s => s.chordView);
  const setChordView = useAppStore(s => s.setChordView);
  const guitarTone = useAppStore(s => s.guitarTone);
  const setGuitarTone = useAppStore(s => s.setGuitarTone);
  const fretboardOrientation = useAppStore(s => s.fretboardOrientation);
  const setFretboardOrientation = useAppStore(s => s.setFretboardOrientation);
  const fretboardFlipped = useAppStore(s => s.fretboardFlipped);
  const toggleFretboardFlipped = useAppStore(s => s.toggleFretboardFlipped);
  const navPlacement = useAppStore(s => s.navPlacement);
  const setNavPlacement = useAppStore(s => s.setNavPlacement);
  const themeMode = useAppStore(s => s.themeMode);
  const setThemeMode = useAppStore(s => s.setThemeMode);
  const themePreset = useAppStore(s => s.themePreset);
  const setThemePreset = useAppStore(s => s.setThemePreset);
  const accent = useAppStore(s => s.accent);
  const setAccent = useAppStore(s => s.setAccent);
  const reduceGlass = useAppStore(s => s.reduceGlass);
  const toggleReduceGlass = useAppStore(s => s.toggleReduceGlass);

  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);

  return (
    <main className="settings-page">
      <header className="settings-hero">
        <div className="settings-hero-text">
          <h1>Settings</h1>
          <p>Sculpt the playback voice. Changes save instantly.</p>
        </div>
        <div className="settings-preview">
          <button
            type="button"
            className="preview-btn"
            onClick={() => playNote(60)}
            aria-label="Preview a single note"
          >
            <PlayIcon /> Note
          </button>
          <button
            type="button"
            className="preview-btn primary"
            onClick={() => playChord(midisFor(0, [0, 4, 7]))}
            aria-label="Preview a C major chord"
          >
            <PlayIcon /> C major
          </button>
        </div>
      </header>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><PaletteIcon /></span>
          <div>
            <h2>Appearance</h2>
            <p>Make it yours — mode, colour theme, accent. Everything updates live.</p>
          </div>
        </header>

        <div className="setting">
          <div className="setting-row">
            <span className="setting-label">Mode</span>
            <SegmentedPicker<ThemeMode>
              value={themeMode}
              options={[
                { value: 'dark',  label: 'Dark'  },
                { value: 'light', label: 'Light' },
                { value: 'oled',  label: 'OLED'  },
              ]}
              onChange={setThemeMode}
            />
          </div>
          <p className="setting-hint">OLED is a true-black variant for AMOLED screens and dark stages.</p>
        </div>

        <div className="setting">
          <span className="setting-label">Theme</span>
          <div className="theme-swatches" role="radiogroup" aria-label="Colour theme">
            {THEME_PRESETS.map((p) => {
              const active = themePreset === p.id && !accent;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`theme-swatch ${active ? 'active' : ''}`}
                  style={{ '--sw': p.accent } as React.CSSProperties}
                  onClick={() => { setThemePreset(p.id); setAccent(null); }}
                  title={p.label}
                >
                  <span className="theme-swatch-dot" />
                  <span className="theme-swatch-label">{p.label}</span>
                </button>
              );
            })}
          </div>
          <p className="setting-hint">Presets set the accent and the ambient background glow together.</p>
        </div>

        <div className="setting">
          <span className="setting-label">Accent override</span>
          <div className="accent-swatches" role="radiogroup" aria-label="Accent colour">
            <button
              type="button"
              role="radio"
              aria-checked={!accent}
              className={`accent-swatch match ${!accent ? 'active' : ''}`}
              onClick={() => setAccent(null)}
              title="Match the theme's accent"
            >
              Auto
            </button>
            {ACCENT_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={accent === hex}
                className={`accent-swatch ${accent === hex ? 'active' : ''}`}
                style={{ '--sw': hex } as React.CSSProperties}
                onClick={() => setAccent(hex)}
                title={hex}
              />
            ))}
            <label className="accent-swatch custom" title="Pick any colour">
              <input
                type="color"
                value={accent ?? '#ffd43b'}
                onChange={(e) => setAccent(e.target.value)}
                aria-label="Custom accent colour"
              />
              <PlusIcon />
            </label>
          </div>
          <p className="setting-hint">Override just the accent while keeping the theme&rsquo;s background. &ldquo;Auto&rdquo; follows the theme.</p>
        </div>

        <div className="setting">
          <div className="setting-row">
            <span className="setting-label">Reduce glass</span>
            <button
              type="button"
              className={`toggle ${reduceGlass ? 'on' : ''}`}
              role="switch"
              aria-checked={reduceGlass}
              onClick={toggleReduceGlass}
            />
          </div>
          <p className="setting-hint">Replace the translucent chrome with solid surfaces — calmer, and lighter on older devices.</p>
        </div>
      </section>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><OutputIcon /></span>
          <div>
            <h2>Output</h2>
            <p>Master loudness applied to everything you play.</p>
          </div>
        </header>
        <Slider
          label="Volume"
          value={audioVolume} min={0} max={1} step={0.01}
          format={v => `${Math.round(v * 100)}%`}
          onChange={v => setAudio({ audioVolume: v })}
        />
      </section>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><PianoIcon /></span>
          <div>
            <h2>Instrument</h2>
            <p>Shape of the note itself — how long it rings, how bright it sits.</p>
          </div>
        </header>
        <Slider
          label="Sustain"
          hint="Note length multiplier. Higher = longer ring-out."
          value={audioSustain} min={0.3} max={3} step={0.05}
          format={v => `${v.toFixed(2)}×`}
          onChange={v => setAudio({ audioSustain: v })}
        />
        <Slider
          label="Brightness"
          hint="Warm and mellow → bright and bell-like."
          value={audioBrightness} min={0} max={1} step={0.01}
          format={v => `${Math.round(v * 100)}%`}
          onChange={v => setAudio({ audioBrightness: v })}
        />
      </section>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><GuitarIcon /></span>
          <div>
            <h2>Chord visualisation</h2>
            <p>How chord cards look and sound — piano keys or guitar fretboard.</p>
          </div>
        </header>
        <div className="setting">
          <div className="setting-row">
            <span className="setting-label">Instrument</span>
            <SegmentedPicker<ChordView>
              value={chordView}
              options={[
                { value: 'piano', label: 'Piano' },
                { value: 'guitar', label: 'Guitar' },
              ]}
              onChange={setChordView}
            />
          </div>
          <p className="setting-hint">Sound follows the visual — piano view plays the piano synth, guitar plays a plucked-string synth.</p>
        </div>
        {chordView === 'guitar' && (
          <>
            <div className="setting">
              <div className="setting-row">
                <span className="setting-label">Timbre</span>
                <SegmentedPicker<GuitarTone>
                  value={guitarTone}
                  options={[
                    { value: 'acoustic', label: 'Acoustic' },
                    { value: 'electric', label: 'Electric' },
                  ]}
                  onChange={setGuitarTone}
                />
              </div>
              <p className="setting-hint">Acoustic is warm and drier; electric has more sustain and a touch of bite.</p>
            </div>
            <div className="setting">
              <div className="setting-row">
                <span className="setting-label">Fretboard orientation</span>
                <SegmentedPicker<FretboardOrientation>
                  value={fretboardOrientation}
                  options={[
                    { value: 'vertical', label: 'Vertical' },
                    { value: 'horizontal', label: 'Horizontal' },
                  ]}
                  onChange={setFretboardOrientation}
                />
              </div>
              <p className="setting-hint">Vertical mirrors the standard chord-chart convention; horizontal reads like a guitar laid flat with the nut on the left.</p>
            </div>
            <div className="setting">
              <div className="setting-row">
                <span className="setting-label">Flip string order</span>
                <button
                  type="button"
                  className={`toggle ${fretboardFlipped ? 'on' : ''}`}
                  role="switch"
                  aria-checked={fretboardFlipped}
                  onClick={toggleFretboardFlipped}
                />
              </div>
              <p className="setting-hint">Default places high e on top (standard tab convention). Flip to put low E on top — useful for left-handed players.</p>
            </div>
          </>
        )}
        <ChordPreview chordView={chordView} guitarTone={guitarTone} orientation={fretboardOrientation} flipped={fretboardFlipped} />
      </section>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><NavIcon /></span>
          <div>
            <h2>Navigation</h2>
            <p>Where the floating glass nav sits on screen.</p>
          </div>
        </header>
        <div className="setting">
          <div className="setting-row">
            <span className="setting-label">Placement</span>
            <SegmentedPicker<NavPlacement>
              value={navPlacement}
              options={[
                { value: 'bottom', label: 'Bottom' },
                { value: 'top',    label: 'Top'    },
                { value: 'right',  label: 'Right'  },
              ]}
              onChange={setNavPlacement}
            />
          </div>
          <p className="setting-hint">Bottom mirrors iOS&rsquo;s tab bar; top is a floating header; right is a side rail. Bottom auto-hides on scroll-down.</p>
          <NavPreview placement={navPlacement} />
        </div>
      </section>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><SongIcon /></span>
          <div>
            <h2>Songs</h2>
            <p>How the Songs view behaves while you&rsquo;re reading lyrics.</p>
          </div>
        </header>
        <div className="setting">
          <div className="setting-row">
            <span className="setting-label">Chord palette</span>
            <button
              type="button"
              className={`toggle ${showChordPalette ? 'on' : ''}`}
              role="switch"
              aria-checked={showChordPalette}
              onClick={toggleChordPalette}
            />
          </div>
          <p className="setting-hint">
            Show a side rail with piano tiles for every unique chord in the song. Click any tile to play.
          </p>
        </div>
      </section>

      <section className="settings-group">
        <header className="group-head">
          <span className="group-icon"><SpaceIcon /></span>
          <div>
            <h2>Space</h2>
            <p>Convolution reverb — sit the piano in a room or a cathedral.</p>
          </div>
        </header>
        <Slider
          label="Mix"
          hint="Dry studio → washed in space."
          value={audioReverb} min={0} max={1} step={0.01}
          format={v => `${Math.round(v * 100)}%`}
          onChange={v => setAudio({ audioReverb: v })}
        />
        <Slider
          label="Decay"
          hint="Small room → cathedral tail."
          value={audioReverbSize} min={0.3} max={5} step={0.05}
          format={v => `${v.toFixed(2)}s`}
          onChange={v => setAudio({ audioReverbSize: v })}
        />
      </section>

      <footer className="settings-footer">
        <span className="settings-defaults-note">
          Defaults: vol {pct(AUDIO_DEFAULTS.audioVolume)} · sustain {AUDIO_DEFAULTS.audioSustain.toFixed(2)}× ·
          bright {pct(AUDIO_DEFAULTS.audioBrightness)} · reverb {pct(AUDIO_DEFAULTS.audioReverb)} ·
          decay {AUDIO_DEFAULTS.audioReverbSize.toFixed(2)}s
        </span>
        <button type="button" className="reset-btn" onClick={resetAudio}>
          Restore defaults
        </button>
      </footer>
    </main>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Slider({
  label, hint, value, min, max, step, onChange, format,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const pctFill = ((value - min) / (max - min)) * 100;
  return (
    <div className="setting">
      <div className="setting-row">
        <span className="setting-label">{label}</span>
        <span className="setting-value">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ '--pct': `${pctFill}%` } as React.CSSProperties}
      />
      {hint && <p className="setting-hint">{hint}</p>}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function OutputIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SegmentedPicker<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="settings-segmented" role="radiogroup">
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

function ChordPreview({
  chordView, guitarTone, orientation, flipped,
}: {
  chordView: ChordView;
  guitarTone: GuitarTone;
  orientation: FretboardOrientation;
  flipped: boolean;
}) {
  /* C major preview — same chord across modes so users can audibly compare. */
  const cMajor = { rootPc: 0, intervals: [0, 4, 7] };
  const voicings = chordView === 'guitar' ? generateVoicings(0, '') : [];
  const voicing = voicings[0];

  const play = () => {
    if (chordView === 'guitar' && voicing) {
      playGuitarChord(voicingMidis(voicing), { tone: guitarTone });
    } else {
      playChord(midisFor(cMajor.rootPc, cMajor.intervals));
    }
  };

  const isHorizontal = chordView === 'guitar' && orientation === 'horizontal';
  return (
    <div className="settings-chord-preview">
      <button type="button" onClick={play} className="settings-chord-preview-card" title="Preview C major">
        <span className="settings-chord-preview-title">C major</span>
        {chordView === 'guitar' && voicing ? (
          <div className={`settings-chord-preview-diagram ${isHorizontal ? 'horizontal' : ''}`}>
            <ChordDiagram voicing={voicing} orientation={orientation} flipped={flipped} />
          </div>
        ) : (
          <span className="settings-chord-preview-hint">Click to hear how it sounds</span>
        )}
      </button>
    </div>
  );
}

function NavPreview({ placement }: { placement: NavPlacement }) {
  return (
    <div className={`nav-preview placement-${placement}`}>
      <div className="nav-preview-page">
        <div className="nav-preview-content">
          <span className="nav-preview-line wide" />
          <span className="nav-preview-line" />
          <span className="nav-preview-line" />
          <span className="nav-preview-line wide" />
        </div>
        <div className="nav-preview-capsule">
          <span className="nav-preview-dot active" />
          <span className="nav-preview-dot" />
          <span className="nav-preview-dot" />
          <span className="nav-preview-dot" />
        </div>
      </div>
    </div>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a6 6 0 0 0 6-6c0-4.4-4.5-8-10-8z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function NavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="14" width="18" height="6" rx="3" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="13" cy="17" r="1" fill="currentColor" />
      <circle cx="18" cy="17" r="1" fill="currentColor" />
      <path d="M5 9h14M5 5h14" />
    </svg>
  );
}

function GuitarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 6l5-3 1 1-3 5" />
      <circle cx="10" cy="14" r="5" />
      <circle cx="10" cy="14" r="1.5" fill="currentColor" />
      <path d="M13.5 10.5l4.5-4.5" />
    </svg>
  );
}

function PianoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M9 6v8M15 6v8M9 14h6" />
      <rect x="7.2" y="6" width="2" height="5" fill="currentColor" />
      <rect x="13.2" y="6" width="2" height="5" fill="currentColor" />
    </svg>
  );
}

function SpaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M5 12a7 7 0 0 1 14 0" />
      <path d="M2 12a10 10 0 0 1 20 0" />
    </svg>
  );
}

function SongIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
