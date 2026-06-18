import { create } from 'zustand';

export type ActiveView = 
  | 'home'
  | 'songs'
  | 'albums'
  | 'liked-songs'
  | 'playlists'
  | 'recently-played'
  | 'settings'
  | 'album-detail'
  | 'playlist-detail';

interface NavigationState {
  currentView: ActiveView;
  activeAlbumId: string | null;
  activePlaylistId: string | null;
  showDashboardOverride: boolean;
  setView: (view: ActiveView, id?: string | null) => void;
  setShowDashboardOverride: (show: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: 'home',
  activeAlbumId: null,
  activePlaylistId: null,
  showDashboardOverride: false,
  setView: (view, id = null) => {
    if (view === 'album-detail') {
      set({ currentView: view, activeAlbumId: id, activePlaylistId: null });
    } else if (view === 'playlist-detail') {
      set({ currentView: view, activeAlbumId: null, activePlaylistId: id });
    } else {
      set({ currentView: view, activeAlbumId: null, activePlaylistId: null });
    }
  },
  setShowDashboardOverride: (show) => set({ showDashboardOverride: show }),
}));
