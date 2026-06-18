import { useEffect, useState, useRef, useCallback } from 'react';
import { Music, ArrowUp, ArrowDown, Search, Play, Pause, Volume2, Heart } from 'lucide-react';
import { usePlaybackStore, Song, getMediaUrl } from '../store/playbackStore';
import ContextMenu from '../components/ContextMenu';
import { useVirtualizer } from '@tanstack/react-virtual';

// Row height must be fixed for the virtualizer to work correctly
const ROW_HEIGHT = 56; // px — matches py-2.5 + 10px artwork

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song } | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'title' | 'artist' | 'album' | 'duration' | 'date_added'>('title');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [loading, setLoading] = useState(true);

  // Ref for the scrollable container — required by the virtualizer
  const scrollRef = useRef<HTMLDivElement>(null);

  // Playback integration
  const { currentSong, isPlaying, playSong, togglePlay, toggleLike } = usePlaybackStore();

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      const list = await window.electron.db.getAllSongs(sortField, sortOrder, search);
      setSongs(list);
    } catch (err) {
      console.error('Failed to fetch songs:', err);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, search]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // ---------------------------------------------------------------------------
  // Virtualizer — only renders rows visible in the scroll container
  // ---------------------------------------------------------------------------
  const rowVirtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8, // render 8 extra rows above/below viewport for smooth scroll
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '--';
    }
  };

  const handleRowPlayClick = useCallback((song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  }, [currentSong, togglePlay, playSong, songs]);

  const renderSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'ASC'
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-accent inline" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 text-accent inline" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Songs</h2>
          <p className="text-xs text-text-secondary mt-1">
            {loading ? 'Loading library...' : `${songs.length} tracks`}
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full text-sm bg-background-surface border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200"
          />
        </div>
      </div>

      {/* Songs Table */}
      <div className="w-full bg-background-surface rounded-2xl border border-white/[0.02] overflow-hidden shadow-xl">
        {/* Sticky column header */}
        <div className="grid grid-cols-12 px-5 py-3 bg-white/[0.01] border-b border-white/[0.02] text-xs font-bold text-text-secondary uppercase tracking-wider select-none">
          <div className="col-span-1">#</div>
          <div onClick={() => handleSort('title')} className="col-span-4 hover:text-text-primary cursor-pointer transition-colors flex items-center">
            Title {renderSortIcon('title')}
          </div>
          <div onClick={() => handleSort('artist')} className="col-span-2 hover:text-text-primary cursor-pointer transition-colors flex items-center">
            Artist {renderSortIcon('artist')}
          </div>
          <div onClick={() => handleSort('album')} className="col-span-2 hover:text-text-primary cursor-pointer transition-colors flex items-center">
            Album {renderSortIcon('album')}
          </div>
          <div onClick={() => handleSort('date_added')} className="col-span-1 hover:text-text-primary cursor-pointer transition-colors flex items-center justify-end">
            Added {renderSortIcon('date_added')}
          </div>
          <div className="col-span-1 text-center">Like</div>
          <div onClick={() => handleSort('duration')} className="col-span-1 hover:text-text-primary cursor-pointer transition-colors flex items-center justify-end">
            Time {renderSortIcon('duration')}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-20 text-center text-text-secondary">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 mx-auto mb-4" />
            <p className="text-sm">Reading database...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="py-20 text-center text-text-secondary">
            <Music className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
            <p className="font-semibold text-text-primary">No songs found</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
              {search ? 'Try adjusting your search terms.' : 'Go to Settings → Library and add a music folder.'}
            </p>
          </div>
        ) : (
          /* ----------------------------------------------------------------
             Virtual scroll container.
             We give it a fixed max-height and let the virtualizer measure it.
          ---------------------------------------------------------------- */
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: '60vh' }}
          >
            {/* Total height spacer — the virtualizer relies on this */}
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const song = songs[virtualRow.index];
                const isCurrent = currentSong?.id === song.id;
                const isLiked = isCurrent && currentSong ? currentSong.is_liked : song.is_liked;

                const handleToggleLikeClick = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  await toggleLike(song.id);
                  setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: !s.is_liked } : s));
                };

                return (
                  <div
                    key={song.id}
                    style={{
                      position: 'absolute',
                      top: virtualRow.start,
                      left: 0,
                      right: 0,
                      height: ROW_HEIGHT,
                    }}
                    onDoubleClick={() => playSong(song, songs)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, song });
                    }}
                    className={`grid grid-cols-12 px-5 items-center text-sm transition-colors group border-b border-white/[0.01] ${
                      isCurrent
                        ? 'bg-accent/5 text-accent hover:bg-accent/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* # / Play button */}
                    <div className="col-span-1 text-text-muted font-medium text-xs flex items-center h-6">
                      <span className="group-hover:hidden flex items-center">
                        {isCurrent && isPlaying
                          ? <Volume2 className="w-4 h-4 text-accent animate-pulse" />
                          : virtualRow.index + 1}
                      </span>
                      <button
                        onClick={() => handleRowPlayClick(song)}
                        className="hidden group-hover:flex items-center text-text-primary hover:text-accent transition-colors"
                      >
                        {isCurrent && isPlaying
                          ? <Pause className="w-3.5 h-3.5 fill-current" />
                          : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                    </div>

                    {/* Title + artwork */}
                    <div className="col-span-4 flex items-center gap-3 pr-4">
                      <div className="w-9 h-9 rounded-lg bg-background-elevated border border-white/[0.04] flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
                        {song.artwork_path ? (
                          <img
                            src={getMediaUrl(song.artwork_path)}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                          />
                        ) : (
                          <Music className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className={`font-semibold text-sm truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`}>
                          {song.title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{song.genre || 'Unknown'}</p>
                      </div>
                    </div>

                    <div className="col-span-2 truncate font-medium pr-4">{song.artist}</div>
                    <div className="col-span-2 truncate pr-4">{song.album}</div>
                    <div className="col-span-1 text-right text-xs text-text-muted">{formatDate(song.date_added)}</div>

                    {/* Like button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={handleToggleLikeClick}
                        className={`transition-colors ${
                          isLiked
                            ? 'text-rose-500 hover:text-rose-400'
                            : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-rose-500'
                        }`}
                        title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    <div className="col-span-1 text-right text-xs text-text-muted font-medium pr-1">
                      {formatDuration(song.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          song={contextMenu.song}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
