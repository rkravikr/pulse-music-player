import { useEffect, useState } from 'react';
import { Disc, Clock, ArrowLeft, Play, Pause, Volume2, Heart } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { usePlaybackStore, Song, getMediaUrl } from '../store/playbackStore';
import ContextMenu from '../components/ContextMenu';

interface AlbumDetailPageProps {
  albumId: string | null;
}

export default function AlbumDetailPage({ albumId }: AlbumDetailPageProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song } | null>(null);
  const { setView } = useNavigationStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Playback store integration
  const { currentSong, isPlaying, playSong, togglePlay, toggleLike } = usePlaybackStore();

  // Parse album details
  const [albumName, artistName] = albumId ? albumId.split('|||') : ['Unknown Album', 'Unknown Artist'];

  useEffect(() => {
    const fetchAlbumSongs = async () => {
      if (!albumId) return;
      try {
        setLoading(true);
        const list = await window.electron.db.getAlbumSongs(albumName, artistName);
        setSongs(list);
      } catch (err) {
        console.error('Failed to fetch album songs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbumSongs();
  }, [albumId]);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const getAlbumDuration = () => {
    const totalSec = songs.reduce((sum, song) => sum + song.duration, 0);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const handleRowPlayClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  };

  const handlePlayAlbumHeader = () => {
    if (songs.length > 0) {
      // If the currently loaded song is from this album, toggle it. Else play first track.
      const isAlbumPlaying = songs.some(s => s.id === currentSong?.id);
      if (isAlbumPlaying) {
        togglePlay();
      } else {
        playSong(songs[0], songs);
      }
    }
  };

  // Find the first song containing artwork to display as the album cover
  const albumArtwork = songs.find(s => s.artwork_path !== null)?.artwork_path || null;
  const isCurrentAlbumPlaying = songs.some(s => s.id === currentSong?.id) && isPlaying;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Back button */}
      <button 
        onClick={() => setView('albums')}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Albums
      </button>

      {loading ? (
        <div className="py-20 text-center text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 mx-auto mb-4" />
          <p className="text-sm">Loading tracks...</p>
        </div>
      ) : (
        <>
          {/* Album Banner */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-6 border-b border-white/[0.04] relative">
            <div className="w-48 h-48 rounded-2xl bg-background-elevated border border-white/[0.05] flex items-center justify-center overflow-hidden shadow-2xl flex-shrink-0 relative group">
              {albumArtwork ? (
                <img 
                  src={getMediaUrl(albumArtwork)} 
                  alt={albumName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-accent/15 to-white/[0.02] flex items-center justify-center">
                  <Disc className="w-16 h-16 text-text-muted" />
                </div>
              )}
              {/* Play Overlay */}
              <div 
                onClick={handlePlayAlbumHeader}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-accent text-background flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                  {isCurrentAlbumPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-center md:text-left space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-widest text-accent-light bg-accent/10 px-2.5 py-1 rounded-md border border-accent/10">
                Album
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary leading-tight">
                {albumName}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-text-secondary font-medium">
                <span className="text-text-primary font-bold hover:underline cursor-pointer">{artistName}</span>
                <span>&bull;</span>
                <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {getAlbumDuration()}
                </span>
              </div>
            </div>
          </div>

          {/* Tracklist Table */}
          <div className="w-full bg-background-surface rounded-2xl border border-white/[0.02] overflow-hidden shadow-xl mt-6">
            <div className="grid grid-cols-12 px-5 py-3 bg-white/[0.01] border-b border-white/[0.02] text-xs font-bold text-text-secondary uppercase tracking-wider select-none">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-9">Title</div>
              <div className="col-span-1 text-center">Like</div>
              <div className="col-span-1 text-right">Time</div>
            </div>

            <div className="divide-y divide-white/[0.01]">
              {songs.map((song, index) => {
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
                    onDoubleClick={() => playSong(song, songs)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        song,
                      });
                    }}
                    className={`grid grid-cols-12 px-5 py-3 items-center text-sm transition-colors group ${
                      isCurrent 
                        ? 'bg-accent/5 text-accent hover:bg-accent/10' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.01]'
                    }`}
                  >
                    <div className="col-span-1 text-center text-text-muted font-medium text-xs flex items-center justify-center h-6">
                      <span className="group-hover:hidden flex items-center">
                        {isCurrent && isPlaying ? (
                          <Volume2 className="w-4 h-4 text-accent animate-pulse" />
                        ) : (
                          song.track_number || index + 1
                        )}
                      </span>
                      <button 
                        onClick={() => handleRowPlayClick(song)}
                        className="hidden group-hover:flex items-center text-text-primary hover:text-accent transition-colors"
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    </div>
                    <div className="col-span-9 pr-4">
                      <p className={`font-semibold text-sm truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`}>{song.title}</p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">{song.artist}</p>
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      <button 
                        onClick={handleToggleLikeClick}
                        className={`transition-colors ${
                          isLiked 
                            ? 'text-rose-500 hover:text-rose-400' 
                            : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-rose-500'
                        }`}
                        title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
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
        </>
      )}

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
