import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronWindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
}

export interface ElectronDatabaseAPI {
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  selectImage: () => Promise<string | null>;
  triggerLibraryScan: () => Promise<{ added: number; removed: number }>;
  onScanProgress: (callback: (progress: any) => void) => () => void;
  getAllSongs: (sortField?: string, sortOrder?: string, search?: string) => Promise<any[]>;
  getAllAlbums: () => Promise<any[]>;
  getAlbumSongs: (albumName: string, artistName: string) => Promise<any[]>;
  savePlaybackSession: (session: any) => Promise<boolean>;
  getPlaybackSession: () => Promise<any>;
  getPlaylists: () => Promise<any[]>;
  createPlaylist: (name: string, description: string) => Promise<string>;
  deletePlaylist: (id: string) => Promise<boolean>;
  getPlaylistDetails: (id: string) => Promise<any>;
  getPlaylistSongs: (playlistId: string) => Promise<any[]>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<boolean>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<boolean>;
  reorderPlaylistSongs: (playlistId: string, songIds: string[]) => Promise<boolean>;
  updatePlaylistDetails: (playlistId: string, name: string, description: string, coverImagePath: string | null) => Promise<boolean>;
  toggleLikeSong: (songId: string) => Promise<boolean>;
  isSongLiked: (songId: string) => Promise<boolean>;
  addRecentlyPlayed: (songId: string) => Promise<boolean>;
  getRecentlyPlayed: () => Promise<any[]>;
  getLibraryStats: () => Promise<{ foldersCount: number; folders: string[]; songsCount: number; albumsCount: number; likedCount: number }>;
  // Settings extras
  getAppInfo: () => Promise<{ version: string; userDataPath: string; dbPath: string }>;
  openUserData: () => Promise<void>;
  getStorageStats: () => Promise<{ artworkCount: number; artworkSizeBytes: number }>;
  clearArtworkCache: () => Promise<boolean>;
  exportLibraryCsv: () => Promise<boolean>;
  resetLibrary: () => Promise<boolean>;
  showTrackNotification: (title: string, artist: string, artworkPath: string | null) => Promise<void>;
  setMinimizeToTray: (enabled: boolean) => Promise<void>;
  openExternal: (url: string) => Promise<boolean>;
}

const windowAPI: ElectronWindowAPI = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
};

const databaseAPI: ElectronDatabaseAPI = {
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectImage: () => ipcRenderer.invoke('select-image'),
  triggerLibraryScan: () => ipcRenderer.invoke('trigger-library-scan'),
  onScanProgress: (callback) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('scan-progress', handler);
    return () => {
      ipcRenderer.removeListener('scan-progress', handler);
    };
  },
  getAllSongs: (sortField, sortOrder, search) => ipcRenderer.invoke('get-all-songs', sortField, sortOrder, search),
  getAllAlbums: () => ipcRenderer.invoke('get-all-albums'),
  getAlbumSongs: (albumName, artistName) => ipcRenderer.invoke('get-album-songs', albumName, artistName),
  savePlaybackSession: (session) => ipcRenderer.invoke('save-playback-session', session),
  getPlaybackSession: () => ipcRenderer.invoke('get-playback-session'),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  createPlaylist: (name, description) => ipcRenderer.invoke('create-playlist', name, description),
  deletePlaylist: (id) => ipcRenderer.invoke('delete-playlist', id),
  getPlaylistDetails: (id) => ipcRenderer.invoke('get-playlist-details', id),
  getPlaylistSongs: (playlistId) => ipcRenderer.invoke('get-playlist-songs', playlistId),
  addSongToPlaylist: (playlistId, songId) => ipcRenderer.invoke('add-song-to-playlist', playlistId, songId),
  removeSongFromPlaylist: (playlistId, songId) => ipcRenderer.invoke('remove-song-from-playlist', playlistId, songId),
  reorderPlaylistSongs: (playlistId, songIds) => ipcRenderer.invoke('reorder-playlist-songs', playlistId, songIds),
  updatePlaylistDetails: (playlistId, name, description, coverImagePath) => ipcRenderer.invoke('update-playlist-details', playlistId, name, description, coverImagePath),
  toggleLikeSong: (songId) => ipcRenderer.invoke('toggle-like-song', songId),
  isSongLiked: (songId) => ipcRenderer.invoke('is-song-liked', songId),
  addRecentlyPlayed: (songId) => ipcRenderer.invoke('add-recently-played', songId),
  getRecentlyPlayed: () => ipcRenderer.invoke('get-recently-played'),
  getLibraryStats: () => ipcRenderer.invoke('get-library-stats'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openUserData: () => ipcRenderer.invoke('open-user-data'),
  getStorageStats: () => ipcRenderer.invoke('get-storage-stats'),
  clearArtworkCache: () => ipcRenderer.invoke('clear-artwork-cache'),
  exportLibraryCsv: () => ipcRenderer.invoke('export-library-csv'),
  resetLibrary: () => ipcRenderer.invoke('reset-library'),
  showTrackNotification: (title, artist, artworkPath) => ipcRenderer.invoke('show-track-notification', title, artist, artworkPath),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('set-minimize-to-tray', enabled),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
};

contextBridge.exposeInMainWorld('electron', {
  window: windowAPI,
  db: databaseAPI,
});
