import { useEffect, useState, useCallback } from 'react';
import {
  Settings, Folder, RefreshCw, Trash2, ArrowLeft, Loader2,
  Music, Palette, Bell, HardDrive, Info, Sliders, ChevronRight,
  FolderOpen, Download, AlertTriangle, CheckCircle, XCircle, Github,
} from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import {
  useSettingsStore,
  ACCENT_PRESETS,
  AccentColorKey,
} from '../store/settingsStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LibraryStats {
  foldersCount: number;
  folders: string[];
  songsCount: number;
  albumsCount: number;
  likedCount: number;
}

interface StorageStats {
  artworkCount: number;
  artworkSizeBytes: number;
}

interface AppInfo {
  version: string;
  userDataPath: string;
  dbPath: string;
}

type TabId = 'playback' | 'library' | 'appearance' | 'notifications' | 'storage' | 'about';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'playback',      label: 'Playback',      icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'library',       label: 'Library',        icon: <Music className="w-3.5 h-3.5" /> },
  { id: 'appearance',   label: 'Appearance',     icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-3.5 h-3.5" /> },
  { id: 'storage',      label: 'Storage',        icon: <HardDrive className="w-3.5 h-3.5" /> },
  { id: 'about',        label: 'About',          icon: <Info className="w-3.5 h-3.5" /> },
];

// ---------------------------------------------------------------------------
// Mini components
// ---------------------------------------------------------------------------
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.03] last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-primary">{label}</p>
        {description && <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background-surface border border-white/[0.03] rounded-2xl p-5 space-y-1 shadow-xl">
      <p className="text-[9px] font-bold tracking-[0.12em] text-text-muted uppercase mb-3">{title}</p>
      {children}
    </div>
  );
}

