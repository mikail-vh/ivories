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

type State = {
  pages: FavPage[];
  activePageId: string;
  activeTab: string;
  hideRoot: boolean;
  compact: boolean;
  theme: 'dark' | 'light';
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
} & AudioSettings;

type Actions = {
  setActiveTab: (tab: string) => void;
  toggleHideRoot: () => void;
  toggleCompact: () => void;
  toggleTheme: () => void;
  toggleChordPalette: () => void;
  setSongLayout: (layout: 'flow' | 'grid') => void;
  setGridPreset: (preset: GridPreset) => void;
  setLayoutExpanded: (expanded: boolean) => void;
  setChordPaletteSide: (side: 'left' | 'right') => void;
  setLyricSize: (size: LyricSize) => void;

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
      theme: 'dark',
      showChordPalette: true,
      layoutExpanded: false,
      chordPaletteSide: 'right',
      songLayout: 'flow',
      songGridPreset: 'auto',
      lyricSize: 'md',
      ...AUDIO_DEFAULTS,

      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleHideRoot: () => set({ hideRoot: !get().hideRoot }),
      toggleCompact: () => set({ compact: !get().compact }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      toggleChordPalette: () => set({ showChordPalette: !get().showChordPalette }),
      setSongLayout: (layout) => set({ songLayout: layout }),
      setGridPreset: (preset) => set({ songGridPreset: preset }),
      setLayoutExpanded: (expanded) => set({ layoutExpanded: expanded }),
      setChordPaletteSide: (side) => set({ chordPaletteSide: side }),
      setLyricSize: (size) => set({ lyricSize: size }),

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
    }
  )
);
