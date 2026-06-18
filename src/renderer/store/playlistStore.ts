import { create } from 'zustand';

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  created_at: string;
}

interface PlaylistState {
  playlists: Playlist[];
  loading: boolean;
  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description: string) => Promise<string>;
  deletePlaylist: (id: string) => Promise<boolean>;
  updatePlaylistDetails: (playlistId: string, name: string, description: string, coverImagePath: string | null) => Promise<boolean>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  loading: false,

  fetchPlaylists: async () => {
    set({ loading: true });
    try {
      const list = await window.electron.db.getPlaylists();
      set({ playlists: list });
    } catch (err) {
      console.error('[PlaylistStore] Failed to fetch playlists:', err);
    } finally {
      set({ loading: false });
    }
  },

  createPlaylist: async (name, description) => {
    try {
      const id = await window.electron.db.createPlaylist(name, description);
      await get().fetchPlaylists();
      return id;
    } catch (err) {
      console.error('[PlaylistStore] Failed to create playlist:', err);
      throw err;
    }
  },

  deletePlaylist: async (id) => {
    try {
      const success = await window.electron.db.deletePlaylist(id);
      if (success) {
        await get().fetchPlaylists();
      }
      return success;
    } catch (err) {
      console.error('[PlaylistStore] Failed to delete playlist:', err);
      return false;
    }
  },

  updatePlaylistDetails: async (playlistId, name, description, coverImagePath) => {
    try {
      const success = await window.electron.db.updatePlaylistDetails(playlistId, name, description, coverImagePath);
      if (success) {
        await get().fetchPlaylists();
      }
      return success;
    } catch (err) {
      console.error('[PlaylistStore] Failed to update playlist details:', err);
      return false;
    }
  },
}));
