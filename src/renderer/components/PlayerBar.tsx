import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, ListMusic, Heart, Disc } from 'lucide-react';
import { usePlaybackStore, getMediaUrl } from '../store/playbackStore';
import { useNavigationStore } from '../store/navigationStore';

interface PlayerBarProps {
  onQueueToggle?: () => void;
  isQueueOpen?: boolean;
}

export default function PlayerBar({ onQueueToggle, isQueueOpen }: PlayerBarProps) {
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

  // Percentages for styling the custom range sliders
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <div className="h-20 bg-background-surface border-t border-white/[0.02] flex items-center justify-between px-5 select-none z-20 relative">
      {/* Left: Track Info */}
      <div className="flex items-center gap-3 w-[30%] min-w-[200px]">
        <div 
          onClick={() => {
            if (currentSong) {
              setView('home');
              setShowDashboardOverride(false);
            }
          }}
          className={`flex items-center gap-3 overflow-hidden ${currentSong ? 'cursor-pointer group/info' : ''}`}
        >
          <div className="w-12 h-12 rounded-lg bg-background-elevated border border-white/[0.04] flex items-center justify-center overflow-hidden shadow-md flex-shrink-0 relative group-hover/info:border-accent/30 transition-colors">
            {currentSong?.artwork_path ? (
              <img 
                src={getMediaUrl(currentSong.artwork_path)} 
                alt={currentSong.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-white/[0.02] flex items-center justify-center">
                <Disc className={`w-6 h-6 text-text-muted ${isPlaying ? 'animate-spin-slow' : ''}`} />
              </div>
            )}
          </div>
          
          <div className="overflow-hidden max-w-[150px]">
            <h4 className="text-sm font-bold text-text-primary truncate group-hover/info:text-accent transition-colors" title={currentSong?.title || 'Not Playing'}>
              {currentSong?.title || 'Not Playing'}
            </h4>
            <p className="text-xs text-text-secondary truncate mt-0.5" title={currentSong?.artist || 'No track selected'}>
              {currentSong?.artist || 'No track selected'}
            </p>
          </div>
        </div>
        
        {currentSong && (
          <button 
            onClick={() => toggleLike(currentSong.id)}
            className={`transition-colors ml-1.5 flex-shrink-0 ${
              currentSong.is_liked 
                ? 'text-rose-500 hover:text-rose-400' 
                : 'text-text-secondary hover:text-rose-500'
            }`}
            title={currentSong.is_liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
          >
            <Heart className={`w-4 h-4 ${currentSong.is_liked ? 'fill-rose-500' : ''}`} />
          </button>
        )}
      </div>

      {/* Center: Controls & Timeline */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-[45%]">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button 
            onClick={toggleShuffle}
            className={`transition-colors ${shuffle ? 'text-accent hover:text-accent-light' : 'text-text-muted hover:text-text-primary'}`} 
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          
          <button 
            onClick={prev}
            className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
            title="Previous"
            disabled={!currentSong}
          >
            <SkipBack className="w-4.5 h-4.5 fill-current" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-text-primary text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed" 
            title={isPlaying ? "Pause" : "Play"}
            disabled={!currentSong}
          >
            {isPlaying ? (
              <Pause className="w-4.5 h-4.5 fill-current" />
            ) : (
              <Play className="w-4.5 h-4.5 fill-current translate-x-0.5" />
            )}
          </button>
          
          <button 
            onClick={next}
            className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
            title="Next"
            disabled={!currentSong}
          >
            <SkipForward className="w-4.5 h-4.5 fill-current" />
          </button>
          
          <button 
            onClick={toggleRepeat}
            className={`transition-colors relative ${repeat !== 'off' ? 'text-accent hover:text-accent-light' : 'text-text-muted hover:text-text-primary'}`} 
            title={`Repeat: ${repeat}`}
          >
            <Repeat className="w-4 h-4" />
            {repeat === 'one' && (
              <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-accent text-background rounded-full w-3 h-3 flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        {/* Seek timeline */}
        <div className="w-full flex items-center gap-3 text-[10px] text-text-secondary font-medium">
          <span className="w-8 text-right select-none">{formatDuration(currentTime)}</span>
          
          <div className="flex-1 relative group flex items-center">
            {/* Custom styled slider track backgrounds */}
            <div className="absolute left-0 right-0 h-1 bg-white/[0.08] rounded-full pointer-events-none" />
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
              disabled={!currentSong}
              className="w-full h-4 opacity-0 cursor-pointer disabled:cursor-not-allowed relative z-10"
              style={{ WebkitAppearance: 'none' }}
            />
            
            {/* Slider dot thumb styling proxy */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity duration-150"
              style={{ left: `calc(${progressPercent}% - 5px)` }}
            />
          </div>
          
          <span className="w-8 text-left select-none">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Right: Sound & Queue Panel Actions */}
      <div className="flex items-center justify-end gap-4 w-[30%] min-w-[200px]">
        <button 
          onClick={onQueueToggle}
          className={`transition-colors ${isQueueOpen ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`} 
          title="Queue"
        >
          <ListMusic className="w-4.5 h-4.5" />
        </button>
        
        <div className="flex items-center gap-2 max-w-[130px] w-full group">
          <button 
            onClick={toggleMute}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <div className="flex-1 relative flex items-center">
            <div className="absolute left-0 right-0 h-1 bg-white/[0.08] rounded-full pointer-events-none" />
            <div 
              className="absolute left-0 h-1 bg-text-secondary rounded-full pointer-events-none group-hover:bg-accent transition-colors" 
              style={{ width: `${volumePercent}%` }}
            />
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-4 opacity-0 cursor-pointer relative z-10"
              style={{ WebkitAppearance: 'none' }}
            />
            
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow pointer-events-none transition-opacity duration-150"
              style={{ left: `calc(${volumePercent}% - 5px)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
