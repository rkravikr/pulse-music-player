import { useEffect, useRef, useState } from 'react';
import { Play, ListMusic, PlusCircle, Heart, Trash2, ChevronRight, Music } from 'lucide-react';
import { usePlaybackStore, Song } from '../store/playbackStore';
import { usePlaylistStore } from '../store/playlistStore';

interface ContextMenuProps {
  x: number;
  y: number;
  song: Song;
  playlistId?: string | null;
  onClose: () => void;
  onRemoveFromPlaylist?: () => void;
}

export default function ContextMenu({ x, y, song, playlistId, onClose, onRemoveFromPlaylist }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [submenuCoords, setSubmenuCoords] = useState({ x: 0, y: 0 });

  const { playSong, playNext, addToQueue, toggleLike, currentSong } = usePlaybackStore();
  const { playlists, fetchPlaylists } = usePlaylistStore();

  const isLiked = currentSong?.id === song.id && currentSong ? currentSong.is_liked : song.is_liked;

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Click-away listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates so the menu does not overflow the screen bounds
  const [coords, setCoords] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      let nextX = x;
      let nextY = y;

      if (x + rect.width > winWidth) {
        nextX = winWidth - rect.width - 10;
      }
      if (y + rect.height > winHeight) {
        nextY = winHeight - rect.height - 10;
      }

      setCoords({ x: Math.max(10, nextX), y: Math.max(10, nextY) });
    }
  }, [x, y]);

  const handleMouseEnterPlaylist = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowSubmenu(true);
    if (menuRef.current) {
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const winWidth = window.innerWidth;

      let subX = menuRect.width - 2; // Position submenu just to the right of primary menu
      // If submenu overflows to the right, position it to the left
      if (menuRect.right + 200 > winWidth) {
        subX = -200 + 2;
      }

      setSubmenuCoords({
        x: subX,
        y: buttonRect.top - menuRect.top,
      });
    }
  };

  const handlePlay = () => {
    playSong(song, [song]);
    onClose();
  };

  const handlePlayNext = () => {
    playNext(song);
    onClose();
  };

  const handleAddToQueue = () => {
    addToQueue(song);
    onClose();
  };

  const handleToggleLike = async () => {
    await toggleLike(song.id);
    onClose();
  };

  const handleAddToPlaylist = async (plId: string) => {
    const success = await window.electron.db.addSongToPlaylist(plId, song.id);
    if (success) {
      alert(`"${song.title}" added to playlist.`);
    } else {
      alert(`Song is already in this playlist.`);
    }
    onClose();
  };

  const customPlaylists = playlists.filter(pl => pl.id !== 'liked-songs');

  return (
    <div
      ref={menuRef}
      style={{ top: coords.y, left: coords.x }}
      className="fixed z-50 w-52 glass-panel rounded-xl shadow-2xl p-1.5 flex flex-col outline-none border border-white/[0.04] animate-in fade-in zoom-in-95 duration-100 ease-out"
    >
      <button
        onClick={handlePlay}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        Play Now
      </button>

      <button
        onClick={handlePlayNext}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        Play Next
      </button>

      <button
        onClick={handleAddToQueue}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.02] pb-2 mb-1"
      >
        <ListMusic className="w-3.5 h-3.5" />
        Add to Queue
      </button>

      {/* Playlist submenu trigger */}
      <div 
        className="relative"
        onMouseLeave={() => setShowSubmenu(false)}
      >
        <button
          onMouseEnter={handleMouseEnterPlaylist}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left ${showSubmenu ? 'bg-white/[0.04] text-text-primary' : ''}`}
        >
          <span className="flex items-center gap-2.5">
            <PlusCircle className="w-3.5 h-3.5" />
            Add to Playlist
          </span>
          <ChevronRight className="w-3 h-3 text-text-muted" />
        </button>

        {/* Floating Submenu */}
        {showSubmenu && (
          <div
            ref={submenuRef}
            style={{ top: submenuCoords.y, left: submenuCoords.x }}
            className="absolute z-50 w-48 glass-panel rounded-xl shadow-2xl p-1.5 flex flex-col border border-white/[0.04] animate-in fade-in slide-in-from-left-2 duration-150"
          >
            <span className="px-2.5 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider select-none border-b border-white/[0.02] mb-1">
              Select Playlist
            </span>
            {customPlaylists.length === 0 ? (
              <div className="px-2.5 py-3 text-[10px] text-text-muted italic text-center">
                No custom playlists
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {customPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-accent hover:bg-white/[0.03] rounded-md transition-colors text-left truncate"
                    title={pl.name}
                  >
                    <Music className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="truncate">{pl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleToggleLike}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left"
      >
        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : ''}`} />
        {isLiked ? 'Remove from Liked' : 'Favorite Song'}
      </button>

      {playlistId && playlistId !== 'liked-songs' && onRemoveFromPlaylist && (
        <button
          onClick={() => {
            onRemoveFromPlaylist();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left mt-1 border-t border-white/[0.02] pt-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove from Playlist
        </button>
      )}
    </div>
  );
}
