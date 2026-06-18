import { useEffect, useState } from 'react';
import { Disc, Play, Music } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { getMediaUrl } from '../store/playbackStore';

interface Album {
  name: string;
  artist: string;
  artwork_path: string | null;
  song_count: number;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { setView } = useNavigationStore();

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const list = await window.electron.db.getAllAlbums();
        setAlbums(list);
      } catch (err) {
        console.error('Failed to fetch albums:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const handleAlbumClick = (album: Album) => {
    // Encode album name and artist together as the ID
    const albumId = `${album.name}|||${album.artist}`;
    setView('album-detail', albumId);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Albums</h2>
        <p className="text-xs text-text-secondary mt-1">
          {loading ? 'Reading metadata...' : `${albums.length} albums found`}
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent border-r-2 mx-auto mb-4" />
          <p className="text-sm">Reading database...</p>
        </div>
      ) : albums.length === 0 ? (
        <div className="py-20 text-center text-text-secondary bg-background-surface rounded-2xl border border-white/[0.02] shadow-xl">
          <Disc className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="font-semibold text-text-primary">No albums found</p>
          <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
            Scan directories containing tagged audio files under Settings to populate your album library automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {albums.map((album) => (
            <div 
              key={`${album.name}-${album.artist}`}
              onClick={() => handleAlbumClick(album)}
              className="group bg-background-surface hover:bg-background-elevated p-4 rounded-2xl border border-white/[0.01] hover:border-white/[0.03] transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer flex flex-col"
            >
              {/* Album Art Container */}
              <div className="aspect-square w-full rounded-xl bg-background-elevated border border-white/[0.04] flex items-center justify-center overflow-hidden shadow-inner relative mb-4 flex-shrink-0">
                {album.artwork_path ? (
                  <img 
                    src={getMediaUrl(album.artwork_path)} 
                    alt={album.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-accent/10 to-white/[0.02] flex items-center justify-center">
                    <Disc className="w-10 h-10 text-text-muted group-hover:rotate-45 transition-transform duration-500" />
                  </div>
                )}
                
                {/* Floating Play Button Cue */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-accent text-background flex items-center justify-center shadow-lg transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="overflow-hidden flex-1 flex flex-col justify-center min-h-[3.25rem]">
                <h4 className="text-sm font-bold text-text-primary truncate" title={album.name}>
                  {album.name}
                </h4>
                <p className="text-xs text-text-secondary truncate mt-1" title={album.artist}>
                  {album.artist}
                </p>
                <span className="text-[10px] font-semibold text-accent-light tracking-wide uppercase mt-1.5 flex items-center gap-1">
                  <Music className="w-2.5 h-2.5" />
                  {album.song_count} {album.song_count === 1 ? 'song' : 'songs'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
