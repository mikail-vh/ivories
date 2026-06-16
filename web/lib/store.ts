import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FavoriteItem = {
  kind: 'chord' | 'scale';
  idx: number;
  rootPc: number;
};

export type FavPage = {
  id: string;
  name: string;
  items: FavoriteItem[];
};

export type AudioSettings = {
  audioVolume: number;
  audioSustain: number;
  audioBrightness: number;
  audioReverb: number;
  audioReverbSize: number;
};

export const AUDIO_DEFAULTS: AudioSettings = {
  audioVolume: 0.7,
  audioSustain: 1.0,
  audioBrightness: 0.5,
  audioReverb: 0.4,
  audioReverbSize: 2.0,
};

export type GridPreset = 'auto' | '2col' | '3col';
export type LyricSize = 'sm' | 'md' | 'lg';
export type ChordView = 'piano' | 'guitar';
export type GuitarTone = 'acoustic' | 'electric';
export type FretboardOrientation = 'vertical' | 'horizontal';
export type NavPlacement = 'bottom' | 'top' | 'right';
export type ThemeMode = 'dark' | 'light' | 'oled';

/* Theme presets set the accent + ambient blob hues (the CSS lives in
 * globals.css under body[data-theme="…"]). `accent` here is the swatch shown
 * in the settings picker. A custom accent in the store overrides the preset. */
export type ThemePreset = { id: string; label: string; accent: string };
export const THEME_PRESETS: ThemePreset[] = [
  { id: 'amber',   label: 'Amber',   accent: '#ffd43b' },
  { id: 'indigo',  label: 'Indigo',  accent: '#8c8cff' },
  { id: 'sunset',  label: 'Sunset',  accent: '#ff9a5a' },
  { id: 'emerald', label: 'Emerald', accent: '#34d6a0' },
  { id: 'rose',    label: 'Rose',    accent: '#ff7a9c' },
  { id: 'cyber',   label: 'Cyber',   accent: '#2ee6d6' },
  { id: 'mono',    label: 'Mono',    accent: '#cfd4e0' },
];

/* Accent swatches offered by the custom picker. */
export const ACCENT_SWATCHES = [
  '#ffd43b', '#ff9a5a', '#ff7a9c', '#ff6b6b',
  '#c084fc', '#8c8cff', '#4dabf7', '#2ee6d6',
  '#34d6a0', '#a3e635', '#f472b6', '#cfd4e0',
];

type State = {
  pages: FavPage[];
  activePageId: string;
  activeTab: string;
  hideRoot: boolean;
  compact: boolean;
  /* Theme system: base luminance mode + colour preset + optional custom accent
   * hex (null = use the preset's accent). reduceGlass forces opaque chrome. */
  themeMode: ThemeMode;
  themePreset: string;
  accent: string | null;
  reduceGlass: boolean;
  /* Tint the song page's accent from Spotify album art when available. */
  albumArtAccent: boolean;
  showChordPalette: boolean;
  /* "Compact" keeps the song-page centered at 1280/1800 max-width; "expanded"
   * lets it fill the full viewport. Used to be called `chordPaletteFloating`
   * since its visible effect was to give the palette more room — but it's
   * really a page-width toggle, applied independently of palette side. */
  layoutExpanded: boolean;
  chordPaletteSide: 'left' | 'right';
  songLayout: 'flow' | 'grid';
  songGridPreset: GridPreset;
  /* Lyric/chord font size for the song body. Smaller = more lines fit per
   * card and longer lines are less likely to wrap. Applied as a CSS variable
   * on the song-page so all chunk text scales together. */
  lyricSize: LyricSize;
  /* Hide chords in the song body for lyric-only rehearsal reading. */
  lyricsOnly: boolean;
  /* Auto-scroll speed multiplier for the song reader (0.25..4). Persisted so a
   * comfortable pace carries between songs. */
  autoscrollSpeed: number;
  /* Spotify embed volume (0..1). Persisted so users don't have to drop it
   * every time they open a song. Applied via the IFrame Embed API. */
  spotifyVolume: number;
  /* Whether the chord palette shows piano keyboards or guitar fretboards.
   * Sound follows visual: piano → piano synth, guitar → guitar synth. */
  chordView: ChordView;
  /* Which guitar timbre when chordView === 'guitar'. */
  guitarTone: GuitarTone;
  /* How guitar chord diagrams are oriented. */
  fretboardOrientation: FretboardOrientation;
  /* Show note names on every key / fret position in /playground. */
  playgroundShowLabels: boolean;
  /* Reverse string order on guitar diagrams — default has high e on top
   * (standard tab convention); flipped is low E on top (left-handed). */
  fretboardFlipped: boolean;
  /* Where the floating liquid-glass nav lives. */
  navPlacement: NavPlacement;
  /* Song library: starred song IDs, and most-recently-opened IDs (newest
   * first, capped) for the home dashboard's "jump back in" shelf. */
  favoriteSongs: string[];
  recentSongs: string[];
} & AudioSettings;

