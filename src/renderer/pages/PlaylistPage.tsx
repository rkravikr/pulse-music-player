import { useEffect, useState } from 'react';
import { Clock, ArrowLeft, Play, Pause, Trash2, Heart, Music, ListMusic, Volume2 } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { usePlaybackStore, Song, getMediaUrl } from '../store/playbackStore';
import { usePlaylistStore } from '../store/playlistStore';
import ContextMenu from '../components/ContextMenu';

// Dnd-kit imports for Drag & Drop reordering
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlaylistPageProps {
  playlistId: string | null;
}

interface PlaylistDetails {
  name: string;
  description: string;
  cover_image: string | null;
}

export default function PlaylistPage({ playlistId }: PlaylistPageProps) {
  const { setView } = useNavigationStore();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlaybackStore();
  const { deletePlaylist, fetchPlaylists } = usePlaylistStore();

  const [playlistDetails, setPlaylistDetails] = useState<PlaylistDetails | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom context menu & editing state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverPath, setEditCoverPath] = useState<string | null>(null);

  // Setup pointer sensors for dnd-kit (drag works on drag-handle or row)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require drag movement of 8px to initiate drag, avoiding hijacking row clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPlaylistData = async () => {
    if (!playlistId) return;
    try {
      setLoading(true);
      
      // Load details
      if (playlistId === 'liked-songs') {
        setPlaylistDetails({
          name: 'Liked Songs',
          description: 'Your favorited tracks collected in one place.',
          cover_image: null,
        });
      } else {
        const details = await window.electron.db.getPlaylistDetails(playlistId);
        setPlaylistDetails(details);
      }

      // Load songs
      const trackList = await window.electron.db.getPlaylistSongs(playlistId);
      setSongs(trackList);
    } catch (err) {
      console.error('Failed to load playlist data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistData();
  }, [playlistId]);

  const handleDeletePlaylist = async () => {
    if (!playlistId || playlistId === 'liked-songs') return;
    if (confirm(`Are you sure you want to delete the playlist "${playlistDetails?.name}"?`)) {
      const success = await deletePlaylist(playlistId);
      if (success) {
        setView('home');
      }
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!playlistId) return;
    try {
      if (playlistId === 'liked-songs') {
        await window.electron.db.toggleLikeSong(songId);
      } else {
        await window.electron.db.removeSongFromPlaylist(playlistId, songId);
      }
      // Re-fetch
      fetchPlaylistData();
      fetchPlaylists(); // Refresh sidebar playlist song counts if needed
    } catch (err) {
      console.error('Failed to remove track:', err);
    }
  };

  const handlePlayPlaylist = () => {
    if (songs.length > 0) {
      const isPlaylistPlaying = songs.some(s => s.id === currentSong?.id);
      if (isPlaylistPlaying) {
        togglePlay();
      } else {
        playSong(songs[0], songs);
      }
    }
  };

  const getPlaylistDuration = () => {
    const totalSec = songs.reduce((sum, song) => sum + song.duration, 0);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !playlistId) return;

    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    
    const reorderedSongs = arrayMove(songs, oldIndex, newIndex);
    setSongs(reorderedSongs);

    try {
      const songIds = reorderedSongs.map(s => s.id);
      await window.electron.db.reorderPlaylistSongs(playlistId, songIds);
    } catch (err) {
      console.error('Failed to save reordered playlist:', err);
    }
  };

  const handleOpenEdit = () => {
    if (!playlistDetails) return;
    setEditName(playlistDetails.name);
    setEditDescription(playlistDetails.description || '');
    setEditCoverPath(null);
    setIsEditing(true);
  };

  const handleSelectImage = async () => {
    try {
      const selected = await window.electron.db.selectImage();
      if (selected) {
        setEditCoverPath(selected);
      }
    } catch (err) {
      console.error('Failed to select playlist cover image:', err);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistId) return;
    if (editName.trim() === '') {
      alert('Playlist name cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      const success = await window.electron.db.updatePlaylistDetails(
        playlistId,
        editName.trim(),
        editDescription.trim(),
        editCoverPath
      );
      if (success) {
        setIsEditing(false);
        await fetchPlaylistData();
        await fetchPlaylists();
      } else {
        alert('Failed to update playlist details.');
      }
    } catch (err) {
      console.error('Failed to save playlist details:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPlaylistPlaying = songs.some(s => s.id === currentSong?.id) && isPlaying;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Back to Home header link */}
      <button 
        onClick={() => setView('home')}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {loading && !isEditing ? (
        <div className="py-20 text-center text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 mx-auto mb-4" />
          <p className="text-sm">Loading playlist...</p>
        </div>
      ) : (
        <>
          {/* Playlist Banner */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-6 border-b border-white/[0.04] relative">
            <div className="w-48 h-48 rounded-2xl bg-background-elevated border border-white/[0.05] flex items-center justify-center overflow-hidden shadow-2xl flex-shrink-0 relative group">
              {playlistId === 'liked-songs' ? (
                <div className="w-full h-full bg-gradient-to-tr from-rose-500 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
                  <Heart className="w-20 h-20 text-white fill-white animate-pulse" />
                </div>
              ) : playlistDetails?.cover_image ? (
                <img 
                  src={getMediaUrl(playlistDetails.cover_image)} 
                  alt={playlistDetails.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-accent/15 to-white/[0.02] flex items-center justify-center">
                  <ListMusic className="w-16 h-16 text-text-muted" />
                </div>
              )}
              {/* Play Overlay */}
              {songs.length > 0 && (
                <div 
                  onClick={handlePlayPlaylist}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-accent text-background flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                    {isPlaylistPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current translate-x-0.5" />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center md:text-left space-y-2.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-widest text-accent-light bg-accent/10 px-2.5 py-1 rounded-md border border-accent/10">
                Playlist
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary leading-tight">
                {playlistDetails?.name}
              </h2>
              <p className="text-sm text-text-secondary">
                {playlistDetails?.description || 'Custom local playlist.'}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-text-secondary font-medium">
                <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {getPlaylistDuration()}
                </span>
              </div>
            </div>

            {/* Actions for custom playlists */}
            {playlistId !== 'liked-songs' && (
              <div className="flex gap-2 self-center md:self-end">
                <button
                  onClick={handleOpenEdit}
                  className="px-4 py-2 text-xs font-bold bg-white/[0.03] hover:bg-white/[0.06] text-text-secondary hover:text-text-primary rounded-lg border border-white/[0.04] transition-colors shadow flex items-center gap-1.5"
                  title="Edit Details"
                >
                  Edit Details
                </button>
                <button
                  onClick={handleDeletePlaylist}
                  className="px-4 py-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg border border-rose-500/10 transition-colors shadow flex items-center gap-1.5"
                  title="Delete Playlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Playlist
                </button>
              </div>
            )}
          </div>

          {/* Songs List */}
          {songs.length === 0 ? (
            <div className="py-20 text-center text-text-secondary bg-background-surface rounded-2xl border border-white/[0.02] shadow-xl">
              <Music className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
              <p className="font-semibold text-text-primary">No songs in this playlist</p>
              <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                Right-click tracks in the Library list, select "Add to Playlist" to populate this playlist.
              </p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="w-full bg-background-surface rounded-2xl border border-white/[0.02] overflow-hidden shadow-xl mt-6">
                <div className="grid grid-cols-12 px-5 py-3 bg-white/[0.01] border-b border-white/[0.02] text-xs font-bold text-text-secondary uppercase tracking-wider select-none">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">Title</div>
                  <div className="col-span-4">Album</div>
                  <div className="col-span-1 text-right pr-6">Time</div>
                </div>

                <SortableContext 
                  items={songs}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-white/[0.01]">
                    {songs.map((song, index) => (
                      <SortableTrackRow 
                        key={song.id} 
                        song={song} 
                        index={index} 
                        isCurrent={currentSong?.id === song.id}
                        isPlaying={isPlaying}
                        onPlayClick={() => {
                          if (currentSong?.id === song.id) togglePlay();
                          else playSong(song, songs);
                        }}
                        onRemoveClick={() => handleRemoveSong(song.id)}
                        onDoubleClick={() => playSong(song, songs)}
                        onContextMenu={(x, y) => {
                          setContextMenu({ x, y, song });
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          )}
        </>
      )}

      {/* Glassmorphic Edit Playlist Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background-surface border border-white/[0.04] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-text-primary">Edit Playlist Details</h3>
            
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Playlist Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs bg-background border border-white/[0.05] rounded-xl px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 outline-none"
                  placeholder="Playlist Name"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs bg-background border border-white/[0.05] rounded-xl px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 outline-none resize-none h-20"
                  placeholder="Playlist description..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Cover Art</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-background border border-white/[0.04] overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {editCoverPath ? (
                      <span className="text-[9px] text-accent font-bold uppercase tracking-wider text-center p-1 leading-snug">Selected</span>
                    ) : playlistDetails?.cover_image ? (
                      <img 
                        src={getMediaUrl(playlistDetails.cover_image)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ListMusic className="w-6 h-6 text-text-muted" />
                    )}
                  </div>
                  <div className="flex-grow space-y-1">
                    <button
                      type="button"
                      onClick={handleSelectImage}
                      className="px-3 py-2 bg-background hover:bg-background-elevated border border-white/[0.05] rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 active:scale-95"
                    >
                      Choose Cover Image...
                    </button>
                    {editCoverPath && (
                      <p className="text-[9px] text-text-muted truncate max-w-[200px]" title={editCoverPath}>{editCoverPath}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-text-secondary hover:text-text-primary rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-light text-background rounded-xl text-xs font-bold transition-all active:scale-95 shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          song={contextMenu.song}
          playlistId={playlistId}
          onClose={() => setContextMenu(null)}
          onRemoveFromPlaylist={() => handleRemoveSong(contextMenu.song.id)}
        />
      )}
    </div>
  );
}

/* ============================================================================
   Sortable Track Row Child Component (Required for @dnd-kit item contexts)
   ============================================================================ */

interface SortableTrackRowProps {
  song: Song;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlayClick: () => void;
  onRemoveClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (x: number, y: number) => void;
}

function SortableTrackRow({ song, index, isCurrent, isPlaying, onPlayClick, onRemoveClick, onDoubleClick, onContextMenu }: SortableTrackRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY);
      }}
      className={`grid grid-cols-12 px-5 py-2.5 items-center text-sm transition-colors group relative ${
        isDragging ? 'bg-background-elevated shadow-2xl' : ''
      } ${
        isCurrent 
          ? 'bg-accent/5 text-accent hover:bg-accent/10' 
          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.01]'
      }`}
    >
      {/* drag indicator / index */}
      <div 
        {...attributes} 
        {...listeners} 
        className="col-span-1 text-center text-text-muted font-medium text-xs flex items-center justify-center cursor-grab active:cursor-grabbing h-6"
        title="Drag to reorder"
      >
        <span className="group-hover:hidden flex items-center">
          {isCurrent && isPlaying ? (
            <Volume2 className="w-4 h-4 text-accent animate-pulse" />
          ) : (
            index + 1
          )}
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onPlayClick();
          }}
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

      <div className="col-span-1 text-right text-xs text-text-muted font-medium pr-1 flex items-center justify-end gap-3.5">
        <span className="group-hover:hidden">{formatDuration(song.duration)}</span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveClick();
          }}
          className="hidden group-hover:block text-text-muted hover:text-rose-500 transition-colors"
          title="Remove from playlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
