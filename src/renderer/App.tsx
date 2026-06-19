import { useEffect, useState } from 'react';
import { useNavigationStore } from './store/navigationStore';
import { usePlaybackStore } from './store/playbackStore';
import { useSettingsStore } from './store/settingsStore';
import Sidebar from './components/Sidebar';
import Titlebar from './components/Titlebar';
import RightPlayerBar from './components/RightPlayerBar';
import QueuePanel from './components/QueuePanel';
import SongsPage from './pages/SongsPage';
import AlbumsPage from './pages/AlbumsPage';
import AlbumDetailPage from './pages/AlbumDetailPage';
import PlaylistPage from './pages/PlaylistPage';
import HomePage from './pages/HomePage';
import RecentlyPlayedPage from './pages/RecentlyPlayedPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { currentView, activeAlbumId, activePlaylistId } = useNavigationStore();
  const initAudio = usePlaybackStore((state) => state.initAudio);
  const restoreSession = usePlaybackStore((state) => state.restoreSession);
  const rowDensity = useSettingsStore((state) => state.rowDensity);
  const initSettings = useSettingsStore((state) => state.init);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      await initSettings();   // load settings + apply accent CSS vars first
      initAudio();
      await restoreSession();
    };
    bootstrap();
  }, [initAudio, restoreSession, initSettings]);

  // Helper to render the active view component
  const renderActiveView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'songs':
        return <SongsPage />;
      case 'albums':
        return <AlbumsPage />;
      case 'liked-songs':
        return <PlaylistPage playlistId="liked-songs" />;
      case 'recently-played':
        return <RecentlyPlayedPage />;
      case 'settings':
        return <SettingsPage />;
      case 'album-detail':
        return <AlbumDetailPage albumId={activeAlbumId} />;
      case 'playlist-detail':
        return <PlaylistPage playlistId={activePlaylistId} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background" data-density={rowDensity}>
      {/* Titlebar window drag header */}
      <Titlebar />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Left) */}
        <Sidebar />

        {/* Primary Page Content Wrapper (Center) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background relative">
          {/* Subtle design accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-accent-light/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Render Active Page */}
          <div className="flex-1 overflow-y-auto relative z-10 p-6">
            {renderActiveView()}
          </div>
        </main>

        {/* The Right Sidebar Column */}
        <div className="h-full border-l border-white/[0.02] bg-background-surface/20 flex flex-col z-20 shrink-0 w-80">
          <RightPlayerBar onQueueToggle={() => setIsQueueOpen(!isQueueOpen)} isQueueOpen={isQueueOpen} />
        </div>
      </div>
    </div>
  );
}
