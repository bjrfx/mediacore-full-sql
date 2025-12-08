import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Simple UUID generator
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const useLibraryStore = create(
  persist(
    (set, get) => ({
      // Playlists
      playlists: [],
      
      createPlaylist: (name, description = '') => {
        const newPlaylist = {
          id: generateId(),
          name,
          description,
          tracks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          coverImage: null,
        };
        set((state) => ({
          playlists: [...state.playlists, newPlaylist],
        }));
        return newPlaylist;
      },

      updatePlaylist: (id, updates) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deletePlaylist: (id) => {
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
        }));
      },

      addToPlaylist: (playlistId, track) => {
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              // Don't add duplicate
              if (p.tracks.some((t) => t.id === track.id)) {
                return p;
              }
              return {
                ...p,
                tracks: [...p.tracks, track],
                updatedAt: new Date().toISOString(),
                coverImage: p.coverImage || track.thumbnail || track.fileUrl,
              };
            }
            return p;
          }),
        }));
      },

      removeFromPlaylist: (playlistId, trackId) => {
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              return {
                ...p,
                tracks: p.tracks.filter((t) => t.id !== trackId),
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          }),
        }));
      },

      reorderPlaylist: (playlistId, fromIndex, toIndex) => {
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id === playlistId) {
              const tracks = [...p.tracks];
              const [removed] = tracks.splice(fromIndex, 1);
              tracks.splice(toIndex, 0, removed);
              return {
                ...p,
                tracks,
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          }),
        }));
      },

      // Favorites / Liked tracks
      favorites: [],
      
      toggleFavorite: (track) => {
        set((state) => {
          const isFavorite = state.favorites.some((t) => t.id === track.id);
          if (isFavorite) {
            return {
              favorites: state.favorites.filter((t) => t.id !== track.id),
            };
          }
          return {
            favorites: [
              { ...track, favoritedAt: new Date().toISOString() },
              ...state.favorites,
            ],
          };
        });
      },

      isFavorite: (trackId) => {
        return get().favorites.some((t) => t.id === trackId);
      },

      // Downloads (for offline support)
      downloads: [],
      
      addDownload: (track) => {
        set((state) => ({
          downloads: [
            ...state.downloads.filter((t) => t.id !== track.id),
            { ...track, downloadedAt: new Date().toISOString() },
          ],
        }));
      },

      removeDownload: (trackId) => {
        set((state) => ({
          downloads: state.downloads.filter((t) => t.id !== trackId),
        }));
      },

      isDownloaded: (trackId) => {
        return get().downloads.some((t) => t.id === trackId);
      },

      // Recently played (managed by playerStore, but mirrored here for library view)
      getRecentlyPlayed: () => {
        // This will be fetched from playerStore.history
        return [];
      },
    }),
    {
      name: 'library-storage',
      version: 1,
    }
  )
);

export default useLibraryStore;
