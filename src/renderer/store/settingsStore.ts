import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Accent color presets (hue, saturation, lightness)
// ---------------------------------------------------------------------------
export type AccentColorKey = 'sky' | 'teal' | 'violet' | 'rose' | 'amber' | 'emerald';

export const ACCENT_PRESETS: Record<AccentColorKey, { h: number; s: number; l: number; label: string; hex: string }> = {
  sky:     { h: 199, s: 89, l: 48, label: 'Sky',     hex: '#0ea5e9' },
  teal:    { h: 174, s: 84, l: 39, label: 'Teal',    hex: '#0d9488' },
  violet:  { h: 262, s: 80, l: 60, label: 'Violet',  hex: '#8b5cf6' },
  rose:    { h: 345, s: 84, l: 58, label: 'Rose',    hex: '#f43f5e' },
  amber:   { h: 38,  s: 92, l: 50, label: 'Amber',   hex: '#f59e0b' },
  emerald: { h: 152, s: 76, l: 40, label: 'Emerald', hex: '#10b981' },
};

export type RowDensity = 'compact' | 'comfortable';

export interface AppSettings {
  accentColor: AccentColorKey;
  rowDensity: RowDensity;
  crossfadeDuration: number;   // seconds 0–12, 0 = disabled
  resumeSession: boolean;
  autoScanOnStartup: boolean;
  showTrackNotifications: boolean;
  minimizeToTray: boolean;
}

const DEFAULTS: AppSettings = {
  accentColor: 'sky',
  rowDensity: 'comfortable',
  crossfadeDuration: 0,
  resumeSession: true,
  autoScanOnStartup: false,
  showTrackNotifications: true,
  minimizeToTray: false,
};

// Apply the accent hsl vars to the document root
function applyAccent(key: AccentColorKey) {
  const { h, s, l } = ACCENT_PRESETS[key];
  const root = document.documentElement;
  root.style.setProperty('--accent-h', String(h));
  root.style.setProperty('--accent-s', `${s}%`);
  root.style.setProperty('--accent-l', `${l}%`);
}

// Apply density attribute to body
function applyDensity(density: RowDensity) {
  document.body.setAttribute('data-density', density);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface SettingsState extends AppSettings {
  isLoaded: boolean;

  init: () => Promise<void>;
  setAccentColor: (key: AccentColorKey) => Promise<void>;
  setRowDensity: (density: RowDensity) => Promise<void>;
  setCrossfadeDuration: (seconds: number) => Promise<void>;
  setResumeSession: (enabled: boolean) => Promise<void>;
  setAutoScanOnStartup: (enabled: boolean) => Promise<void>;
  setShowTrackNotifications: (enabled: boolean) => Promise<void>;
  setMinimizeToTray: (enabled: boolean) => Promise<void>;
}

const persist = (key: string, value: string) =>
  window.electron.db.setSetting(key, value);

const readBool = (v: string | null, def: boolean): boolean =>
  v === null ? def : v === '1';

const readNum = (v: string | null, def: number): number =>
  v === null ? def : parseFloat(v);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  isLoaded: false,

  init: async () => {
    if (get().isLoaded) return;
    try {
      const db = window.electron.db;
      const [accent, density, crossfade, resume, autoScan, trackNotif, tray] = await Promise.all([
        db.getSetting('accent_color'),
        db.getSetting('row_density'),
        db.getSetting('crossfade_duration'),
        db.getSetting('resume_session'),
        db.getSetting('auto_scan_on_startup'),
        db.getSetting('show_track_notifications'),
        db.getSetting('minimize_to_tray'),
      ]);

      const accentColor = (accent as AccentColorKey) in ACCENT_PRESETS
        ? (accent as AccentColorKey)
        : DEFAULTS.accentColor;

      const rowDensity: RowDensity = density === 'compact' ? 'compact' : 'comfortable';
      const crossfadeDuration = readNum(crossfade, DEFAULTS.crossfadeDuration);
      const resumeSession = readBool(resume, DEFAULTS.resumeSession);
      const autoScanOnStartup = readBool(autoScan, DEFAULTS.autoScanOnStartup);
      const showTrackNotifications = readBool(trackNotif, DEFAULTS.showTrackNotifications);
      const minimizeToTray = readBool(tray, DEFAULTS.minimizeToTray);

      applyAccent(accentColor);
      applyDensity(rowDensity);

      // Notify main process about tray state
      if (minimizeToTray) {
        await window.electron.db.setMinimizeToTray(true);
      }

      set({
        accentColor,
        rowDensity,
        crossfadeDuration,
        resumeSession,
        autoScanOnStartup,
        showTrackNotifications,
        minimizeToTray,
        isLoaded: true,
      });
    } catch (err) {
      console.error('[Settings] Failed to load settings:', err);
      applyAccent(DEFAULTS.accentColor);
      applyDensity(DEFAULTS.rowDensity);
      set({ ...DEFAULTS, isLoaded: true });
    }
  },

  setAccentColor: async (key) => {
    applyAccent(key);
    set({ accentColor: key });
    await persist('accent_color', key);
  },

  setRowDensity: async (density) => {
    applyDensity(density);
    set({ rowDensity: density });
    await persist('row_density', density);
  },

  setCrossfadeDuration: async (seconds) => {
    const safe = Math.max(0, Math.min(12, Math.round(seconds)));
    set({ crossfadeDuration: safe });
    await persist('crossfade_duration', String(safe));
  },

  setResumeSession: async (enabled) => {
    set({ resumeSession: enabled });
    await persist('resume_session', enabled ? '1' : '0');
  },

  setAutoScanOnStartup: async (enabled) => {
    set({ autoScanOnStartup: enabled });
    await persist('auto_scan_on_startup', enabled ? '1' : '0');
  },

  setShowTrackNotifications: async (enabled) => {
    set({ showTrackNotifications: enabled });
    await persist('show_track_notifications', enabled ? '1' : '0');
  },

  setMinimizeToTray: async (enabled) => {
    set({ minimizeToTray: enabled });
    await persist('minimize_to_tray', enabled ? '1' : '0');
    await window.electron.db.setMinimizeToTray(enabled);
  },
}));