type Actions = {
  setActiveTab: (tab: string) => void;
  toggleHideRoot: () => void;
  toggleCompact: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  cycleTheme: () => void;
  setThemePreset: (preset: string) => void;
  setAccent: (hex: string | null) => void;
  toggleReduceGlass: () => void;
  setAlbumArtAccent: (on: boolean) => void;
  toggleChordPalette: () => void;
  setSongLayout: (layout: 'flow' | 'grid') => void;
  setGridPreset: (preset: GridPreset) => void;
  setLayoutExpanded: (expanded: boolean) => void;
  setChordPaletteSide: (side: 'left' | 'right') => void;
  setLyricSize: (size: LyricSize) => void;
  toggleLyricsOnly: () => void;
  setAutoscrollSpeed: (speed: number) => void;
  setSpotifyVolume: (volume: number) => void;
  setChordView: (view: ChordView) => void;
  setGuitarTone: (tone: GuitarTone) => void;
  setFretboardOrientation: (orientation: FretboardOrientation) => void;
  togglePlaygroundLabels: () => void;
  toggleFretboardFlipped: () => void;
  setNavPlacement: (placement: NavPlacement) => void;
  toggleFavoriteSong: (id: string) => void;
  markSongOpened: (id: string) => void;

  isFavorited: (item: FavoriteItem) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;

  addPage: (name: string) => void;
  renamePage: (id: string, name: string) => void;
  deletePage: (id: string) => void;
  setActivePage: (id: string) => void;
  reorderItem: (pos: number, dir: 'up' | 'down') => void;

  setAudio: (patch: Partial<AudioSettings>) => void;
  resetAudio: () => void;
};

