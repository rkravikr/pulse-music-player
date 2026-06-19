import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, ListMusic, Heart, Disc, X, Settings } from 'lucide-react';
import { usePlaybackStore, getMediaUrl } from '../store/playbackStore';
import { useNavigationStore } from '../store/navigationStore';
import QueuePanel from './QueuePanel';

interface RightPlayerBarProps {
  onQueueToggle?: () => void;
  isQueueOpen?: boolean;
}

export default function RightPlayerBar({ onQueueToggle, isQueueOpen }: RightPlayerBarProps) {
  const { setView, setShowDashboardOverride } = useNavigationStore();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
  } = usePlaybackStore();

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seek(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <div className="w-full h-full flex flex-col p-6 pt-8 select-none relative overflow-hidden">
      
      {/* Top Header / Profile Area */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <button 
          onClick={onQueueToggle}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${isQueueOpen ? 'bg-accent text-background' : 'bg-background-elevated text-text-secondary hover:text-white hover:bg-white/10'}`} 
          title="Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div 
          onClick={() => setView('settings')}
          className="flex items-center gap-3 cursor-pointer group hover:bg-white/[0.04] p-1.5 pr-4 rounded-full transition-colors border border-transparent hover:border-white/[0.05]"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            LU
          </div>
          <span className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">Local User</span>
        </div>
      </div>

      {/* Queue Panel Space (Dynamic) */}
      {isQueueOpen ? (
        <div className="flex-1 overflow-hidden flex flex-col mb-6 bg-background-surface rounded-2xl border border-white/[0.05] shadow-lg">
          <QueuePanel onClose={onQueueToggle!} embedded={true} />
        </div>
      ) : (
        <div className="flex-1" /> // Spacer
      )}

      {/* Main Player Card */}
      <div className="w-full bg-[#1A1A20] rounded-[24px] shadow-2xl flex flex-col shrink-0 overflow-hidden border border-white/[0.03]">
        
        {/* Top Part of Card: Album Art, Info, Progress */}
        <div className="p-6 pb-5 flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold tracking-wider text-text-secondary uppercase">Player</span>
            <button 
              onClick={onQueueToggle}
              className="text-text-muted hover:text-white transition-colors"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>

          {/* Landscape Album Art Display */}
          <div 
            onClick={() => {
              if (currentSong) {
                setView('home');
                setShowDashboardOverride(false);
              }
            }}
            className={`w-full aspect-[4/3] rounded-[16px] bg-[#141418] shadow-inner flex items-center justify-center overflow-hidden mb-5 relative ${currentSong ? 'cursor-pointer group' : ''}`}
          >
            {currentSong?.artwork_path ? (
              <img 
                src={getMediaUrl(currentSong.artwork_path)} 
                alt={currentSong.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#1E1E24] to-[#25252C] flex items-center justify-center">
                <Disc className={`w-12 h-12 text-[#3A3A45] ${isPlaying ? 'animate-spin-slow' : ''}`} />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="w-full text-center mb-5 px-2 relative">
            <div className="flex flex-col items-center overflow-hidden">
              <h4 className="text-lg font-extrabold text-white truncate w-full" title={currentSong?.title || 'Not Playing'}>
                {currentSong?.title || 'Not Playing'}
              </h4>
              <p className="text-sm font-medium text-text-secondary truncate mt-0.5 w-full" title={currentSong?.artist || 'No track selected'}>
                {currentSong?.artist || 'Select a song to start listening'}
              </p>
            </div>
          </div>

          {/* Progress timeline */}
          <div className="w-full">
            <div className="flex-1 relative group flex items-center h-4 mb-1">
              <div className="absolute left-0 right-0 h-1.5 bg-white/[0.08] rounded-full pointer-events-none" />
              <div 
                className="absolute left-0 h-1.5 bg-white rounded-full pointer-events-none transition-all duration-100 ease-linear" 
                style={{ width: `${progressPercent}%` }}
              />
              
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                disabled={!currentSong}
                className="w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed relative z-10"
                style={{ WebkitAppearance: 'none' }}
              />
              
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-transform duration-100 ease-linear"
                style={{ left: `calc(${progressPercent}% - 7px)` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-muted font-bold tracking-wide">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Controls Area (Solid Blue matching reference) */}
        <div className="bg-[#5C6BC0] px-6 py-5 flex flex-col gap-4">
          
          {/* Playback Buttons */}
          <div className="flex justify-between items-center text-white/90">
            <button 
              onClick={toggleShuffle}
              className={`transition-colors ${shuffle ? 'text-white drop-shadow-md' : 'hover:text-white opacity-70 hover:opacity-100'}`} 
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            
            <button 
              onClick={prev}
              className="hover:text-white hover:scale-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed" 
              title="Previous"
              disabled={!currentSong}
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            
            <button 
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-white text-[#5C6BC0] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed" 
              title={isPlaying ? "Pause" : "Play"}
              disabled={!currentSong}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>
            
            <button 
              onClick={next}
              className="hover:text-white hover:scale-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed" 
              title="Next"
              disabled={!currentSong}
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            
            <button 
              onClick={toggleRepeat}
              className={`transition-colors relative ${repeat !== 'off' ? 'text-white drop-shadow-md' : 'hover:text-white opacity-70 hover:opacity-100'}`} 
              title={`Repeat: ${repeat}`}
            >
              <Repeat className="w-4 h-4" />
              {repeat === 'one' && (
                <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-white text-[#5C6BC0] rounded-full w-3 h-3 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Volume Control Row (White variant for the blue box) */}
          <div className="flex items-center gap-3 text-white/90">
            <button 
              onClick={toggleMute}
              className="hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            
            <div className="flex-1 relative flex items-center group h-3">
              <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full pointer-events-none" />
              <div 
                className="absolute left-0 h-1 bg-white rounded-full pointer-events-none" 
                style={{ width: `${volumePercent}%` }}
              />
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-full opacity-0 cursor-pointer relative z-10"
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
