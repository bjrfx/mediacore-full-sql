import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

// Helper to get JWT auth token
const getAuthToken = async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('User not authenticated');
  }
  return token;
};

// IndexedDB helper for storing large blob data
const DB_NAME = 'MediaCoreDownloads';
const DB_VERSION = 1;
const STORE_NAME = 'media';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (id, blob, mimeType) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, blob, mimeType, savedAt: new Date().toISOString() });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getFromIndexedDB = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteFromIndexedDB = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const clearIndexedDB = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Download status enum
export const DownloadStatus = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
};

const useDownloadStore = create(
  persist(
    (set, get) => ({
      // Downloads metadata (actual blob stored in IndexedDB)
      downloads: {}, // { [mediaId]: { media, status, progress, size, downloadedAt, error } }
      
      // Active download controllers (not persisted)
      activeControllers: {}, // { [mediaId]: AbortController }

      // Start a download
      startDownload: async (media) => {
        const { downloads, activeControllers } = get();
        
        // Check if already downloaded or downloading
        if (downloads[media.id]?.status === DownloadStatus.COMPLETED) {
          return { success: false, message: 'Already downloaded' };
        }
        
        if (downloads[media.id]?.status === DownloadStatus.DOWNLOADING) {
          return { success: false, message: 'Already downloading' };
        }

        // Get auth token first
        let authToken;
        try {
          authToken = await getAuthToken();
        } catch (error) {
          return { success: false, message: 'Please login to download' };
        }

        // Create abort controller for this download
        const controller = new AbortController();
        
        // Update store with pending status
        set((state) => ({
          downloads: {
            ...state.downloads,
            [media.id]: {
              media,
              status: DownloadStatus.DOWNLOADING,
              progress: 0,
              size: 0,
              downloadedSize: 0,
              downloadedAt: null,
              error: null,
            },
          },
          activeControllers: {
            ...state.activeControllers,
            [media.id]: controller,
          },
        }));

        try {
          // Use the backend proxy endpoint for downloading
          const downloadUrl = `${API_BASE_URL}/api/media/${media.id}/download`;
          
          const response = await fetch(downloadUrl, {
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }

          const contentLength = response.headers.get('content-length');
          const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
          const contentType = response.headers.get('content-type') || 'video/mp4';

          // Update size info
          set((state) => ({
            downloads: {
              ...state.downloads,
              [media.id]: {
                ...state.downloads[media.id],
                size: totalSize,
              },
            },
          }));

          // Read the stream
          const reader = response.body.getReader();
          const chunks = [];
          let downloadedSize = 0;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            downloadedSize += value.length;
            
            const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
            
            // Update progress
            set((state) => ({
              downloads: {
                ...state.downloads,
                [media.id]: {
                  ...state.downloads[media.id],
                  progress,
                  downloadedSize,
                },
              },
            }));
          }

          // Combine chunks into blob
          const blob = new Blob(chunks, { type: contentType });
          
          // Save to IndexedDB
          await saveToIndexedDB(media.id, blob, contentType);

          // Update status to completed
          set((state) => {
            const newControllers = { ...state.activeControllers };
            delete newControllers[media.id];
            
            return {
              downloads: {
                ...state.downloads,
                [media.id]: {
                  ...state.downloads[media.id],
                  status: DownloadStatus.COMPLETED,
                  progress: 100,
                  downloadedAt: new Date().toISOString(),
                },
              },
              activeControllers: newControllers,
            };
          });

          return { success: true };
        } catch (error) {
          if (error.name === 'AbortError') {
            // Download was cancelled
            set((state) => {
              const newControllers = { ...state.activeControllers };
              delete newControllers[media.id];
              const newDownloads = { ...state.downloads };
              delete newDownloads[media.id];
              
              return {
                downloads: newDownloads,
                activeControllers: newControllers,
              };
            });
            return { success: false, message: 'Download cancelled' };
          }

          // Determine error message
          let errorMessage = error.message;
          if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            errorMessage = 'Network error - please check your connection';
          } else if (error.message.includes('Rate limit')) {
            errorMessage = 'Download limit reached. Please try again later.';
          }

          // Update status to failed
          set((state) => {
            const newControllers = { ...state.activeControllers };
            delete newControllers[media.id];
            
            return {
              downloads: {
                ...state.downloads,
                [media.id]: {
                  ...state.downloads[media.id],
                  status: DownloadStatus.FAILED,
                  error: errorMessage,
                },
              },
              activeControllers: newControllers,
            };
          });

          return { success: false, message: error.message };
        }
      },

      // Cancel a download
      cancelDownload: (mediaId) => {
        const { activeControllers } = get();
        const controller = activeControllers[mediaId];
        
        if (controller) {
          controller.abort();
        }
      },

      // Remove a download
      removeDownload: async (mediaId) => {
        try {
          await deleteFromIndexedDB(mediaId);
        } catch (error) {
          console.error('Error removing from IndexedDB:', error);
        }

        set((state) => {
          const newDownloads = { ...state.downloads };
          delete newDownloads[mediaId];
          
          const newControllers = { ...state.activeControllers };
          delete newControllers[mediaId];
          
          return {
            downloads: newDownloads,
            activeControllers: newControllers,
          };
        });
      },

      // Get downloaded media blob URL
      getDownloadedUrl: async (mediaId) => {
        try {
          const data = await getFromIndexedDB(mediaId);
          if (data?.blob) {
            return URL.createObjectURL(data.blob);
          }
          return null;
        } catch (error) {
          console.error('Error getting downloaded file:', error);
          return null;
        }
      },

      // Check if media is downloaded and valid
      isDownloaded: (mediaId) => {
        const { downloads } = get();
        return downloads[mediaId]?.status === DownloadStatus.COMPLETED;
      },

      // Get download info
      getDownloadInfo: (mediaId) => {
        const { downloads } = get();
        return downloads[mediaId] || null;
      },

      // Retry failed download
      retryDownload: async (mediaId) => {
        const { downloads } = get();
        const download = downloads[mediaId];
        
        if (download?.status === DownloadStatus.FAILED) {
          return get().startDownload(download.media);
        }
        
        return { success: false, message: 'Download not in failed state' };
      },

      // Clear all downloads
      clearAllDownloads: async () => {
        const { activeControllers } = get();
        
        // Cancel all active downloads
        Object.values(activeControllers).forEach((controller) => {
          controller.abort();
        });

        // Clear IndexedDB
        try {
          await clearIndexedDB();
        } catch (error) {
          console.error('Error clearing IndexedDB:', error);
        }

        set({ downloads: {}, activeControllers: {} });
      },

      // Get all downloaded items
      getDownloadedItems: () => {
        const { downloads } = get();
        return Object.values(downloads).filter(
          (d) => d.status === DownloadStatus.COMPLETED
        );
      },

      // Get downloading items
      getDownloadingItems: () => {
        const { downloads } = get();
        return Object.values(downloads).filter(
          (d) => d.status === DownloadStatus.DOWNLOADING
        );
      },

      // Get total download size
      getTotalDownloadSize: () => {
        const { downloads } = get();
        return Object.values(downloads)
          .filter((d) => d.status === DownloadStatus.COMPLETED)
          .reduce((total, d) => total + (d.size || 0), 0);
      },
    }),
    {
      name: 'download-storage',
      partialize: (state) => ({
        downloads: state.downloads,
      }),
    }
  )
);

export default useDownloadStore;
