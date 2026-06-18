import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

export function getMediaUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `media://local${cleanPath}`;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  track_number: number | null;
  file_path: string;
  artwork_path: string | null;
  date_added: string;
  is_liked?: boolean;
}

export type RepeatState = 'off' | 'one' | 'all';

interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatState;
  queue: Song[];
  originalQueue: Song[]; // Keeps chronological queue order
  queueIndex: number;

  // Actions
  initAudio: () => void;
  playSong: (song: Song, newQueue?: Song[]) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  handleSongEnded: () => void;
  removeFromQueue: (songId: string) => void;
  clearQueue: () => void;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  reorderQueue: (newQueue: Song[]) => void;
  restoreSession: () => Promise<void>;
  toggleLike: (songId: string) => Promise<void>;
}

// Single audio element for the lifetime of the application
let audio: HTMLAudioElement | null = null;
let lastSavedTime = 0;
let fadingOut = false; // prevent stacking crossfade calls

// Fade audio volume from `from` to `to` over `durationMs` using rAF
function fadeAudioVolume(from: number, to: number, durationMs: number, onDone?: () => void) {
  if (!audio) { onDone?.(); return; }
  const startTime = performance.now();
  const tick = (now: number) => {
    if (!audio) { onDone?.(); return; }
    const elapsed = now - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    audio.volume = from + (to - from) * t;
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      audio.volume = to;
      onDone?.();
    }
  };
  requestAnimationFrame(tick);
}

