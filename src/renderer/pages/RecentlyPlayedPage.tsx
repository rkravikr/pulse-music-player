import { useEffect, useState } from 'react';
import { History, Play, Pause, Music, Heart, Volume2, ArrowLeft } from 'lucide-react';
import { usePlaybackStore, Song, getMediaUrl } from '../store/playbackStore';
import { useNavigationStore } from '../store/navigationStore';
import ContextMenu from '../components/ContextMenu';

export default function RecentlyPlayedPage() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song } | null>(null);
  const { setView } = useNavigationStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  // Playback integration
  const { currentSong, isPlaying, playSong, togglePlay, toggleLike } = usePlaybackStore();

  const fetchRecentlyPlayed = async () => {
    try {
      setLoading(true);
      const list = await window.electron.db.getRecentlyPlayed();
      setSongs(list);
    } catch (err) {
      console.error('Failed to fetch recently played songs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentlyPlayed();
  }, []);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleRowPlayClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  };

  const handleToggleLikeClick = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLike(songId);
    setSongs(prev => prev.map(s => s.id === songId ? { ...s, is_liked: !s.is_liked } : s));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Back Button */}
      <button 
        onClick={() => setView('home')}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex items-center gap-4 pb-6 border-b border-white/[0.04]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent/20 to-accent-light/10 border border-white/[0.05] flex items-center justify-center shadow-lg">
          <History className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Recently Played</h2>
          <p className="text-xs text-text-secondary mt-1">History of your last 50 tracks</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 mx-auto mb-4" />
          <p className="text-sm">Reading history...</p>
        </div>
      ) : songs.length === 0 ? (
        <div className="py-20 text-center text-text-secondary bg-background-surface rounded-2xl border border-white/[0.02] shadow-xl">
          <History className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="font-semibold text-text-primary">No playback history</p>
          <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
            Songs you play will show up here.
          </p>
        </div>
      ) : (
        <div className="w-full bg-background-surface rounded-2xl border border-white/[0.02] overflow-hidden shadow-xl">
          <div className="grid grid-cols-12 px-5 py-3 bg-white/[0.01] border-b border-white/[0.02] text-xs font-bold text-text-secondary uppercase tracking-wider select-none">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6">Title</div>
            <div className="col-span-4">Album</div>
            <div className="col-span-1 text-center">Like</div>
            <div className="col-span-1 text-right pr-6">Time</div>
          </div>

          <div className="divide-y divide-white/[0.01] max-h-[60vh] overflow-y-auto">
            {songs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              const isLiked = isCurrent && currentSong ? currentSong.is_liked : song.is_liked;

              return (
                <div 
                  key={`${song.id}-${index}`} 
                  onDoubleClick={() => playSong(song, songs)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      song,
                    });
                  }}
                  className={`grid grid-cols-12 px-5 py-2.5 items-center text-sm transition-colors group ${
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
                        index + 1
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

                  <div className="col-span-6 flex items-center gap-3 pr-4">
                    <div className="w-10 h-10 rounded-lg bg-background-elevated border border-white/[0.04] flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
                      {song.artwork_path ? (
                        <img 
                          src={getMediaUrl(song.artwork_path)} 
                          alt={song.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className={`font-semibold text-sm truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`}>{song.title}</p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="col-span-4 truncate pr-4">{song.album}</div>

                  <div className="col-span-1 flex justify-center">
                    <button 
                      onClick={(e) => handleToggleLikeClick(song.id, e)}
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
