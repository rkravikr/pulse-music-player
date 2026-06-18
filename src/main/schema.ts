export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT,
  artist TEXT,
  album TEXT,
  genre TEXT,
  duration INTEGER,
  track_number INTEGER,
  file_path TEXT UNIQUE,
  artwork_path TEXT,
  play_count INTEGER DEFAULT 0,
  last_played DATETIME,
  date_added DATETIME
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id TEXT,
  song_id TEXT,
  sort_order INTEGER,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS recently_played (
  id TEXT PRIMARY KEY,
  song_id TEXT,
  played_at DATETIME,
  FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue (
  position INTEGER PRIMARY KEY,
  song_id TEXT,
  FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
);

-- Index creation for faster queries
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at);
`;
