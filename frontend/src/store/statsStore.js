import { create } from 'zustand';
import { userApi } from '../services/api';

const useStatsStore = create((set, get) => ({
  // Stats from API
  stats: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Pending play to record (for when track completes)
  pendingPlay: null,

  // Fetch stats from API
  fetchStats: async () => {
    const { isLoading, lastFetched } = get();
    
    // Don't fetch if already loading or fetched recently (within 30 seconds)
    if (isLoading) return;
    if (lastFetched && Date.now() - lastFetched < 30000) {
      return get().stats;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await userApi.getStats();
      const statsData = response?.data || response;
      
      set({ 
        stats: statsData, 
        isLoading: false,
        lastFetched: Date.now(),
      });
      
      return statsData;
    } catch (error) {
      console.error('[Stats] Failed to fetch stats:', error);
      set({ 
        error: error.message, 
        isLoading: false,
      });
      return null;
    }
  },

  // Start tracking a play (called when track starts)
  startPlay: (track) => {
    if (!track?.id) return;

    set({
      pendingPlay: {
        mediaId: track.id,
        artistId: track.artistId || null,
        title: track.title,
        artistName: track.artist || track.artistName,
        startTime: Date.now(),
        duration: 0,
        completed: false,
      },
    });
  },

  // Update play duration (called periodically during playback)
  updatePlayDuration: (seconds) => {
    const { pendingPlay } = get();
    if (!pendingPlay) return;

    set({
      pendingPlay: {
        ...pendingPlay,
        duration: pendingPlay.duration + seconds,
      },
    });
  },

  // Record play to API (called when track ends or changes)
  recordPlay: async (completed = false) => {
    const { pendingPlay } = get();
    if (!pendingPlay) return;

    // Only record if listened for at least 10 seconds
    if (pendingPlay.duration < 10) {
      set({ pendingPlay: null });
      return;
    }

    try {
      const playData = {
        mediaId: pendingPlay.mediaId,
        duration: Math.round(pendingPlay.duration),
        completed,
        artistId: pendingPlay.artistId,
        title: pendingPlay.title,
        artistName: pendingPlay.artistName,
      };

      console.log('[Stats] Recording play:', playData);
      
      const response = await userApi.recordPlay(playData);
      
      // Update local stats with response
      if (response?.stats) {
        set((state) => ({
          stats: state.stats ? {
            ...state.stats,
            totalListeningTime: response.stats.totalListeningTime,
            totalPlays: response.stats.totalPlays,
            currentStreak: response.stats.currentStreak,
            longestStreak: response.stats.longestStreak,
          } : null,
          pendingPlay: null,
        }));
      } else {
        set({ pendingPlay: null });
      }

      // Invalidate cache to refetch full stats
      set({ lastFetched: null });

      return response;
    } catch (error) {
      console.error('[Stats] Failed to record play:', error);
      set({ pendingPlay: null });
      return null;
    }
  },

  // Reset all stats (for testing/privacy)
  resetStats: async () => {
    set({ isLoading: true, error: null });

    try {
      await userApi.resetStats();
      set({ 
        stats: null, 
        isLoading: false,
        lastFetched: null,
      });
      return true;
    } catch (error) {
      console.error('[Stats] Failed to reset stats:', error);
      set({ 
        error: error.message, 
        isLoading: false,
      });
      return false;
    }
  },

  // Clear local state (for logout)
  clearLocalStats: () => {
    set({
      stats: null,
      isLoading: false,
      error: null,
      lastFetched: null,
      pendingPlay: null,
    });
  },

  // Helper: Get stats summary for display
  getStatsSummary: () => {
    const { stats } = get();
    if (!stats) {
      return {
        totalHours: 0,
        totalMinutes: 0,
        totalListeningTime: 0,
        totalPlays: 0,
        uniqueTracks: 0,
        uniqueArtists: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    const totalSeconds = stats.totalListeningTime || 0;
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    return {
      totalHours,
      totalMinutes,
      totalListeningTime: totalSeconds,
      totalPlays: stats.totalPlays || 0,
      uniqueTracks: stats.uniqueTracks || 0,
      uniqueArtists: stats.uniqueArtists || 0,
      currentStreak: stats.currentStreak || 0,
      longestStreak: stats.longestStreak || 0,
    };
  },

  // Helper: Get top tracks
  getTopTracks: (limit = 10) => {
    const { stats } = get();
    if (!stats?.topTracks) return [];
    return stats.topTracks.slice(0, limit);
  },

  // Helper: Get top artists
  getTopArtists: (limit = 10) => {
    const { stats } = get();
    if (!stats?.topArtists) return [];
    return stats.topArtists.slice(0, limit);
  },

  // Helper: Get weekly activity for chart
  getWeeklyActivity: () => {
    const { stats } = get();
    const result = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const seconds = stats?.weeklyActivity?.[dateStr] || 0;
      
      result.push({
        date: dateStr,
        displayDate: dayName,
        seconds,
        minutes: Math.floor(seconds / 60),
      });
    }
    
    return result;
  },
}));

export default useStatsStore;