// Helper to save playback state to the database
const saveSession = async (state: PlaybackState) => {
  try {
    const session = {
      currentSongId: state.currentSong ? state.currentSong.id : null,
      currentTime: state.currentTime,
      volume: state.volume,
      shuffle: state.shuffle,
      repeat: state.repeat,
      queueIds: state.queue.map(s => s.id),
      queueIndex: state.queueIndex,
    };
    await window.electron.db.savePlaybackSession(session);
  } catch (err) {
    console.error('[Playback] Failed to auto-save session:', err);
  }
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  shuffle: false,
  repeat: 'off',
  queue: [],
  originalQueue: [],
  queueIndex: -1,

  initAudio: () => {
    if (audio) return; // Already initialized
    audio = new Audio();
    audio.volume = get().volume;

    // Synchronize HTML5 Audio state to Zustand
    audio.addEventListener('timeupdate', () => {
      if (audio) {
        const curTime = Math.floor(audio.currentTime);
        set({ currentTime: curTime });
        
        // Save current time periodically (every 5 seconds) to avoid database hammering
        if (Math.abs(curTime - lastSavedTime) >= 5) {
          lastSavedTime = curTime;
          saveSession(get());
        }
      }
    });

    audio.addEventListener('durationchange', () => {
      if (audio) {
        set({ duration: Math.round(audio.duration || 0) });
      }
    });

    audio.addEventListener('ended', () => {
      get().handleSongEnded();
    });

    audio.addEventListener('play', () => {
      set({ isPlaying: true });
    });

    audio.addEventListener('pause', () => {
      set({ isPlaying: false });
    });
  },

  playSong: (song, newQueue) => {
    get().initAudio();
    if (!audio) return;

    let activeQueue = newQueue || get().queue;
    let originalQ = newQueue ? [...newQueue] : get().originalQueue;

    // If new queue is loaded, handle shuffle setting
    if (newQueue && get().shuffle) {
      // Create shuffled queue keeping the selected song at index 0
      const remainingSongs = newQueue.filter(s => s.id !== song.id);
      for (let i = remainingSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
      }
      activeQueue = [song, ...remainingSongs];
    }

    const idx = activeQueue.findIndex(s => s.id === song.id);

    set({
      currentSong: song,
      queue: activeQueue,
      originalQueue: originalQ,
      queueIndex: idx !== -1 ? idx : 0,
      currentTime: 0,
    });

    // Set source using custom media scheme
    audio.src = getMediaUrl(song.file_path);
    audio.play()
      .then(() => {
        saveSession(get());
        window.electron.db.addRecentlyPlayed(song.id).catch(err => {
          console.error('[Playback] Failed to log recently played:', err);
        });
        // Fire track change OS notification if enabled
        try {
          if (useSettingsStore.getState().showTrackNotifications) {
            window.electron.db.showTrackNotification(song.title, song.artist, song.artwork_path);
          }
        } catch { /* not loaded */ }
      })
      .catch(err => {
        console.error('[Playback] Failed to start play:', err);
      });
  },

  play: () => {
    if (audio && get().currentSong) {
      audio.play().catch(err => console.error('[Playback] Play error:', err));
    }
  },

  pause: () => {
    if (audio) {
      audio.pause();
      saveSession(get()); // Save exact time on pause
    }
  },

  togglePlay: () => {
    if (!get().currentSong) return;
    if (get().isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  next: () => {
    const { queue, queueIndex, repeat, volume } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        get().pause();
        if (audio) audio.currentTime = 0;
        return;
      }
    }

    const nextSong = queue[nextIndex];
    if (!nextSong) return;

    // Crossfade support
    let crossfade = 0;
    try { crossfade = useSettingsStore.getState().crossfadeDuration; } catch { /* not loaded */ }

    if (crossfade > 0 && audio && !fadingOut) {
      fadingOut = true;
      fadeAudioVolume(audio.volume, 0, crossfade * 1000, () => {
        fadingOut = false;
        if (audio) audio.volume = volume; // reset before next track fades in
        get().playSong(nextSong);
        // Fade in
        if (audio) {
          audio.volume = 0;
          fadeAudioVolume(0, volume, crossfade * 600);
        }
      });
    } else {
      get().playSong(nextSong);
    }
  },

  prev: () => {
    const { queue, queueIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If a song is past 3 seconds, previous restarts the song
    if (currentTime > 3) {
      if (audio) {
        audio.currentTime = 0;
        set({ currentTime: 0 });
        saveSession(get());
      }
      return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      if (get().repeat === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0; // Remain on first song
      }
    }

    const prevSong = queue[prevIndex];
    if (prevSong) {
      get().playSong(prevSong);
    }
  },

  seek: (time) => {
    if (audio && get().currentSong) {
      audio.currentTime = time;
      set({ currentTime: time });
      saveSession(get());
    }
  },

  setVolume: (vol) => {
    const safeVol = Math.max(0, Math.min(1, vol));
    set({ volume: safeVol, isMuted: safeVol === 0 });
    if (audio) {
      audio.volume = safeVol;
      audio.muted = safeVol === 0;
    }
    saveSession(get());
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    set({ isMuted: nextMuted });
    if (audio) {
      audio.muted = nextMuted;
    }
    saveSession(get());
  },

  toggleShuffle: () => {
    const { shuffle, queue, currentSong, originalQueue } = get();
    const nextShuffle = !shuffle;

    if (!currentSong) {
      set({ shuffle: nextShuffle });
      saveSession(get());
      return;
    }

    let nextQueue = [...queue];
    let nextIndex = nextQueue.findIndex(s => s.id === currentSong.id);

    if (nextShuffle) {
      const remainingSongs = originalQueue.filter(s => s.id !== currentSong.id);
      for (let i = remainingSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
      }
      nextQueue = [currentSong, ...remainingSongs];
      nextIndex = 0;
    } else {
      nextQueue = [...originalQueue];
      nextIndex = nextQueue.findIndex(s => s.id === currentSong.id);
    }

    set({
      shuffle: nextShuffle,
      queue: nextQueue,
      queueIndex: nextIndex !== -1 ? nextIndex : 0,
    });
    saveSession(get());
  },

  toggleRepeat: () => {
    const { repeat } = get();
    let nextRepeat: RepeatState = 'off';
    if (repeat === 'off') nextRepeat = 'all';
    else if (repeat === 'all') nextRepeat = 'one';
    set({ repeat: nextRepeat });
    saveSession(get());
  },

  handleSongEnded: () => {
    const { repeat, currentSong } = get();
    if (repeat === 'one' && audio && currentSong) {
      audio.currentTime = 0;
      audio.play().catch(err => console.error('[Playback] Loop play error:', err));
    } else {
      get().next();
    }
  },

  removeFromQueue: (songId) => {
    const { queue, queueIndex, currentSong } = get();
    const targetIdx = queue.findIndex(s => s.id === songId);
    if (targetIdx === -1) return;

    if (currentSong && currentSong.id === songId) {
      if (queue.length <= 1) {
        get().clearQueue();
      } else {
        get().next();
        const newQueue = get().queue.filter(s => s.id !== songId);
        const newOriginalQueue = get().originalQueue.filter(s => s.id !== songId);
        const newIndex = newQueue.findIndex(s => s.id === get().currentSong?.id);
        set({
          queue: newQueue,
          originalQueue: newOriginalQueue,
          queueIndex: newIndex !== -1 ? newIndex : 0
        });
        saveSession(get());
      }
    } else {
      const newQueue = queue.filter(s => s.id !== songId);
      const newOriginalQueue = get().originalQueue.filter(s => s.id !== songId);
      const newIndex = newQueue.findIndex(s => s.id === currentSong?.id);
      
      set({
        queue: newQueue,
        originalQueue: newOriginalQueue,
        queueIndex: newIndex !== -1 ? newIndex : queueIndex
      });
      saveSession(get());
    }
  },

  clearQueue: () => {
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    set({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      queue: [],
      originalQueue: [],
      queueIndex: -1
    });
    saveSession(get());
  },

  addToQueue: (song) => {
    const { queue, originalQueue, currentSong } = get();
    if (queue.some(s => s.id === song.id)) {
      return; // Prevent immediate duplicates in active queue
    }

    const newQueue = [...queue, song];
    const newOriginalQueue = [...originalQueue, song];

    if (!currentSong) {
      set({
        queue: newQueue,
        originalQueue: newOriginalQueue,
        queueIndex: 0,
        currentSong: song,
        currentTime: 0,
      });
      get().playSong(song, newQueue);
    } else {
      set({
        queue: newQueue,
        originalQueue: newOriginalQueue,
      });
      saveSession(get());
    }
  },

  playNext: (song) => {
    const { queue, originalQueue, queueIndex, currentSong } = get();
    
    // Remove if already in queue to avoid duplicates
    const filteredQueue = queue.filter(s => s.id !== song.id);
    const filteredOriginal = originalQueue.filter(s => s.id !== song.id);
    
    let activeIdx = currentSong ? filteredQueue.findIndex(s => s.id === currentSong.id) : -1;
    if (activeIdx === -1) {
      activeIdx = queueIndex;
    }

    if (!currentSong) {
      set({
        queue: [song],
        originalQueue: [song],
        queueIndex: 0,
        currentSong: song,
        currentTime: 0,
      });
      get().playSong(song, [song]);
    } else {
      const newQueue = [...filteredQueue];
      newQueue.splice(activeIdx + 1, 0, song);

      const newOriginalQueue = [...filteredOriginal];
      const origIdx = originalQueue.findIndex(s => s.id === currentSong.id);
      if (origIdx !== -1) {
        newOriginalQueue.splice(origIdx + 1, 0, song);
      } else {
        newOriginalQueue.push(song);
      }

      set({
        queue: newQueue,
        originalQueue: newOriginalQueue,
        queueIndex: activeIdx,
      });
      saveSession(get());
    }
  },

  reorderQueue: (newQueue) => {
    const { currentSong } = get();
    const newIdx = currentSong ? newQueue.findIndex(s => s.id === currentSong.id) : -1;

    set({
      queue: newQueue,
      queueIndex: newIdx !== -1 ? newIdx : get().queueIndex,
    });
    saveSession(get());
  },

  restoreSession: async () => {
    try {
      const session = await window.electron.db.getPlaybackSession();
      if (!session) return;

      const { currentSong, currentTime, volume, shuffle, repeat, queueIndex, queue } = session;

      get().initAudio();
      if (!audio) return;

      // Set volume
      audio.volume = volume;
      audio.muted = volume === 0;

      // If there's a loaded queue, restore it
      if (queue && queue.length > 0) {
        set({
          queue,
          originalQueue: [...queue],
          queueIndex,
          volume,
          shuffle,
          repeat,
        });
      }

      // If there's a current song, load it in paused standby mode
      if (currentSong) {
        set({
          currentSong,
          currentTime,
          duration: currentSong.duration,
        });
        
        audio.src = getMediaUrl(currentSong.file_path);
        audio.currentTime = currentTime;
      }
      
      console.log('[Playback] Playback session restored.');
    } catch (err) {
      console.error('[Playback] Failed to restore session:', err);
    }
  },

  toggleLike: async (songId) => {
    try {
      const isLiked = await window.electron.db.toggleLikeSong(songId);
      
      // Update currentSong state in memory
      const current = get().currentSong;
      if (current && current.id === songId) {
        set({ currentSong: { ...current, is_liked: isLiked } });
      }

      // Update songs in the queues
      const updateList = (list: Song[]) => 
        list.map(s => s.id === songId ? { ...s, is_liked: isLiked } : s);
      
      set({
        queue: updateList(get().queue),
        originalQueue: updateList(get().originalQueue),
      });
    } catch (err) {
      console.error('[Playback] Failed to toggle like state:', err);
    }
  },
}));
