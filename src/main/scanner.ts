import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mm from 'music-metadata';
import { app } from 'electron';
import dbManager from './database';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg']);

export interface ScanProgress {
  scannedFiles: number;
  totalFiles: number;
  currentFile: string;
}

class MusicScanner {
  private isScanning = false;

  /**
   * Recursively crawl a directory to find supported audio files.
   */
  private async crawlDirectory(dir: string, fileList: string[] = []): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.crawlDirectory(fullPath, fileList);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            fileList.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`[Scanner] Error reading directory ${dir}:`, error);
    }
    return fileList;
  }

  /**
   * Save album artwork from metadata to the user data folder.
   */
  private async saveArtwork(metadata: mm.IAudioMetadata, songFilePath: string): Promise<string | null> {
    const userDataPath = app.getPath('userData');
    const artworkDir = path.join(userDataPath, 'artwork');

    // Create artwork folder if it doesn't exist
    if (!existsSync(artworkDir)) {
      await fs.mkdir(artworkDir, { recursive: true });
    }

    // 1. Try to extract embedded picture from metadata
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const buffer = picture.data;
      
      // Compute a unique key based on album and artist, to avoid duplicate artwork files
      const albumKey = `${metadata.common.artist || 'Unknown Artist'}-${metadata.common.album || 'Unknown Album'}`;
      const artworkHash = crypto.createHash('md5').update(albumKey).digest('hex');
      const extension = picture.format ? picture.format.split('/')[1] || 'jpg' : 'jpg';
      const artworkFileName = `${artworkHash}.${extension}`;
      const destPath = path.join(artworkDir, artworkFileName);

      // Write artwork to disk if it doesn't exist
      if (!existsSync(destPath)) {
        await fs.writeFile(destPath, buffer);
      }
      return destPath;
    }

    // 2. Fallback: Search the song directory for local artwork files (cover.jpg, folder.jpg etc)
    const songDir = path.dirname(songFilePath);
    const commonCoverNames = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'album.jpg', 'album.png'];
    for (const name of commonCoverNames) {
      const localCoverPath = path.join(songDir, name);
      if (existsSync(localCoverPath)) {
        return localCoverPath;
      }
    }

    return null;
  }

  /**
   * Scan folders stored in settings database, extracts metadata, and synchronize with SQLite.
   */
  public async scanLibrary(onProgress?: (progress: ScanProgress) => void): Promise<{ added: number; removed: number }> {
    if (this.isScanning) {
      console.warn('[Scanner] Scan already in progress.');
      return { added: 0, removed: 0 };
    }
    this.isScanning = true;
    console.log('[Scanner] Starting library scan...');

    let added = 0;
    let removed = 0;

    try {
      // Get all folders from database settings
      const foldersSetting = dbManager.queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'music_folders');
      const folders: string[] = foldersSetting ? JSON.parse(foldersSetting.value) : [];

      if (folders.length === 0) {
        console.log('[Scanner] No folders configured to scan.');
        this.isScanning = false;
        return { added: 0, removed: 0 };
      }

      // Collect all supported audio files in configured folders
      const allFilesInFolders: string[] = [];
      for (const folder of folders) {
        if (existsSync(folder)) {
          await this.crawlDirectory(folder, allFilesInFolders);
        } else {
          console.warn(`[Scanner] Folder does not exist: ${folder}`);
        }
      }

      console.log(`[Scanner] Found ${allFilesInFolders.length} audio files on disk.`);

      // Get all existing songs in the database to detect deletions/modifications
      const existingSongs = dbManager.query<{ id: string; file_path: string }>('SELECT id, file_path FROM songs');
      const existingPathsMap = new Map<string, string>(); // file_path -> id
      const dbPathsSet = new Set<string>();

      for (const song of existingSongs) {
        existingPathsMap.set(song.file_path, song.id);
        dbPathsSet.add(song.file_path);
      }

      // 1. Identify and remove deleted songs from database
      const diskPathsSet = new Set(allFilesInFolders);
      const pathsToRemove: string[] = [];
      
      for (const dbPath of dbPathsSet) {
        if (!diskPathsSet.has(dbPath)) {
          pathsToRemove.push(dbPath);
        }
      }

      if (pathsToRemove.length > 0) {
        console.log(`[Scanner] Removing ${pathsToRemove.length} missing songs from database.`);
        const deleteStmt = dbManager.getDatabase().prepare('DELETE FROM songs WHERE file_path = ?');
        const deleteTransaction = dbManager.transaction((paths: string[]) => {
          for (const p of paths) {
            deleteStmt.run(p);
          }
        });
        deleteTransaction(pathsToRemove);
        removed = pathsToRemove.length;
      }

      // 2. Parse metadata and add new songs
      const totalFiles = allFilesInFolders.length;
      let scannedFiles = 0;

      for (const filePath of allFilesInFolders) {
        scannedFiles++;
        
        // Notify progress callback
        if (onProgress) {
          onProgress({ scannedFiles, totalFiles, currentFile: path.basename(filePath) });
        }

        // Skip if song is already in DB
        if (existingPathsMap.has(filePath)) {
          continue;
        }

        try {
          // Parse metadata
          const metadata = await mm.parseFile(filePath);
          const title = metadata.common.title || path.basename(filePath, path.extname(filePath));
          const artist = metadata.common.artist || 'Unknown Artist';
          const album = metadata.common.album || 'Unknown Album';
          const genre = metadata.common.genre ? metadata.common.genre.join(', ') : 'Unknown';
          const duration = Math.round(metadata.format.duration || 0); // duration in seconds
          const trackNumber = metadata.common.track.no || null;
          
          // Save artwork
          const artworkPath = await this.saveArtwork(metadata, filePath);
          
          // Generate unique ID based on file path hash
          const songId = crypto.createHash('md5').update(filePath).digest('hex');
          const dateAdded = new Date().toISOString();

          // Insert into database
          dbManager.run(
            `INSERT INTO songs (id, title, artist, album, genre, duration, track_number, file_path, artwork_path, date_added)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [songId, title, artist, album, genre, duration, trackNumber, filePath, artworkPath, dateAdded]
          );

          added++;
        } catch (fileError) {
          console.error(`[Scanner] Failed to parse metadata for file: ${filePath}`, fileError);
        }
      }

      console.log(`[Scanner] Scan finished. Added: ${added}, Removed: ${removed}`);
    } catch (error) {
      console.error('[Scanner] Scan library error:', error);
    } finally {
      this.isScanning = false;
    }

    return { added, removed };
  }
}

export const musicScanner = new MusicScanner();
export default musicScanner;
