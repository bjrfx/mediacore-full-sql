import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Helper to check subscription (imported dynamically to avoid circular dependency)
const checkSubscription = async () => {
  try {
    const subscriptionStore = (await import('./subscriptionStore')).default;
    const state = subscriptionStore.getState();
    
    if (!state.canPlay()) {
      state.showLimitReachedModal();
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return true; // Allow play if check fails
  }
};

// Helper to get stats store (imported dynamically to avoid circular dependency)
const getStatsStore = async () => {
  try {
    const statsStore = (await import('./statsStore')).default;
    return statsStore.getState();
  } catch (error) {
    console.error('Error getting stats store:', error);
    return null;
  }
};

const usePlayerStore = create(
  persist(
    (set, get) => ({
      // Current playing track
      currentTrack: null,
      queue: [],
      queueIndex: 0,

      // Playback state
      isPlaying: false,
      isLoading: false,
      duration: 0,
      currentTime: 0,
      volume: 0.8,
      isMuted: false,
      isShuffled: false,
      repeatMode: 'off', // 'off', 'all', 'one'
      playbackSpeed: 1,

      // Video-specific state
      isVideoMode: true, // true = show video, false = audio only mode
      isFullscreen: false,
      showControls: true,
      buffered: 0,
      quality: 'auto',
      isPiP: false,

      // UI state
      isExpanded: false,
      isMiniPlayerVisible: false,

      // Resume playback - flag to indicate player should seek
      seekToTime: null, // When set, player should seek to this time

      // Resume playback progress tracking
      playbackProgress: {}, // { [mediaId]: { currentTime, duration, percentage, updatedAt } }

      // Actions
      setCurrentTrack: (track) => {
        // Save progress of current track before switching
        const { currentTrack, currentTime, duration } = get();
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        // Get saved progress for new track
        const savedProgress = track ? get().playbackProgress[track.id] : null;
        const resumeTime = savedProgress?.currentTime || 0;

        set({
          currentTrack: track,
          isMiniPlayerVisible: !!track,
          isLoading: true,
          currentTime: resumeTime,
          duration: 0,
          // Auto set video mode based on track type
          isVideoMode: track?.type === 'video',
        });
        // Add to history
        if (track) {
          get().addToHistory(track);
        }
      },

      setQueue: (queue, startIndex = 0) => {
        set({
          queue,
          queueIndex: startIndex,
          currentTrack: queue[startIndex] || null,
          isMiniPlayerVisible: queue.length > 0,
        });
      },

      playTrack: async (track, queue = null, resumeFromSaved = true) => {
        // Check subscription before playing
        const canPlay = await checkSubscription();
        if (!canPlay) {
          return; // Subscription modal will be shown
        }
        
        // Save progress of current track before switching
        const { currentTrack, currentTime, duration } = get();
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        // Record stats for previous track before switching
        const statsStore = await getStatsStore();
        if (statsStore && currentTrack) {
          await statsStore.recordPlay(false); // Not completed, just switched
        }

        // Start tracking new track for stats
        if (statsStore && track) {
          statsStore.startPlay(track);
        }
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        // Get saved progress for new track
        const savedProgress = resumeFromSaved ? get().playbackProgress[track.id] : null;
        const resumeTime = savedProgress?.currentTime || 0;

        // Check for downloaded version (imported dynamically to avoid circular dependency)
        let trackToPlay = track;
        try {
          const downloadStore = (await import('./downloadStore')).default;
          const downloadState = downloadStore.getState();
          if (downloadState.isDownloaded(track.id)) {
            const downloadedUrl = await downloadState.getDownloadedUrl(track.id);
            if (downloadedUrl) {
              trackToPlay = { ...track, fileUrl: downloadedUrl, isOffline: true };
            }
          }
        } catch (error) {
          console.error('Error checking download:', error);
        }

        if (queue) {
          const index = queue.findIndex((t) => t.id === track.id);
          set({
            queue,
            queueIndex: index >= 0 ? index : 0,
            currentTrack: trackToPlay,
            isPlaying: true,
            isMiniPlayerVisible: true,
            currentTime: resumeTime,
            seekToTime: resumeTime > 0 ? resumeTime : null, // Signal player to seek
          });
        } else {
          set({
            currentTrack: trackToPlay,
            isPlaying: true,
            isMiniPlayerVisible: true,
            currentTime: resumeTime,
            seekToTime: resumeTime > 0 ? resumeTime : null, // Signal player to seek
          });
        }
        if (track) {
          get().addToHistory(track);
        }
      },

      // Clear seek request after player has seeked
      clearSeekToTime: () => set({ seekToTime: null }),

      // Save playback progress
      saveProgress: (mediaId, currentTime, duration) => {
        if (!mediaId || duration <= 0) return;
        
        const percentage = Math.round((currentTime / duration) * 100);
        
        // Only save if more than 5% and less than 95% complete
        if (percentage >= 5 && percentage < 95) {
          set((state) => ({
            playbackProgress: {
              ...state.playbackProgress,
              [mediaId]: {
                currentTime,
                duration,
                percentage,
                updatedAt: new Date().toISOString(),
              },
            },
          }));
        } else if (percentage >= 95) {
          // Remove from progress if completed
          set((state) => {
            const { [mediaId]: _, ...rest } = state.playbackProgress;
            return { playbackProgress: rest };
          });
        }
      },

      // Get items that can be resumed
      getResumeItems: () => {
        const { playbackProgress, history } = get();
        const progressIds = Object.keys(playbackProgress);
        
        // Match progress with history items to get full media info
        return history
          .filter((item) => progressIds.includes(item.id))
          .map((item) => ({
            ...item,
            progress: playbackProgress[item.id],
          }))
          .sort((a, b) => new Date(b.progress.updatedAt) - new Date(a.progress.updatedAt))
          .slice(0, 10);
      },

      // Clear progress for a specific item
      clearProgress: (mediaId) => {
        set((state) => {
          const { [mediaId]: _, ...rest } = state.playbackProgress;
          return { playbackProgress: rest };
        });
      },

      // Clear all progress
      clearAllProgress: () => set({ playbackProgress: {} }),

      togglePlay: async () => {
        const { isPlaying } = get();
        // Only check subscription when trying to play (not pause)
        if (!isPlaying) {
          const canPlay = await checkSubscription();
          if (!canPlay) return;
        }
        set((state) => ({ isPlaying: !state.isPlaying }));
      },
      play: async () => {
        const canPlay = await checkSubscription();
        if (!canPlay) return;
        set({ isPlaying: true });
      },
      pause: () => {
        // Save progress when pausing
        const { currentTrack, currentTime, duration } = get();
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }
        set({ isPlaying: false });
      },

      playNext: async () => {
        // Check subscription before playing next
        const canPlay = await checkSubscription();
        if (!canPlay) return;
        
        const { queue, queueIndex, repeatMode, isShuffled, currentTrack, currentTime, duration } = get();
        
        // Save progress of current track
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        // Record stats for completed track
        const statsStore = await getStatsStore();
        const isCompleted = duration > 0 && (currentTime / duration) > 0.9; // 90% = completed
        if (statsStore && currentTrack) {
          await statsStore.recordPlay(isCompleted);
        }

        if (queue.length === 0) return;

        let nextIndex;
        if (repeatMode === 'one') {
          nextIndex = queueIndex;
        } else if (isShuffled) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else {
          nextIndex = queueIndex + 1;
          if (nextIndex >= queue.length) {
            nextIndex = repeatMode === 'all' ? 0 : queueIndex;
          }
        }

        const nextTrack = queue[nextIndex];
        if (nextTrack) {
          // Start tracking new track for stats
          if (statsStore) {
            statsStore.startPlay(nextTrack);
          }
          
          const savedProgress = get().playbackProgress[nextTrack.id];
          set({
            queueIndex: nextIndex,
            currentTrack: nextTrack,
            isPlaying: true,
            currentTime: savedProgress?.currentTime || 0,
          });
          get().addToHistory(nextTrack);
        }
      },

      playPrevious: async () => {
        const { queue, queueIndex, currentTime, currentTrack, duration } = get();
        if (queue.length === 0) return;

        // If more than 3 seconds into the track, restart it
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        // Check subscription before playing previous
        const canPlay = await checkSubscription();
        if (!canPlay) return;

        // Save progress of current track
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
        const prevTrack = queue[prevIndex];
        if (prevTrack) {
          const savedProgress = get().playbackProgress[prevTrack.id];
          set({
            queueIndex: prevIndex,
            currentTrack: prevTrack,
            isPlaying: true,
            currentTime: savedProgress?.currentTime || 0,
          });
        }
      },

      setDuration: (duration) => set({ duration }),
      setCurrentTime: (currentTime) => {
        const previousTime = get().currentTime;
        set({ currentTime });
        
        // Periodically save progress (every 10 seconds of playback)
        const { currentTrack, duration } = get();
        if (currentTrack && duration > 0 && Math.floor(currentTime) % 10 === 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        // Update stats tracking every second
        if (Math.floor(currentTime) > Math.floor(previousTime)) {
          const timeDiff = currentTime - previousTime;
          if (timeDiff > 0 && timeDiff < 5) { // Sanity check - ignore large jumps (seeks)
            getStatsStore().then(statsStore => {
              if (statsStore) {
                statsStore.updatePlayDuration(timeDiff);
              }
            });
          }
        }
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      setBuffered: (buffered) => set({ buffered }),

      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      toggleMute: () =>
        set((state) => ({
          isMuted: !state.isMuted,
        })),

      toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
      
      toggleRepeat: () =>
        set((state) => {
          const modes = ['off', 'all', 'one'];
          const currentIndex = modes.indexOf(state.repeatMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          return { repeatMode: modes[nextIndex] };
        }),

      // Video-specific actions
      setVideoMode: (isVideoMode) => set({ isVideoMode }),
      toggleVideoMode: () => set((state) => ({ isVideoMode: !state.isVideoMode })),
      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
      setShowControls: (showControls) => set({ showControls }),
      setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
      setQuality: (quality) => set({ quality }),
      setPiP: (isPiP) => set({ isPiP }),

      setExpanded: (expanded) => set({ isExpanded: expanded }),
      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

      closeMiniPlayer: async () => {
        // Save progress before closing
        const { currentTrack, currentTime, duration } = get();
        if (currentTrack && currentTime > 5 && duration > 0) {
          get().saveProgress(currentTrack.id, currentTime, duration);
        }

        // Record stats before closing
        const statsStore = await getStatsStore();
        if (statsStore && currentTrack) {
          await statsStore.recordPlay(false); // Not completed
        }
        
        set({
          currentTrack: null,
          isPlaying: false,
          isMiniPlayerVisible: false,
          queue: [],
          queueIndex: 0,
        });
      },

      // History
      history: [],
      addToHistory: (track) => {
        set((state) => {
          const filteredHistory = state.history.filter((t) => t.id !== track.id);
          return {
            history: [
              { ...track, playedAt: new Date().toISOString() },
              ...filteredHistory,
            ].slice(0, 100),
          };
        });
      },
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
        history: state.history,
        playbackProgress: state.playbackProgress,
      }),
    }
  )
);

export default usePlayerStore;
