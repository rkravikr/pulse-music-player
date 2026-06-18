import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import { SCHEMA_SQL } from './schema';

class DatabaseManager {
  private db: Database.Database | null = null;

  public init() {
    try {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'pulse.db');
      console.log(`[Database] Initializing database at: ${dbPath}`);

      // Open database connection
      this.db = new Database(dbPath, { verbose: console.log });
      
      // Optimize database performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');

      // Initialize schemas
      this.db.exec(SCHEMA_SQL);
      console.log('[Database] Database tables initialized successfully.');

      // Insert Liked Songs default playlist
      this.db.prepare(`
        INSERT OR IGNORE INTO playlists (id, name, description, cover_image, created_at)
        VALUES ('liked-songs', 'Liked Songs', 'Your favorited tracks collected in one place', NULL, ?)
      `).run(new Date().toISOString());
      console.log('[Database] Default Liked Songs playlist checked.');

      // Perform a verification check
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      console.log('[Database] Existing Tables in DB:', tables.map(t => t.name));
    } catch (error) {
      console.error('[Database] Initialization failed:', error);
      throw error;
    }
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // SQL Query helpers
  public query<T>(sql: string, ...params: any[]): T[] {
    try {
      const db = this.getDatabase();
      return db.prepare(sql).all(...params) as T[];
    } catch (err) {
      console.error(`[Database] Query Error running: "${sql}"`, err);
      throw err;
    }
  }

  public queryOne<T>(sql: string, ...params: any[]): T | null {
    try {
      const db = this.getDatabase();
      const result = db.prepare(sql).get(...params);
      return (result as T) || null;
    } catch (err) {
      console.error(`[Database] QueryOne Error running: "${sql}"`, err);
      throw err;
    }
  }

  public run(sql: string, ...params: any[]): Database.RunResult {
    try {
      const db = this.getDatabase();
      return db.prepare(sql).run(...params);
    } catch (err) {
      console.error(`[Database] Run Error running: "${sql}"`, err);
      throw err;
    }
  }

  public transaction(fn: (...args: any[]) => any): Database.Transaction<any> {
    const db = this.getDatabase();
    return db.transaction(fn);
  }
}

export const dbManager = new DatabaseManager();
export default dbManager;
