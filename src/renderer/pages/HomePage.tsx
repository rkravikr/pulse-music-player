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
  const [topArtists, setTopArtists] = useState<{artist: string, trackCount: number}[]>([]);
  const [genres, setGenres] = useState<{genre: string, trackCount: number}[]>([]);
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
      const [libraryStats, recentList, artistsList, genresList] = await Promise.all([
        window.electron.db.getLibraryStats(),
        window.electron.db.getRecentlyPlayed(),
        window.electron.db.getTopArtists(),
        window.electron.db.getGenres()
      ]);
      setStats(libraryStats);
      setRecentTracks(recentList.slice(0, 6));
      setTopArtists(artistsList);
      setGenres(genresList);
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
      
      {/* Hero Banner Section */}
      <div className="relative w-full h-[340px] rounded-[32px] overflow-hidden flex flex-col justify-center px-12 border border-white/[0.02]">
        
        {/* Background Image with blur & fade gradient */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#121216] via-[#121216]/80 to-transparent z-10" />
          <img 
            src={`/Banners/banner_${heroImageIndex}.jpg`} 
            alt="Hero Banner" 
            className="w-full h-full object-cover object-right opacity-60 blur-[2px]"
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-20 max-w-2xl">
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase mb-3 block">
            Jump Back In
          </span>
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
            Featured Music
          </h1>
          <p className="text-sm font-medium text-text-secondary mb-8">
            {currentSong ? `${currentSong.title} • ${currentSong.artist}` : 'Various Artists • Local Library'}
          </p>
          
          <div className="flex items-center gap-4">
            <button 
              <Heart className={`w-5 h-5 ${recentTracks[0]?.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Artists Horizontal List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary">Top Artists</h3>
          <button 
            onClick={() => setView('artists')}
            className="text-xs font-bold text-text-secondary hover:text-white transition-colors"
          >
            See all
          </button>
        </div>
        
        {loading ? (
          <div className="flex gap-4 overflow-x-hidden opacity-50">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-28 h-36 bg-background-surface rounded-2xl animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : topArtists.length === 0 ? (
          <div className="text-sm text-text-muted">No artists found in your library yet.</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {topArtists.map((artist, idx) => {
              // Generate a consistent dark color from the artist name string
              const colors = ['from-blue-600 to-indigo-800', 'from-emerald-500 to-teal-700', 'from-rose-500 to-pink-700', 'from-amber-500 to-orange-700', 'from-purple-500 to-fuchsia-700', 'from-cyan-500 to-blue-700'];
              const colorHash = artist.artist.length % colors.length;
              
              // Get initials for Avatar
              const initials = artist.artist.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

              return (
                <div key={idx} className="flex flex-col gap-2 w-28 flex-shrink-0 group cursor-pointer" onClick={() => setView('artists')}>
                  <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${colors[colorHash]} flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-transform duration-300`}>
                    <span className="text-3xl font-black text-white/80 drop-shadow-md tracking-tighter">{initials}</span>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm text-text-primary truncate" title={artist.artist}>{artist.artist}</p>
                    <p className="text-xs text-text-muted">{artist.trackCount} Tracks</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Genres and Top Charts Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Genres Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">Genres</h3>
            <button className="text-xs font-bold text-text-secondary hover:text-white transition-colors">See all</button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-16 bg-background-surface rounded-xl animate-pulse" />)
            ) : genres.length === 0 ? (
              <div className="text-sm text-text-muted col-span-2">No genres found.</div>
            ) : (
              genres.slice(0, 8).map((g, idx) => {
                const genreColors = [
                  'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 
                  'bg-purple-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600'
                ];
                const bg = genreColors[idx % genreColors.length];
                return (
                  <div 
                    key={idx} 
                    className={`${bg} h-16 rounded-xl flex items-center justify-center p-3 cursor-pointer hover:opacity-90 transition-opacity shadow-md`}
                  >
                    <span className="font-bold text-sm text-white text-center leading-tight drop-shadow-md">
                      {g.genre}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recently Played (Acting as Top Charts) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              Recently Played
            </h3>
            {recentTracks.length > 0 && (
              <button 
                onClick={() => setView('recently-played')}
                className="text-xs font-bold text-text-secondary hover:text-white transition-colors"
              >
                See all
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
            <div className="flex flex-col gap-2">
              {recentTracks.map((song, index) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div 
                    key={`${song.id}-${index}`}
                    onDoubleClick={() => playSong(song, recentTracks)}
                    className={`flex items-center justify-between p-3 rounded-2xl hover:bg-background-elevated border border-transparent hover:border-white/[0.04] cursor-pointer group transition-all relative overflow-hidden ${
                      isCurrent ? 'bg-accent/5 border-accent/20' : 'bg-background-surface/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      {/* Number Index */}
                      <span className="text-xs font-bold text-text-muted w-4 text-center">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      
                      <div className="w-10 h-10 rounded-lg bg-background-elevated border border-white/[0.04] flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm relative">
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
                          {isCurrent && isPlaying ? (
                            <Pause className="w-4 h-4 fill-white text-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="overflow-hidden flex-1">
                        <p className={`font-bold text-sm truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`} title={song.title}>
                          {song.title}
                        </p>
                        <p className="text-xs text-text-secondary truncate mt-0.5" title={song.artist}>
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pl-4">
                      {isCurrent && isPlaying ? (
                        <Volume2 className="w-4 h-4 text-accent animate-pulse" />
                      ) : (
                        <span className="text-xs font-medium text-text-muted group-hover:text-text-secondary transition-colors">
                          {formatTime(song.duration)}
                        </span>
                      )}
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                        className={`w-8 h-8 rounded-full bg-background flex items-center justify-center border border-white/[0.05] transition-all hover:border-white/[0.1] active:scale-95 ${song.is_liked ? 'border-rose-500/30' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${song.is_liked ? 'fill-rose-500 text-rose-500' : 'text-text-muted hover:text-white'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
