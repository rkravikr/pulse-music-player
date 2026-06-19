import { Trash2, X, Music, Disc, GripVertical } from 'lucide-react';
import { usePlaybackStore, Song, getMediaUrl } from '../store/playbackStore';

// Dnd-kit imports for Drag & Drop queue reordering
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

interface QueuePanelProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function QueuePanel({ onClose, embedded }: QueuePanelProps) {
  const { queue, queueIndex, currentSong, isPlaying, playSong, removeFromQueue, clearQueue, reorderQueue } = usePlaybackStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Next up tracks are those after the current queue index
  const nextUp = queue.slice(queueIndex + 1);
  const activeSong = activeId ? nextUp.find(s => s.id === activeId) ?? null : null;

  // Setup sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px drag before activating – snappy feel
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = nextUp.findIndex((s) => s.id === active.id);
    const newIndex = nextUp.findIndex((s) => s.id === over.id);

    const reorderedNextUp = arrayMove(nextUp, oldIndex, newIndex);
    // Combine already-played portion + reordered upcoming
    const updatedQueue = [...queue.slice(0, queueIndex + 1), ...reorderedNextUp];
    reorderQueue(updatedQueue);
  };

  const handleDragCancel = () => setActiveId(null);

  return (
    <aside
      className={`flex flex-col h-full flex-shrink-0 z-10 relative ${embedded ? 'w-full' : 'w-80'}`}
      style={embedded ? {} : {
        background: 'rgba(15, 15, 17, 0.72)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-accent opacity-80" />
          <h3 className="font-bold text-sm text-text-primary tracking-wide">Play Queue</h3>
          {nextUp.length > 0 && (
            <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/15 px-1.5 py-0.5 rounded-full">
              {nextUp.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-all"
            title="Close Queue"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Now Playing */}
        <div>
          <span className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase select-none">
            Now Playing
          </span>
          {currentSong ? (
            <div
              className="mt-2.5 p-3 rounded-xl flex items-center gap-3"
              style={{
                background: 'rgba(20, 184, 166, 0.06)',
                border: '1px solid rgba(20, 184, 166, 0.12)',
              }}
            >
              <div className="w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden relative shadow-md">
                {currentSong.artwork_path ? (
                  <img
                    src={getMediaUrl(currentSong.artwork_path)}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-white/[0.02] flex items-center justify-center">
                    <Disc className={`w-5 h-5 text-text-muted ${isPlaying ? 'animate-spin-slow' : ''}`} />
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-1">
                    <div className="flex items-end gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-0.5 bg-accent rounded-full animate-visualizer-bar"
                          style={{ animationDelay: `${i * 0.15}s`, minHeight: '3px' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="text-xs font-bold text-accent truncate" title={currentSong.title}>
                  {currentSong.title}
                </h4>
                <p className="text-[10px] text-text-secondary truncate mt-0.5" title={currentSong.artist}>
                  {currentSong.artist}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted mt-3 italic">No track loaded</p>
          )}
        </div>

        {/* Next Up */}
        <div className="flex-grow flex flex-col min-h-0">
          <span className="text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase select-none">
            Next Up
          </span>

          {nextUp.length === 0 ? (
            <div
              className="mt-3 text-center text-text-muted py-8 rounded-xl"
              style={{ border: '1px dashed rgba(255,255,255,0.05)' }}
            >
              <Music className="w-7 h-7 mx-auto mb-2 opacity-20" />
              <p className="text-[10px] italic opacity-60">Queue ends here</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={nextUp} strategy={verticalListSortingStrategy}>
                <div className="mt-2.5 space-y-0.5 overflow-y-auto">
                  {nextUp.map((song) => (
                    <SortableQueueRow
                      key={song.id}
                      song={song}
                      isGhost={song.id === activeId}
                      onDoubleClick={() => playSong(song)}
                      onRemoveClick={() => removeFromQueue(song.id)}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Drag overlay – the floating card that follows the cursor */}
              <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeSong && (
                  <QueueRowDisplay
                    song={activeSong}
                    isOverlay
                    onRemoveClick={() => {}}
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ============================================================================
   Sortable wrapper – drives the dnd-kit transform + supplies listeners
   ============================================================================ */

interface SortableQueueRowProps {
  song: Song;
  isGhost: boolean;
  onDoubleClick: () => void;
  onRemoveClick: () => void;
}

function SortableQueueRow({ song, isGhost, onDoubleClick, onRemoveClick }: SortableQueueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QueueRowDisplay
        song={song}
        isDragging={isDragging}
        isGhost={isGhost}
        dragHandleProps={{ ...attributes, ...listeners }}
        onDoubleClick={onDoubleClick}
        onRemoveClick={onRemoveClick}
      />
    </div>
  );
}

/* ============================================================================
   Pure display component – used both inline and in the DragOverlay
   ============================================================================ */

interface QueueRowDisplayProps {
  song: Song;
  isDragging?: boolean;
  isGhost?: boolean;
  isOverlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onDoubleClick?: () => void;
  onRemoveClick: () => void;
}

function QueueRowDisplay({
  song,
  isDragging,
  isGhost,
  isOverlay,
  dragHandleProps,
  onDoubleClick,
  onRemoveClick,
}: QueueRowDisplayProps) {
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Ghost placeholder shown at source position while dragging
  if (isGhost && !isOverlay) {
    return (
      <div
        className="flex items-center gap-3 px-2 py-2 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.06)',
          opacity: 0.35,
          minHeight: 52,
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={onDoubleClick}
      className="group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors cursor-pointer relative select-none"
      style={
        isOverlay
          ? {
              background: 'rgba(20, 20, 24, 0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(20,184,166,0.15)',
              borderRadius: 10,
              width: 288,
            }
          : isDragging
          ? { opacity: 0 } // hide in-place while overlay takes over
          : {}
      }
    >
      {/* Grip handle — entire left area listens for drag */}
      <div
        {...dragHandleProps}
        className="flex items-center justify-center w-5 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={isOverlay ? { opacity: 0.5 } : {}}
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5 text-text-muted" />
      </div>

      {/* Artwork */}
      <div className="w-9 h-9 rounded-md flex-shrink-0 overflow-hidden bg-background-elevated border border-white/[0.05] shadow-sm">
        {song.artwork_path ? (
          <img
            src={getMediaUrl(song.artwork_path)}
            alt={song.title}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-3.5 h-3.5 text-text-muted" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="overflow-hidden flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate leading-tight" title={song.title}>
          {song.title}
        </p>
        <p className="text-[10px] text-text-secondary truncate mt-0.5 leading-tight" title={song.artist}>
          {song.artist}
        </p>
      </div>

      {/* Duration / Remove */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-text-muted tabular-nums group-hover:hidden">
          {formatDuration(song.duration)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveClick();
          }}
          className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          title="Remove from queue"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