const favKey = (it: FavoriteItem) => `${it.kind}:${it.idx}:${it.rootPc}`;

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      pages: [{ id: 'default', name: 'My chords', items: [] }],
      activePageId: 'default',
      activeTab: 'C',
      hideRoot: false,
      compact: false,
      themeMode: 'dark',
      themePreset: 'amber',
      accent: null,
      reduceGlass: false,
      albumArtAccent: true,
      showChordPalette: true,
      layoutExpanded: false,
      chordPaletteSide: 'right',
      songLayout: 'flow',
      songGridPreset: 'auto',
      lyricSize: 'md',
      lyricsOnly: false,
      autoscrollSpeed: 1,
      spotifyVolume: 0.7,
      chordView: 'piano',
      guitarTone: 'acoustic',
      fretboardOrientation: 'vertical',
      playgroundShowLabels: false,
      fretboardFlipped: false,
      navPlacement: 'bottom',
      favoriteSongs: [],
      recentSongs: [],
      ...AUDIO_DEFAULTS,

      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleHideRoot: () => set({ hideRoot: !get().hideRoot }),
      toggleCompact: () => set({ compact: !get().compact }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      cycleTheme: () => {
        const order: ThemeMode[] = ['dark', 'light', 'oled'];
        const i = order.indexOf(get().themeMode);
        set({ themeMode: order[(i + 1) % order.length] });
      },
      setThemePreset: (preset) => set({ themePreset: preset }),
      setAccent: (hex) => set({ accent: hex }),
      toggleReduceGlass: () => set({ reduceGlass: !get().reduceGlass }),
      setAlbumArtAccent: (on) => set({ albumArtAccent: on }),
      toggleChordPalette: () => set({ showChordPalette: !get().showChordPalette }),
      setSongLayout: (layout) => set({ songLayout: layout }),
      setGridPreset: (preset) => set({ songGridPreset: preset }),
      setLayoutExpanded: (expanded) => set({ layoutExpanded: expanded }),
      setChordPaletteSide: (side) => set({ chordPaletteSide: side }),
      setLyricSize: (size) => set({ lyricSize: size }),
      toggleLyricsOnly: () => set({ lyricsOnly: !get().lyricsOnly }),
      setAutoscrollSpeed: (speed) => set({ autoscrollSpeed: Math.max(0.25, Math.min(4, speed)) }),
      setSpotifyVolume: (volume) => set({ spotifyVolume: Math.max(0, Math.min(1, volume)) }),
      setChordView: (view) => set({ chordView: view }),
      setGuitarTone: (tone) => set({ guitarTone: tone }),
      setFretboardOrientation: (orientation) => set({ fretboardOrientation: orientation }),
      togglePlaygroundLabels: () => set({ playgroundShowLabels: !get().playgroundShowLabels }),
      toggleFretboardFlipped: () => set({ fretboardFlipped: !get().fretboardFlipped }),
      setNavPlacement: (placement) => set({ navPlacement: placement }),
      toggleFavoriteSong: (id) => {
        const cur = get().favoriteSongs;
        set({ favoriteSongs: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
      },
      markSongOpened: (id) => {
        const next = [id, ...get().recentSongs.filter((x) => x !== id)].slice(0, 12);
        set({ recentSongs: next });
      },

      isFavorited: (item) => {
        const page = get().pages.find(p => p.id === get().activePageId);
        if (!page) return false;
        const k = favKey(item);
        return page.items.some(it => favKey(it) === k);
      },

      toggleFavorite: (item) => {
        const { pages, activePageId } = get();
        const k = favKey(item);
        const next = pages.map(p => {
          if (p.id !== activePageId) return p;
          const i = p.items.findIndex(it => favKey(it) === k);
          if (i >= 0) {
            return { ...p, items: p.items.filter((_, j) => j !== i) };
          }
          return { ...p, items: [...p.items, item] };
        });
        set({ pages: next });
      },

      addPage: (name) => {
        const id = 'p_' + Date.now().toString(36);
        const next = [...get().pages, { id, name, items: [] }];
        set({ pages: next, activePageId: id });
      },

      renamePage: (id, name) => {
        const next = get().pages.map(p => p.id === id ? { ...p, name } : p);
        set({ pages: next });
      },

      deletePage: (id) => {
        const next = get().pages.filter(p => p.id !== id);
        if (next.length === 0) {
          set({ pages: [{ id: 'default', name: 'My chords', items: [] }], activePageId: 'default' });
          return;
        }
        const newActive = get().activePageId === id ? next[0].id : get().activePageId;
        set({ pages: next, activePageId: newActive });
      },

      setActivePage: (id) => set({ activePageId: id }),

      setAudio: (patch) => set(patch),
      resetAudio: () => set(AUDIO_DEFAULTS),

      reorderItem: (pos, dir) => {
        const { pages, activePageId } = get();
        const next = pages.map(p => {
          if (p.id !== activePageId) return p;
          const items = [...p.items];
          if (dir === 'up' && pos > 0) {
            [items[pos - 1], items[pos]] = [items[pos], items[pos - 1]];
          } else if (dir === 'down' && pos < items.length - 1) {
            [items[pos], items[pos + 1]] = [items[pos + 1], items[pos]];
          }
          return { ...p, items };
        });
        set({ pages: next });
      },
    }),
    {
      name: 'piano-app:v1',
      skipHydration: true,
      version: 2,
      /* v0/v1 stored a binary `theme: 'dark' | 'light'`. v2 splits theming into
       * mode + preset + custom accent + reduce-glass. Map the old flag forward
       * and seed the new fields so existing libraries upgrade cleanly. */
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          if (s.themeMode === undefined) {
            s.themeMode = s.theme === 'light' ? 'light' : 'dark';
          }
          if (s.themePreset === undefined) s.themePreset = 'amber';
          if (s.accent === undefined) s.accent = null;
          if (s.reduceGlass === undefined) s.reduceGlass = false;
          if (s.albumArtAccent === undefined) s.albumArtAccent = true;
          delete s.theme;
        }
        return s as unknown as State & Actions;
      },
    }
  )
);
