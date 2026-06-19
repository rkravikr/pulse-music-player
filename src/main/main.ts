import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, Tray, Menu, Notification } from 'electron';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import dbManager from './database';
import musicScanner from './scanner';

// Register custom media scheme for local file loading bypass CSP
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, stream: true, secure: true, supportFetchAPI: true, standard: true } }
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    frame: false, // Frameless window for custom styling
    backgroundColor: '#0f0f11',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', () => {
    // 1. Setup custom protocol handler for loading media and artwork
    protocol.handle('media', (request) => {
      try {
        const url = new URL(request.url);
        const decodedPath = decodeURIComponent(url.pathname);
        let filePath = decodedPath;
        // On Windows, pathname is like "/D:/Music/song.mp3"
        if (filePath.startsWith('/') && filePath.charAt(2) === ':') {
          filePath = filePath.slice(1);
        }
        
        const nativePath = path.normalize(filePath);

        if (!fs.existsSync(nativePath)) {
          return new Response('File not found', { status: 404 });
        }
        
        const stats = fs.statSync(nativePath);
        const fileSize = stats.size;
        const rangeHeader = request.headers.get('range');

        // Helper to guess mime type from file extension
        const getMimeType = (fPath: string): string => {
          const ext = path.extname(fPath).toLowerCase();
          switch (ext) {
            case '.mp3': return 'audio/mpeg';
            case '.m4a': return 'audio/mp4';
            case '.wav': return 'audio/wav';
            case '.flac': return 'audio/flac';
            case '.ogg': return 'audio/ogg';
            default: return 'audio/mpeg';
          }
        };

        const mimeType = getMimeType(nativePath);

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          
          const safeStart = isNaN(start) ? 0 : start;
          const safeEnd = isNaN(end) ? fileSize - 1 : Math.min(end, fileSize - 1);
          const chunksize = (safeEnd - safeStart) + 1;

          const fileStream = fs.createReadStream(nativePath, { start: safeStart, end: safeEnd });

          return new Response(fileStream as any, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${safeStart}-${safeEnd}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize.toString(),
              'Content-Type': mimeType,
            }
          });
        } else {
          return new Response(fs.createReadStream(nativePath) as any, {
            status: 200,
            headers: {
              'Content-Length': fileSize.toString(),
              'Content-Type': mimeType,
              'Accept-Ranges': 'bytes',
            }
          });
        }
      } catch (err) {
        console.error('Error serving media file:', err);
        return new Response('Error loading file', { status: 500 });
      }
    });

    // 2. Initialize database
    try {
      dbManager.init();
    } catch (err) {
      console.error('Failed to initialize database, exiting app', err);
      app.quit();
      return;
    }

    // 3. Register IPC methods
    setupIpcHandlers();

    // 4. Create Window
    createMainWindow();

    // 5. Auto-scan on startup (if setting is enabled)
    if (mainWindow) {
      mainWindow.once('ready-to-show', async () => {
        try {
          const autoScanRow = dbManager.queryOne<{ value: string }>(
            "SELECT value FROM settings WHERE key = 'auto_scan_on_startup'"
          );
          const shouldAutoScan = autoScanRow?.value === '1';

          if (shouldAutoScan) {
            const foldersRow = dbManager.queryOne<{ value: string }>(
              "SELECT value FROM settings WHERE key = 'music_folders'"
            );
            const folders: string[] = foldersRow ? JSON.parse(foldersRow.value) : [];

            if (folders.length > 0) {
              console.log('[Main] Auto-scan on startup triggered.');
              musicScanner.scanLibrary((progress) => {
                mainWindow?.webContents.send('scan-progress', progress);
              }).catch(err => console.error('[Main] Auto-scan failed:', err));
            }
          }
        } catch (err) {
          console.error('[Main] Failed to check auto-scan setting:', err);
        }
      });
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

/* Tray helpers */
function createTray() {
  if (tray) return;
  // Use a generic Electron icon as fallback since we may not have a custom icon asset
  const iconPath = path.join(__dirname, '../../resources/icon.ico');
  const fallbackIcon = path.join(__dirname, '../renderer/icon.ico');
  const usedPath = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(fallbackIcon) ? fallbackIcon : '');

  try {
    tray = new Tray(usedPath || path.join(__dirname, '../../node_modules/electron/dist/resources/default_app/icon.png'));
  } catch {
    // Can't create tray without a valid icon – skip gracefully
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Pulse',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);
  tray.setToolTip('Pulse – Music Player');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

// Setup custom titlebar & application IPC actions
function setupIpcHandlers() {
  // Window controls
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Folder selection
  ipcMain.handle('select-folder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Music Folder',
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Image selection
  ipcMain.handle('select-image', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Select Playlist Cover Image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Settings management
  ipcMain.handle('get-setting', (event, key: string) => {
    const row = dbManager.queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
    return row ? row.value : null;
  });

  ipcMain.handle('set-setting', (event, key: string, value: string) => {
    dbManager.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
    return true;
  });

  // Library scanning trigger
  ipcMain.handle('trigger-library-scan', async () => {
    return await musicScanner.scanLibrary((progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('scan-progress', progress);
      }
    });
  });

  // Song Queries
  ipcMain.handle('get-all-songs', (event, sortField = 'title', sortOrder = 'ASC', search = '') => {
    const allowedColumns = ['title', 'artist', 'album', 'duration', 'date_added'];
    const field = allowedColumns.includes(sortField) ? sortField : 'title';
    const order = sortOrder === 'DESC' ? 'DESC' : 'ASC';
    
    if (search.trim() !== '') {
      const searchWildcard = `%${search}%`;
      return dbManager.query(
        `SELECT s.*, (ps.song_id IS NOT NULL) as is_liked 
         FROM songs s 
         LEFT JOIN playlist_songs ps ON s.id = ps.song_id AND ps.playlist_id = 'liked-songs'
         WHERE s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ? OR s.genre LIKE ?
         ORDER BY s.${field} ${order}`,
        [searchWildcard, searchWildcard, searchWildcard, searchWildcard]
      );
    }
    
    return dbManager.query(
      `SELECT s.*, (ps.song_id IS NOT NULL) as is_liked 
       FROM songs s 
       LEFT JOIN playlist_songs ps ON s.id = ps.song_id AND ps.playlist_id = 'liked-songs'
       ORDER BY s.${field} ${order}`
    );
  });

  // Album Queries
  ipcMain.handle('get-all-albums', () => {
    return dbManager.query(
      `SELECT album as name, artist, artwork_path, COUNT(*) as song_count 
       FROM songs 
       GROUP BY album, artist 
       ORDER BY album ASC`
    );
  });

  // Album Songs Query
  ipcMain.handle('get-album-songs', (event, albumName: string, artistName: string) => {
    return dbManager.query(
      `SELECT s.*, (ps.song_id IS NOT NULL) as is_liked 
       FROM songs s 
       LEFT JOIN playlist_songs ps ON s.id = ps.song_id AND ps.playlist_id = 'liked-songs'
       WHERE s.album = ? AND s.artist = ? 
       ORDER BY s.track_number ASC, s.title ASC`,
      [albumName, artistName]
    );
  });

  // Session Persistence Queries
  ipcMain.handle('save-playback-session', (event, session) => {
    const { currentSongId, currentTime, volume, shuffle, repeat, queueIds, queueIndex } = session;
    
    try {
      dbManager.transaction(() => {
        // Clear previous queue
        dbManager.run('DELETE FROM queue');
        
        // Insert new queue
        const insertQueue = dbManager.getDatabase().prepare('INSERT INTO queue (position, song_id) VALUES (?, ?)');
        queueIds.forEach((id: string, index: number) => {
          insertQueue.run(index, id);
        });
        
        // Helper to upsert setting
        const upsertSetting = dbManager.getDatabase().prepare(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        );
        
        upsertSetting.run('current_song_id', currentSongId || '');
        upsertSetting.run('current_time', currentTime.toString());
        upsertSetting.run('volume', volume.toString());
        upsertSetting.run('shuffle', shuffle ? '1' : '0');
        upsertSetting.run('repeat', repeat);
        upsertSetting.run('queue_index', queueIndex.toString());
      })();
      return true;
    } catch (err) {
      console.error('[Database] Failed to save playback session:', err);
      return false;
    }
  });

  ipcMain.handle('get-playback-session', () => {
    try {
      const getSettingVal = (key: string) => {
        const row = dbManager.queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
        return row ? row.value : null;
      };
      
      const currentSongId = getSettingVal('current_song_id');
      const currentTime = parseFloat(getSettingVal('current_time') || '0');
      const volume = parseFloat(getSettingVal('volume') || '0.8');
      const shuffle = getSettingVal('shuffle') === '1';
      const repeat = (getSettingVal('repeat') as any) || 'off';
      const queueIndex = parseInt(getSettingVal('queue_index') || '-1', 10);
      
      const queueSongs = dbManager.query<any>(
        'SELECT s.* FROM queue q JOIN songs s ON q.song_id = s.id ORDER BY q.position ASC'
      );
      
      const currentSong = currentSongId 
        ? dbManager.queryOne<any>('SELECT * FROM songs WHERE id = ?', currentSongId) 
        : null;
        
      return {
        currentSong: currentSong ? { ...currentSong, is_liked: currentSongId ? (dbManager.queryOne("SELECT 1 FROM playlist_songs WHERE playlist_id = 'liked-songs' AND song_id = ?", [currentSongId]) !== null) : false } : null,
        currentTime,
        volume,
        shuffle,
        repeat,
        queueIndex,
        queue: queueSongs.map(s => ({
          ...s,
          is_liked: dbManager.queryOne("SELECT 1 FROM playlist_songs WHERE playlist_id = 'liked-songs' AND song_id = ?", [s.id]) !== null
        })),
      };
    } catch (err) {
      console.error('[Database] Failed to retrieve playback session:', err);
      return null;
    }
  });

  // Playlist CRUD IPC Handlers
  ipcMain.handle('get-playlists', () => {
    return dbManager.query("SELECT * FROM playlists WHERE id != 'liked-songs' ORDER BY name ASC");
  });

  ipcMain.handle('create-playlist', (event, name: string, description: string) => {
    const id = crypto.createHash('md5').update(name + Date.now()).digest('hex');
    const createdAt = new Date().toISOString();
    dbManager.run(
      'INSERT INTO playlists (id, name, description, cover_image, created_at) VALUES (?, ?, ?, NULL, ?)',
      [id, name, description, createdAt]
    );
    return id;
  });

  ipcMain.handle('delete-playlist', (event, id: string) => {
    if (id === 'liked-songs') return false;
    dbManager.run('DELETE FROM playlists WHERE id = ?', [id]);
    return true;
  });

  ipcMain.handle('get-playlist-details', (event, playlistId: string) => {
    return dbManager.queryOne('SELECT * FROM playlists WHERE id = ?', [playlistId]);
  });

  ipcMain.handle('update-playlist-details', async (event, playlistId: string, name: string, description: string, coverImagePath: string | null) => {
    try {
      let finalCoverPath: string | null = null;
      if (coverImagePath) {
        const userDataPath = app.getPath('userData');
        const coversDir = path.join(userDataPath, 'playlist_covers');
        if (!fs.existsSync(coversDir)) {
          fs.mkdirSync(coversDir, { recursive: true });
        }
        const ext = path.extname(coverImagePath) || '.jpg';
        const newFileName = `playlist_${playlistId}_cover_${Date.now()}${ext}`;
        const destPath = path.join(coversDir, newFileName);
        
        fs.copyFileSync(coverImagePath, destPath);
        finalCoverPath = destPath;
      }

      if (finalCoverPath) {
        // Retrieve old cover path if any to delete it to avoid cluttering userData
        const oldRow = dbManager.queryOne<{ cover_image: string | null }>('SELECT cover_image FROM playlists WHERE id = ?', playlistId);
        if (oldRow && oldRow.cover_image && fs.existsSync(oldRow.cover_image)) {
          try {
            fs.unlinkSync(oldRow.cover_image);
          } catch (unlinkErr) {
            console.error('[Database] Failed to delete old cover image:', unlinkErr);
          }
        }

        dbManager.run(
          'UPDATE playlists SET name = ?, description = ?, cover_image = ? WHERE id = ?',
          [name, description, finalCoverPath, playlistId]
        );
      } else {
        dbManager.run(
          'UPDATE playlists SET name = ?, description = ? WHERE id = ?',
          [name, description, playlistId]
        );
      }
      return true;
    } catch (err) {
      console.error('[Database] Failed to update playlist details:', err);
      return false;
    }
  });

  ipcMain.handle('get-playlist-songs', (event, playlistId: string) => {
    return dbManager.query(
      `SELECT s.*, (ps2.song_id IS NOT NULL) as is_liked 
       FROM playlist_songs ps 
       JOIN songs s ON ps.song_id = s.id 
       LEFT JOIN playlist_songs ps2 ON s.id = ps2.song_id AND ps2.playlist_id = 'liked-songs'
       WHERE ps.playlist_id = ? 
       ORDER BY ps.sort_order ASC`,
      [playlistId]
    );
  });

  ipcMain.handle('add-song-to-playlist', (event, playlistId: string, songId: string) => {
    const exists = dbManager.queryOne(
      'SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId]
    );
    if (exists) return false;
    
    const row = dbManager.queryOne<{ next_order: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM playlist_songs WHERE playlist_id = ?',
      [playlistId]
    );
    const order = row ? row.next_order : 1;
    
    dbManager.run(
      'INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)',
      [playlistId, songId, order]
    );
    return true;
  });

  ipcMain.handle('remove-song-from-playlist', (event, playlistId: string, songId: string) => {
    dbManager.run(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId]
    );
    return true;
  });

  ipcMain.handle('reorder-playlist-songs', (event, playlistId: string, songIds: string[]) => {
    try {
      dbManager.transaction(() => {
        const stmt = dbManager.getDatabase().prepare(
          'UPDATE playlist_songs SET sort_order = ? WHERE playlist_id = ? AND song_id = ?'
        );
        songIds.forEach((songId, index) => {
          stmt.run(index, playlistId, songId);
        });
      })();
      return true;
    } catch (err) {
      console.error('[Database] Failed to reorder playlist:', err);
      return false;
    }
  });

  ipcMain.handle('toggle-like-song', (event, songId: string) => {
    const isLiked = dbManager.queryOne(
      "SELECT 1 FROM playlist_songs WHERE playlist_id = 'liked-songs' AND song_id = ?",
      [songId]
    );
    if (isLiked) {
      dbManager.run(
        "DELETE FROM playlist_songs WHERE playlist_id = 'liked-songs' AND song_id = ?",
        [songId]
      );
      return false; // Now unliked
    } else {
      const row = dbManager.queryOne<{ next_order: number }>(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM playlist_songs WHERE playlist_id = 'liked-songs'"
      );
      const order = row ? row.next_order : 1;
      dbManager.run(
        "INSERT INTO playlist_songs (playlist_id, song_id, sort_order) VALUES ('liked-songs', ?, ?)",
        [songId, order]
      );
      return true; // Now liked
    }
  });

  ipcMain.handle('is-song-liked', (event, songId: string) => {
    const row = dbManager.queryOne(
      "SELECT 1 FROM playlist_songs WHERE playlist_id = 'liked-songs' AND song_id = ?",
      [songId]
    );
    return row !== null;
  });

  // Recently Played IPC Handlers
  ipcMain.handle('add-recently-played', (event, songId: string) => {
    try {
      dbManager.transaction(() => {
        dbManager.run(
          'UPDATE songs SET play_count = play_count + 1, last_played = CURRENT_TIMESTAMP WHERE id = ?',
          [songId]
        );
        
        const id = crypto.createHash('md5').update(songId + Date.now() + Math.random()).digest('hex');
        dbManager.run(
          'INSERT INTO recently_played (id, song_id, played_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [id, songId]
        );
        
        dbManager.run(
          `DELETE FROM recently_played WHERE id NOT IN (
            SELECT id FROM recently_played ORDER BY played_at DESC LIMIT 50
          )`
        );
      })();
      return true;
    } catch (err) {
      console.error('[Database] Failed to add recently played song:', err);
      return false;
    }
  });

  ipcMain.handle('get-recently-played', () => {
    try {
      return dbManager.query(
        `SELECT s.*, rp.played_at, (ps.song_id IS NOT NULL) as is_liked
         FROM recently_played rp
         JOIN songs s ON rp.song_id = s.id
         LEFT JOIN playlist_songs ps ON s.id = ps.song_id AND ps.playlist_id = 'liked-songs'
         ORDER BY rp.played_at DESC
         LIMIT 50`
      );
    } catch (err) {
      console.error('[Database] Failed to get recently played songs:', err);
      return [];
    }
  });

  // Library Stats IPC Handler
  ipcMain.handle('get-library-stats', () => {
    try {
      const foldersRow = dbManager.queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'music_folders');
      const folders: string[] = foldersRow ? JSON.parse(foldersRow.value) : [];
      
      const songsCountRow = dbManager.queryOne<{ total: number }>('SELECT COUNT(*) as total FROM songs');
      const songsCount = songsCountRow ? songsCountRow.total : 0;
      
      const albumsCountRow = dbManager.queryOne<{ total: number }>('SELECT COUNT(DISTINCT album || artist) as total FROM songs');
      const albumsCount = albumsCountRow ? albumsCountRow.total : 0;

      const likedCountRow = dbManager.queryOne<{ total: number }>(
        "SELECT COUNT(*) as total FROM playlist_songs WHERE playlist_id = 'liked-songs'"
      );
      const likedCount = likedCountRow ? likedCountRow.total : 0;

      return {
        foldersCount: folders.length,
        folders,
        songsCount,
        albumsCount,
        likedCount,
      };
    } catch (err) {
      console.error('[Database] Failed to get library stats:', err);
      return { foldersCount: 0, folders: [], songsCount: 0, albumsCount: 0, likedCount: 0 };
    }
  });

  ipcMain.handle('get-top-artists', () => {
    try {
      return dbManager.query<{ artist: string, trackCount: number }>(`
        SELECT artist, COUNT(*) as trackCount 
        FROM songs 
        WHERE artist IS NOT NULL AND artist != ''
        GROUP BY artist 
        ORDER BY trackCount DESC 
        LIMIT 10
      `);
    } catch (err) {
      console.error('[Database] Failed to get top artists:', err);
      return [];
    }
  });

  ipcMain.handle('get-genres', () => {
    try {
      return dbManager.query<{ genre: string, trackCount: number }>(`
        SELECT genre, COUNT(*) as trackCount 
        FROM songs 
        WHERE genre IS NOT NULL AND genre != ''
        GROUP BY genre 
        ORDER BY trackCount DESC 
        LIMIT 20
      `);
    } catch (err) {
      console.error('[Database] Failed to get genres:', err);
      return [];
    }
  });

  /* -----------------------------------------------------------------------
     New settings-related IPC handlers
  ----------------------------------------------------------------------- */

  // App info
  ipcMain.handle('get-app-info', () => {
    const userDataPath = app.getPath('userData');
    return {
      version: app.getVersion(),
      userDataPath,
      dbPath: path.join(userDataPath, 'pulse_library.db'),
    };
  });

  // Open userData in Explorer / Finder
  ipcMain.handle('open-user-data', async () => {
    await shell.openPath(app.getPath('userData'));
  });

  // Artwork cache stats
  ipcMain.handle('get-storage-stats', () => {
    try {
      const artworkDir = path.join(app.getPath('userData'), 'artwork');
      if (!fs.existsSync(artworkDir)) return { artworkCount: 0, artworkSizeBytes: 0 };
      const files = fs.readdirSync(artworkDir);
      let total = 0;
      for (const f of files) {
        try { total += fs.statSync(path.join(artworkDir, f)).size; } catch { /* skip */ }
      }
      return { artworkCount: files.length, artworkSizeBytes: total };
    } catch {
      return { artworkCount: 0, artworkSizeBytes: 0 };
    }
  });

  // Clear artwork cache
  ipcMain.handle('clear-artwork-cache', () => {
    try {
      const artworkDir = path.join(app.getPath('userData'), 'artwork');
      if (!fs.existsSync(artworkDir)) return true;
      for (const f of fs.readdirSync(artworkDir)) {
        try { fs.unlinkSync(path.join(artworkDir, f)); } catch { /* skip */ }
      }
      return true;
    } catch (err) {
      console.error('[Main] Failed to clear artwork cache:', err);
      return false;
    }
  });

  // Export library as CSV
  ipcMain.handle('export-library-csv', async () => {
    if (!mainWindow) return false;
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Library',
        defaultPath: 'pulse_library.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (result.canceled || !result.filePath) return false;

      const songs = dbManager.query<any>('SELECT title, artist, album, genre, duration, track_number, date_added, file_path FROM songs ORDER BY artist, album, track_number');
      const header = 'Title,Artist,Album,Genre,Duration (s),Track #,Date Added,File Path';
      const rows = songs.map(s =>
        [s.title, s.artist, s.album, s.genre, s.duration, s.track_number ?? '', s.date_added, s.file_path]
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`) 
          .join(',')
      );
      fs.writeFileSync(result.filePath, [header, ...rows].join('\n'), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Main] Failed to export library CSV:', err);
      return false;
    }
  });

  // Reset library (songs + recently played + queue; keeps settings & playlists)
  ipcMain.handle('reset-library', () => {
    try {
      dbManager.transaction(() => {
        dbManager.run('DELETE FROM recently_played');
        dbManager.run('DELETE FROM queue');
        dbManager.run("DELETE FROM playlist_songs WHERE playlist_id != 'liked-songs'");
        dbManager.run('DELETE FROM songs');
        dbManager.run("DELETE FROM settings WHERE key = 'current_song_id'");
        dbManager.run("DELETE FROM settings WHERE key = 'queue_index'");
      })();
      return true;
    } catch (err) {
      console.error('[Main] Failed to reset library:', err);
      return false;
    }
  });

  // Show OS track change notification
  ipcMain.handle('show-track-notification', (_event, title: string, artist: string, _artworkPath: string | null) => {
    if (!Notification.isSupported()) return;
    const notification = new Notification({
      title: title || 'Now Playing',
      body: artist || '',
      silent: true,
    });
    notification.show();
  });

  // System tray toggle
  ipcMain.handle('set-minimize-to-tray', (_event, enabled: boolean) => {
    if (enabled) {
      createTray();
      // Override close behaviour: minimize to tray instead of quitting
      if (mainWindow) {
        mainWindow.removeAllListeners('close');
        mainWindow.on('close', (e) => {
          e.preventDefault();
          mainWindow?.hide();
        });
      }
    } else {
      destroyTray();
      // Restore normal close behaviour
      if (mainWindow) {
        mainWindow.removeAllListeners('close');
        mainWindow.on('close', () => {
          mainWindow = null;
        });
      }
    }
  });

  // Open external URL in user's default web browser
  ipcMain.handle('open-external', (_event, url: string) => {
    try {
      shell.openExternal(url);
      return true;
    } catch (err) {
      console.error('[Main] Failed to open external URL:', err);
      return false;
    }
  });
}
