import { create } from 'zustand';

// Content store - now a lightweight store for UI state
// All data fetching is handled by react-query in components
// This store only holds temporary UI state and cache for quick access

const useContentStore = create((set, get) => ({
  // Cache for quick lookups (populated from react-query data)
  artistsCache: {},
  albumsCache: {},

  // UI State
  selectedArtistId: null,
  selectedAlbumId: null,

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  // Update artists cache from API response
  setArtistsCache: (artists) => {
    const cache = {};
    artists.forEach((artist) => {
      cache[artist.id] = artist;
    });
    set({ artistsCache: cache });
  },

  // Update albums cache from API response
  setAlbumsCache: (albums) => {
    const cache = {};
    albums.forEach((album) => {
      cache[album.id] = album;
    });
    set({ albumsCache: cache });
  },

  // Add single artist to cache
  addArtistToCache: (artist) => {
    set((state) => ({
      artistsCache: { ...state.artistsCache, [artist.id]: artist },
    }));
  },

  // Add single album to cache
  addAlbumToCache: (album) => {
    set((state) => ({
      albumsCache: { ...state.albumsCache, [album.id]: album },
    }));
  },

  // Remove artist from cache
  removeArtistFromCache: (artistId) => {
    set((state) => {
      const newCache = { ...state.artistsCache };
      delete newCache[artistId];
      return { artistsCache: newCache };
    });
  },

  // Remove album from cache
  removeAlbumFromCache: (albumId) => {
    set((state) => {
      const newCache = { ...state.albumsCache };
      delete newCache[albumId];
      return { albumsCache: newCache };
    });
  },

  // ============================================
  // GETTERS (from cache)
  // ============================================

  getArtist: (id) => {
    return get().artistsCache[id] || null;
  },

  getAlbum: (id) => {
    return get().albumsCache[id] || null;
  },

  getAlbumsByArtist: (artistId) => {
    const albums = Object.values(get().albumsCache);
    return albums.filter((album) => album.artistId === artistId);
  },

  // ============================================
  // UI STATE MANAGEMENT
  // ============================================

  setSelectedArtist: (artistId) => {
    set({ selectedArtistId: artistId });
  },

  setSelectedAlbum: (albumId) => {
    set({ selectedAlbumId: albumId });
  },

  clearSelection: () => {
    set({ selectedArtistId: null, selectedAlbumId: null });
  },

  // ============================================
  // CLEAR ALL CACHE
  // ============================================

  clearCache: () => {
    set({
      artistsCache: {},
      albumsCache: {},
      selectedArtistId: null,
      selectedAlbumId: null,
    });
  },
}));

export default useContentStore;
