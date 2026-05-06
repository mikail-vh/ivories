'use client';

import { useEffect } from 'react';
import { useAppStore, AUDIO_DEFAULTS } from '@/lib/store';
import { midisFor, playChord, playNote } from '@/lib/audio';

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
