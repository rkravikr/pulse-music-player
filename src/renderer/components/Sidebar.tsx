import { useEffect } from 'react';
import { Home, Music, Disc, Heart, History, Settings, ListMusic, Plus } from 'lucide-react';
import { useNavigationStore, ActiveView } from '../store/navigationStore';
import { usePlaylistStore } from '../store/playlistStore';

export default function Sidebar() {
  const { currentView, setView, activePlaylistId } = useNavigationStore();
  const { playlists, fetchPlaylists, createPlaylist } = usePlaylistStore();

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const mainNavItems = [
    { view: 'home' as ActiveView, label: 'Home', icon: Home },
    { view: 'songs' as ActiveView, label: 'Songs', icon: Music },
    { view: 'albums' as ActiveView, label: 'Albums', icon: Disc },
    { view: 'liked-songs' as ActiveView, label: 'Liked Songs', icon: Heart, color: 'text-rose-500' },
  ];

  const subNavItems = [
    { view: 'recently-played' as ActiveView, label: 'Recently Played', icon: History },
    { view: 'settings' as ActiveView, label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (view: ActiveView, id?: string) => {
    setView(view, id || null);
  };

  const handleCreatePlaylistClick = async () => {
    const name = prompt('Enter playlist name:');
    if (name && name.trim() !== '') {
      try {
        const id = await createPlaylist(name.trim(), 'Custom Playlist');
        setView('playlist-detail', id);
      } catch (err) {
        console.error('Failed to create playlist:', err);
      }
    }
  };

  return (
    <aside className="w-60 bg-background-surface flex flex-col h-full border-r border-white/[0.02] flex-shrink-0">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 px-6 py-5 select-none drag-region">
        <Disc className="w-5 h-5 text-accent animate-spin-slow" />
        <span className="font-extrabold text-base tracking-wider uppercase font-sans bg-gradient-to-r from-accent-light to-accent bg-clip-text text-transparent">
          Pulse
        </span>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div>
          <span className="px-3 text-[10px] font-bold tracking-widest text-text-muted uppercase select-none">
            Discover
          </span>
          <ul className="mt-2 space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <li key={item.view}>
                  <button
                    onClick={() => handleItemClick(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-accent/15 to-transparent text-accent border-l-2 border-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${item.color || (isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary')}`} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Playlists Section */}
        <div>
          <div className="flex items-center justify-between px-3 select-none">
            <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
              Playlists
            </span>
            <button 
              onClick={handleCreatePlaylistClick}
              className="text-text-muted hover:text-accent transition-colors" 
              title="Create Playlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {playlists.map((pl) => {
              const isActive = currentView === 'playlist-detail' && activePlaylistId === pl.id;
              return (
                <li key={pl.id}>
                  <button
                    onClick={() => handleItemClick('playlist-detail', pl.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-accent/15 to-transparent text-accent border-l-2 border-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
                    }`}
                  >
                    <ListMusic className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`} />
                    <span className="truncate">{pl.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Support & Configuration */}
        <div>
          <span className="px-3 text-[10px] font-bold tracking-widest text-text-muted uppercase select-none">
            Library
          </span>
          <ul className="mt-2 space-y-1">
            {subNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <li key={item.view}>
                  <button
                    onClick={() => handleItemClick(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-accent/15 to-transparent text-accent border-l-2 border-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
