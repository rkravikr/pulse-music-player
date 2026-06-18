import { useEffect, useState } from 'react';
import { 
  Flame, Music, Disc, Heart, History, Play, Pause, 
  Volume2, ArrowRight, Settings, SkipBack, SkipForward, 
  Shuffle, Repeat, LayoutDashboard 
} from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { usePlaybackStore, Song, getMediaUrl } from '../store/playbackStore';

interface LibraryStats {
  foldersCount: number;
  songsCount: number;
  albumsCount: number;
  likedCount: number;
}

export default function HomePage() {
  const { setView, showDashboardOverride, setShowDashboardOverride } = useNavigationStore();
  const [stats, setStats] = useState<LibraryStats>({
    foldersCount: 0,
    songsCount: 0,
    albumsCount: 0,
    likedCount: 0,
  });

  const [recentTracks, setRecentTracks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 3D Card Hover Tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Playback integration
  const { 
    currentSong, 
    isPlaying, 
    playSong, 
    togglePlay,
    next,
    prev,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    currentTime,
    duration,
    seek,
    toggleLike
  } = usePlaybackStore();

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const libraryStats = await window.electron.db.getLibraryStats();
      setStats(libraryStats);

      const recentList = await window.electron.db.getRecentlyPlayed();
      setRecentTracks(recentList.slice(0, 6));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleRecentPlayClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, recentTracks);
    }
  };

  // Determine greeting based on local time
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  // 3D Card Mouse Move Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Max 10 degrees tilt
    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Generate visualizer bars heights
  const visualizerBars = Array.from({ length: 22 }, (_, i) => ({
    delay: `${(i % 6) * 0.12}s`,
  }));

  // Helper values
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiked = currentSong?.is_liked || false;

  // Decide if we should render Now Playing View
  const shouldRenderNowPlaying = currentSong !== null && !showDashboardOverride;

  if (shouldRenderNowPlaying && currentSong) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-10 relative min-h-[80vh] flex flex-col justify-center select-none">
        
        {/* Top Header Controls */}
        <div className="flex justify-between items-center z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-light bg-accent/10 px-2.5 py-1 rounded-md border border-accent/10">
            Now Playing
          </span>
          <button 
            onClick={() => setShowDashboardOverride(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background-surface hover:bg-background-elevated border border-white/[0.04] text-xs font-bold text-text-secondary hover:text-text-primary transition-all active:scale-95 shadow"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Show Dashboard
          </button>
        </div>

        {/* Ambient Blur Background Glow */}
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[140px] pointer-events-none transition-all duration-1000 ${
            isPlaying ? 'opacity-100 scale-105' : 'opacity-60 scale-95'
          }`} 
        />

        {/* Main Flex 3D Workspace */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 py-6 relative z-10 flex-1">
          
          {/* Left: 3D Tilting Album artwork sleeve & sliding vinyl record */}
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={() => setIsHovered(true)}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
              transition: isHovered ? 'transform 0.05s ease-out' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
            className="relative flex items-center justify-center w-80 h-64 flex-shrink-0 cursor-pointer"
          >
            {/* The sliding vinyl disc */}
            <div 
              className={`absolute w-56 h-56 rounded-full bg-zinc-950 border border-zinc-800 shadow-2xl flex items-center justify-center transition-all duration-700 ease-out z-0 ${
                isHovered ? 'translate-x-[48%]' : 'translate-x-[26%]'
              } ${isPlaying ? 'vinyl-spin' : 'vinyl-spin vinyl-paused'}`}
              style={{
                background: 'radial-gradient(circle, #18181b 8%, #09090b 9%, #18181b 15%, #09090b 16%, #18181b 25%, #09090b 26%, #18181b 35%, #09090b 36%, #18181b 45%, #09090b 46%, #18181b 55%, #09090b 56%, #18181b 65%, #09090b 66%, #18181b 75%, #09090b 76%, #18181b 85%, #09090b 86%)'
              }}
            >
              {/* Concentric glossy groove highlights */}
              <div className="absolute inset-2 border border-white/5 rounded-full pointer-events-none" />
              <div className="absolute inset-6 border border-white/5 rounded-full pointer-events-none" />
              <div className="absolute inset-12 border border-white/5 rounded-full pointer-events-none" />
              <div className="absolute inset-16 border border-white/5 rounded-full pointer-events-none" />

              {/* Vinyl center album artwork label */}
              <div className="w-16 h-16 rounded-full border border-black/50 overflow-hidden relative flex-shrink-0">
                {currentSong.artwork_path ? (
                  <img 
                    src={getMediaUrl(currentSong.artwork_path)} 
                    alt={currentSong.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-850 flex items-center justify-center">
                    <Disc className="w-6 h-6 text-text-muted" />
                  </div>
                )}
                {/* Spindle hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-800" />
              </div>
            </div>

            {/* The Album sleeve */}
            <div className="w-56 h-56 rounded-2xl bg-zinc-900 border border-white/[0.05] shadow-2xl overflow-hidden relative z-10 flex-shrink-0 flex items-center justify-center group">
              {currentSong.artwork_path ? (
                <img 
                  src={getMediaUrl(currentSong.artwork_path)} 
                  alt={currentSong.title} 
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-white/[0.02] flex items-center justify-center">
                  <Disc className="w-20 h-20 text-text-muted" />
                </div>
              )}
              
              {/* Glowing shadow wrap */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>

          </div>

          {/* Right: Immersive metadata panels & player controls */}
          <div className="flex-1 space-y-6 w-full max-w-lg lg:max-w-none text-center lg:text-left">
            <div className="space-y-1.5">
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-text-primary leading-tight drop-shadow-md">
                {currentSong.title}
              </h2>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-text-secondary font-medium">
                <span className="text-accent-light font-bold hover:underline cursor-pointer">{currentSong.artist}</span>
                <span>&bull;</span>
                <span className="truncate">{currentSong.album}</span>
                {currentSong.genre && (
                  <>
                    <span>&bull;</span>
                    <span className="text-xs uppercase tracking-wider text-text-muted px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.03]">{currentSong.genre}</span>
                  </>
                )}
              </div>
            </div>

            {/* Visualizer Mockup */}
            <div className="py-2">
              <div className="flex items-end gap-1.5 h-12 w-full justify-center lg:justify-start opacity-70">
                {visualizerBars.map((bar, i) => (
                  <div 
                    key={i}
                    className={`w-1 bg-gradient-to-t from-accent to-accent-light rounded-full ${
                      isPlaying ? 'animate-visualizer-bar' : ''
                    }`}
                    style={{ 
                      animationDelay: bar.delay, 
                      height: isPlaying ? '100%' : '15%',
                      minHeight: '15%'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Seek Timeline */}
            <div className="space-y-2">
              <div className="flex-1 relative group flex items-center">
                <div className="absolute left-0 right-0 h-1 bg-white/[0.06] rounded-full pointer-events-none" />
                <div 
                  className="absolute left-0 h-1 bg-accent rounded-full pointer-events-none group-hover:bg-accent-light transition-colors" 
                  style={{ width: `${progressPercent}%` }}
                />
                
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full h-4 opacity-0 cursor-pointer relative z-10"
                  style={{ WebkitAppearance: 'none' }}
                />
                
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity duration-150"
                  style={{ left: `calc(${progressPercent}% - 5px)` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-text-secondary font-medium">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Play controls proxies */}
            <div className="flex items-center justify-center lg:justify-start gap-6 pt-2">
              <button 
                onClick={toggleShuffle}
                className={`transition-colors ${shuffle ? 'text-accent hover:text-accent-light' : 'text-text-muted hover:text-text-primary'}`} 
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button 
                onClick={prev}
                className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40" 
                title="Previous"
              >
                <SkipBack className="w-5.5 h-5.5 fill-current" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-accent hover:bg-accent-light text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/15" 
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                )}
              </button>
              
              <button 
                onClick={next}
                className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40" 
                title="Next"
              >
                <SkipForward className="w-5.5 h-5.5 fill-current" />
              </button>
              
              <button 
                onClick={toggleRepeat}
                className={`transition-colors relative ${repeat !== 'off' ? 'text-accent hover:text-accent-light' : 'text-text-muted hover:text-text-primary'}`} 
                title={`Repeat: ${repeat}`}
              >
                <Repeat className="w-5 h-5" />
                {repeat === 'one' && (
                  <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-accent text-background rounded-full w-2.5 h-2.5 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>

              <button 
                onClick={() => toggleLike(currentSong.id)}
                className={`transition-colors ml-4 ${
                  isLiked 
                    ? 'text-rose-500 hover:text-rose-400' 
                    : 'text-text-secondary hover:text-rose-500'
                }`}
                title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // Fallback to Standard Dashboard Layout
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      
      {/* Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-accent/15 to-accent-light/5 border border-white/[0.04] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-light bg-accent/10 px-2.5 py-1 rounded-md border border-accent/10">
            Welcome Back
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary mt-1.5">
            {getGreeting()}, Listener
          </h2>
          <p className="text-sm text-text-secondary max-w-md">
            Ready to explore your local music collection? Experience premium offline audio playback built with Pulse.
          </p>
        </div>
        
        {/* If a song is loaded in standby, we show a button to switch to Now Playing */}
        {currentSong ? (
          <button 
            onClick={() => setShowDashboardOverride(false)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-light text-background text-xs font-bold transition-all shadow-md active:scale-95 z-10 flex-shrink-0"
          >
            <Disc className="w-4 h-4 animate-spin-slow" />
            View Now Playing
          </button>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent to-accent-light flex items-center justify-center shadow-lg shadow-accent/25 relative z-10 flex-shrink-0 animate-pulse">
            <Flame className="w-8 h-8 text-background font-bold" />
          </div>
        )}

        {/* Ambient design glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[60px] pointer-events-none" />
      </div>

      {/* Grid: Quick Access & Library stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Access */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-text-primary">Quick Shortcuts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div 
              onClick={() => setView('songs')}
              className="p-4 rounded-2xl bg-background-surface hover:bg-background-elevated transition-all border border-white/[0.02] cursor-pointer group hover:scale-[1.02] hover:shadow-lg shadow flex flex-col items-center text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-background transition-all">
                <Music className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-text-primary">All Songs</span>
            </div>

            <div 
              onClick={() => setView('albums')}
              className="p-4 rounded-2xl bg-background-surface hover:bg-background-elevated transition-all border border-white/[0.02] cursor-pointer group hover:scale-[1.02] hover:shadow-lg shadow flex flex-col items-center text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-light/15 text-accent-light flex items-center justify-center group-hover:bg-accent-light group-hover:text-background transition-all">
                <Disc className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-text-primary">Albums</span>
            </div>

            <div 
              onClick={() => setView('liked-songs')}
              className="p-4 rounded-2xl bg-background-surface hover:bg-background-elevated transition-all border border-white/[0.02] cursor-pointer group hover:scale-[1.02] hover:shadow-lg shadow flex flex-col items-center text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                <Heart className="w-5 h-5 fill-rose-500/10 group-hover:fill-current" />
              </div>
              <span className="font-bold text-xs text-text-primary">Favorites</span>
            </div>

            <div 
              onClick={() => setView('settings')}
              className="p-4 rounded-2xl bg-background-surface hover:bg-background-elevated transition-all border border-white/[0.02] cursor-pointer group hover:scale-[1.02] hover:shadow-lg shadow flex flex-col items-center text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-text-secondary flex items-center justify-center group-hover:bg-text-primary group-hover:text-background transition-all">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-text-primary">Settings</span>
            </div>
          </div>
        </div>

        {/* Library Stats */}
        <div className="p-5 rounded-2xl bg-background-surface border border-white/[0.02] shadow-xl space-y-4">
          <h3 className="text-base font-bold text-text-primary">Library Status</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.02]">
              <span className="text-text-secondary">Directories</span>
              <span className="font-bold text-accent-light">{loading ? '--' : `${stats.foldersCount} folders`}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.02]">
              <span className="text-text-secondary">Scanned Tracks</span>
              <span className="font-bold text-accent-light">{loading ? '--' : `${stats.songsCount} tracks`}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.02]">
              <span className="text-text-secondary">Unique Albums</span>
              <span className="font-bold text-accent-light">{loading ? '--' : `${stats.albumsCount} albums`}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">Likes</span>
              <span className="font-bold text-rose-400">{loading ? '--' : `${stats.likedCount} songs`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Played Widgets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            Recently Played
          </h3>
          {recentTracks.length > 0 && (
            <button 
              onClick={() => setView('recently-played')}
              className="text-xs font-bold text-text-secondary hover:text-accent flex items-center gap-1 transition-colors group"
            >
              See Full History
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-secondary text-xs">
            Loading tracks...
          </div>
        ) : recentTracks.length === 0 ? (
          <div className="py-12 text-center text-text-secondary bg-background-surface rounded-2xl border border-white/[0.02] shadow-xl">
            <History className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-text-primary text-xs">No playback history yet</p>
            <p className="text-[10px] text-text-muted mt-1 max-w-xs mx-auto">
              Any music files you play will be listed here for quick access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentTracks.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={`${song.id}-${index}`}
                  onDoubleClick={() => playSong(song, recentTracks)}
                  className={`flex items-center gap-3 p-3 rounded-2xl bg-background-surface hover:bg-background-elevated border border-white/[0.02] hover:border-white/[0.06] cursor-pointer group transition-all relative overflow-hidden shadow ${
                    isCurrent ? 'bg-accent/5 border-accent/20' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-background-elevated border border-white/[0.04] flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner relative">
                    {song.artwork_path ? (
                      <img 
                        src={getMediaUrl(song.artwork_path)} 
                        alt={song.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-4 h-4 text-text-muted" />
                    )}

                    {/* Hover Play Button Overlay */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecentPlayClick(song);
                      }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center shadow">
                        {isCurrent && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden flex-1">
                    <p className={`font-bold text-xs truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`} title={song.title}>
                      {song.title}
                    </p>
                    <p className="text-[10px] text-text-secondary truncate mt-0.5" title={song.artist}>
                      {song.artist}
                    </p>
                  </div>

                  {isCurrent && isPlaying && (
                    <div className="pr-1 flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-accent animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