function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold animate-fade-in ${
        type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { setView } = useNavigationStore();
  const settings = useSettingsStore();

  const [activeTab, setActiveTab] = useState<TabId>('playback');

  // Library state
  const [stats, setStats] = useState<LibraryStats>({
    foldersCount: 0, folders: [], songsCount: 0, albumsCount: 0, likedCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ scannedFiles: number; totalFiles: number; currentFile: string } | null>(null);

  // Storage tab
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await window.electron.db.getLibraryStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to fetch library stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchStorageStats = useCallback(async () => {
    const [storage, info] = await Promise.all([
      window.electron.db.getStorageStats(),
      window.electron.db.getAppInfo(),
    ]);
    setStorageStats(storage);
    setAppInfo(info);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'storage' || activeTab === 'about') {
      fetchStorageStats();
    }
  }, [activeTab, fetchStorageStats]);

  useEffect(() => {
    if (isScanning) {
      const unsub = window.electron.db.onScanProgress(setScanProgress);
      return () => unsub();
    }
  }, [isScanning]);

  // -------------------------------------------------------------------------
  // Library handlers
  // -------------------------------------------------------------------------
  const handleAddFolder = async () => {
    const selected = await window.electron.db.selectFolder();
    if (!selected) return;
    if (stats.folders.includes(selected)) {
      showToast('Folder already added', 'error');
      return;
    }
    const next = [...stats.folders, selected];
    await window.electron.db.setSetting('music_folders', JSON.stringify(next));
    await fetchStats();
  };

  const handleRemoveFolder = async (folder: string) => {
    if (!confirm(`Remove "${folder}" from library scan paths?`)) return;
    const next = stats.folders.filter(f => f !== folder);
    await window.electron.db.setSetting('music_folders', JSON.stringify(next));
    await fetchStats();
  };

  const handleRescan = async () => {
    if (stats.folders.length === 0) { showToast('Add a music folder first', 'error'); return; }
    try {
      setIsScanning(true);
      setScanProgress({ scannedFiles: 0, totalFiles: 0, currentFile: 'Initializing...' });
      const result = await window.electron.db.triggerLibraryScan();
      showToast(`Scan complete — added ${result.added}, removed ${result.removed}`);
      setScanProgress(null);
      await fetchStats();
    } catch {
      showToast('Scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // -------------------------------------------------------------------------
  // Storage handlers
  // -------------------------------------------------------------------------
  const handleClearCache = async () => {
    if (!confirm('Clear all cached artwork? Artwork will be re-fetched on next scan.')) return;
    const ok = await window.electron.db.clearArtworkCache();
    showToast(ok ? 'Artwork cache cleared' : 'Failed to clear cache', ok ? 'success' : 'error');
    if (ok) fetchStorageStats();
  };

  const handleExportCsv = async () => {
    const ok = await window.electron.db.exportLibraryCsv();
    if (ok) showToast('Library exported as CSV');
  };

  const handleResetLibrary = async () => {
    if (!confirm('⚠️ This will permanently delete all songs, play history, and queue from the database. Liked songs and playlists will be removed too.\n\nAre you absolutely sure?')) return;
    const ok = await window.electron.db.resetLibrary();
    showToast(ok ? 'Library reset. Add a folder and rescan.' : 'Reset failed', ok ? 'success' : 'error');
    if (ok) fetchStats();
  };

  // -------------------------------------------------------------------------
  // Tab content renderers
  // -------------------------------------------------------------------------
  const renderPlayback = () => (
    <div className="space-y-5">
      <SectionCard title="Audio">
        <SettingRow
          label="Crossfade"
          description={settings.crossfadeDuration === 0
            ? 'Disabled — tracks cut instantly'
            : `${settings.crossfadeDuration}s fade between tracks`}
        >
          <div className="flex items-center gap-3 w-40">
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={settings.crossfadeDuration}
              onChange={e => settings.setCrossfadeDuration(Number(e.target.value))}
              className="flex-1 accent-accent h-1 rounded-full cursor-pointer"
            />
            <span className="text-xs font-semibold text-accent tabular-nums w-6 text-right">
              {settings.crossfadeDuration === 0 ? 'Off' : `${settings.crossfadeDuration}s`}
            </span>
          </div>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Session">
        <SettingRow
          label="Resume last session"
          description="Restore the playing queue and paused position when Pulse opens"
        >
          <Toggle checked={settings.resumeSession} onChange={settings.setResumeSession} />
        </SettingRow>
      </SectionCard>
    </div>
  );

  const renderLibrary = () => (
    <div className="space-y-5">
      <SectionCard title="Music Folders">
        <div className="space-y-2 mb-4">
          {loadingStats ? (
            <div className="py-4 text-center text-xs text-text-muted">Loading...</div>
          ) : stats.folders.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-white/[0.05] rounded-xl">
              <Folder className="w-7 h-7 mx-auto mb-2 text-text-muted opacity-40" />
              <p className="text-xs text-text-muted italic">No folders added yet</p>
            </div>
          ) : (
            stats.folders.map((folder, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-background-elevated border border-white/[0.04]">
                <Folder className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="flex-1 text-xs text-text-primary truncate" title={folder}>{folder}</span>
                <button
                  onClick={() => handleRemoveFolder(folder)}
                  disabled={isScanning}
                  className="text-text-muted hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddFolder}
            disabled={isScanning}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <Folder className="w-3.5 h-3.5" />
            Add Folder
          </button>
          <button
            onClick={handleRescan}
            disabled={isScanning || stats.folders.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-background-elevated hover:bg-zinc-800 text-text-primary border border-white/[0.06] rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning…' : 'Rescan'}
          </button>
        </div>

        {isScanning && scanProgress && (
          <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/15 space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-accent font-semibold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Scanning…
              </span>
              {scanProgress.totalFiles > 0 && (
                <span className="text-text-muted">{Math.round((scanProgress.scannedFiles / scanProgress.totalFiles) * 100)}%</span>
              )}
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: scanProgress.totalFiles > 0 ? `${(scanProgress.scannedFiles / scanProgress.totalFiles) * 100}%` : '8%' }}
              />
            </div>
            <p className="text-[10px] text-text-muted truncate italic">{scanProgress.currentFile}</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Scan Behaviour">
        <SettingRow
          label="Auto-scan on startup"
          description="Automatically scan music folders every time Pulse opens"
        >
          <Toggle checked={settings.autoScanOnStartup} onChange={settings.setAutoScanOnStartup} />
        </SettingRow>
      </SectionCard>

      {/* Quick Stats */}
      <SectionCard title="Library Statistics">
        {[
          ['Folders', loadingStats ? '—' : `${stats.foldersCount}`],
          ['Tracks', loadingStats ? '—' : `${stats.songsCount}`],
          ['Albums', loadingStats ? '—' : `${stats.albumsCount}`],
          ['Liked', loadingStats ? '—' : `${stats.likedCount}`],
        ].map(([k, v]) => (
          <SettingRow key={k} label={k}>
            <span className="text-xs font-bold text-accent">{v}</span>
          </SettingRow>
        ))}
      </SectionCard>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-5">
      <SectionCard title="Accent Color">
        <p className="text-[10px] text-text-muted mb-4 leading-relaxed">
          Choose your accent color. All buttons, highlights, and indicators will update instantly.
        </p>
        <div className="grid grid-cols-6 gap-2">
          {(Object.keys(ACCENT_PRESETS) as AccentColorKey[]).map(key => {
            const preset = ACCENT_PRESETS[key];
            const isActive = settings.accentColor === key;
            return (
              <button
                key={key}
                onClick={() => settings.setAccentColor(key)}
                title={preset.label}
                className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                  isActive
                    ? 'border-white/30 bg-white/[0.04]'
                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center"
                  style={{ background: preset.hex }}
                >
                  {isActive && <span className="w-3 h-3 rounded-full bg-white/80 shadow" />}
                </span>
                <span className="text-[9px] font-semibold text-text-muted group-hover:text-text-secondary transition-colors">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Layout">
        <SettingRow
          label="Row density"
          description="Compact rows pack more tracks on screen; comfortable gives more breathing room"
        >
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
            {(['compact', 'comfortable'] as const).map(d => (
              <button
                key={d}
                onClick={() => settings.setRowDensity(d)}
                className={`px-3 py-1.5 text-[10px] font-semibold capitalize transition-colors ${
                  settings.rowDensity === d
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </SettingRow>
      </SectionCard>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-5">
      <SectionCard title="Track Notifications">
        <SettingRow
          label="Show now-playing notifications"
          description="Display an OS notification with the song title and artist when a new track starts"
        >
          <Toggle checked={settings.showTrackNotifications} onChange={settings.setShowTrackNotifications} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Window Behaviour">
        <SettingRow
          label="Minimize to system tray"
          description="Closing the window hides Pulse to the taskbar tray instead of quitting. Double-click the tray icon to restore."
        >
          <Toggle checked={settings.minimizeToTray} onChange={settings.setMinimizeToTray} />
        </SettingRow>
      </SectionCard>
    </div>
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStorage = () => (
    <div className="space-y-5">
      <SectionCard title="Artwork Cache">
        <SettingRow label="Cached artwork files">
          <span className="text-xs font-bold text-accent">
            {storageStats ? storageStats.artworkCount : '—'}
          </span>
        </SettingRow>
        <SettingRow label="Total cache size">
          <span className="text-xs font-bold text-accent">
            {storageStats ? formatBytes(storageStats.artworkSizeBytes) : '—'}
          </span>
        </SettingRow>
        <div className="pt-2">
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-background-elevated hover:bg-zinc-800 border border-white/[0.05] text-xs font-semibold text-text-secondary hover:text-rose-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Artwork Cache
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Library Data">
        <div className="space-y-2">
          <button
            onClick={handleExportCsv}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-background-elevated hover:bg-zinc-800 border border-white/[0.05] text-xs font-semibold text-text-secondary hover:text-accent transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Library as CSV
          </button>

          <button
            onClick={handleResetLibrary}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/25 text-xs font-semibold text-rose-400 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Reset Library Database
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-3 leading-relaxed">
          Reset clears all songs, play history, queue, and playlists. Your actual audio files are never touched.
        </p>
      </SectionCard>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-5">
      <SectionCard title="Application">
        <SettingRow label="Version">
          <span className="text-xs font-mono font-bold text-accent">
            v{appInfo?.version ?? '—'}
          </span>
        </SettingRow>
        <SettingRow label="Database path" description={appInfo?.dbPath ?? '—'}>
          <button
            onClick={() => window.electron.db.openUserData()}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
            Open
          </button>
        </SettingRow>
        <SettingRow label="User data folder" description={appInfo?.userDataPath ?? '—'}>
          <button
            onClick={() => window.electron.db.openUserData()}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Tech Stack">
        {[
          ['Runtime',   'Electron'],
          ['UI',        'React + Tailwind CSS'],
          ['Audio',     'Web Audio API (HTML5)'],
          ['Database',  'SQLite (better-sqlite3)'],
          ['Drag & Drop', '@dnd-kit'],
        ].map(([k, v]) => (
          <SettingRow key={k} label={k}>
            <span className="text-[10px] font-mono text-text-secondary">{v}</span>
          </SettingRow>
        ))}
      </SectionCard>

      <SectionCard title="Credits & Ownership">
        <SettingRow label="Created By" description="Designed & developed the music player">
          <span className="text-xs font-bold text-text-primary">Ravi Kumar Verma</span>
        </SettingRow>
        <SettingRow label="License" description="Open source distribution terms">
          <span className="text-xs font-semibold text-text-primary">MIT License</span>
        </SettingRow>
        <SettingRow label="Source Code" description="GitHub project home page">
          <button
            onClick={() => window.electron.db.openExternal('https://github.com/rkravikr/pulse-music-player')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-accent/15 border border-white/[0.05] hover:border-accent/20 text-[10px] font-semibold text-text-secondary hover:text-accent transition-all"
          >
            <Github className="w-3 h-3" />
            GitHub Repo
          </button>
        </SettingRow>
      </SectionCard>
    </div>
  );

  const tabContent: Record<TabId, React.ReactNode> = {
    playback: renderPlayback(),
    library: renderLibrary(),
    appearance: renderAppearance(),
    notifications: renderNotifications(),
    storage: renderStorage(),
    about: renderAbout(),
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto pb-10 space-y-6">
      {/* Back button */}
      <button
        onClick={() => setView('home')}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Page header */}
      <div className="flex items-center gap-4 pb-6 border-b border-white/[0.04]">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent/20 to-accent/5 border border-white/[0.05] flex items-center justify-center shadow-lg flex-shrink-0">
          <Settings className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Settings</h2>
          <p className="text-xs text-text-muted mt-0.5">Customize playback, appearance, and your library</p>
        </div>
      </div>

      {/* Tab strip + Content */}
      <div className="flex gap-6">
        {/* Left tab navigation */}
        <nav className="flex flex-col gap-0.5 w-36 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-accent/10 text-accent border border-accent/15'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.03]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          <div className="mt-8 pt-4 border-t border-white/[0.04] px-3 space-y-2.5">
            <p className="text-[10px] font-medium text-text-muted leading-tight">
              Made by <br />
              <span className="font-bold text-text-secondary">Ravi Kumar Verma</span>
            </p>
            <button
              onClick={() => window.electron.db.openExternal('https://github.com/rkravikr/pulse-music-player')}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted hover:text-accent transition-colors"
              title="Open GitHub Repository"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </button>
          </div>
        </nav>

        {/* Right: tab content */}
        <div className="flex-1 min-w-0">
          {tabContent[activeTab]}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
