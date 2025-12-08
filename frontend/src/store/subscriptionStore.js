import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SUBSCRIPTION_TIERS,
  PLAYBACK_LIMITS,
  RESET_INTERVALS,
  LANGUAGE_ACCESS,
  hasUnlimitedPlayback,
  canAccessLanguage,
} from '../config/subscription';

/**
 * Subscription Store
 * Manages user subscription state, playback time tracking, and limit enforcement
 */
const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      // Subscription state
      tier: SUBSCRIPTION_TIERS.FREE,
      isLoaded: false,
      
      // Playback tracking
      playbackTimeUsed: 0,          // Seconds of playback used in current period
      sessionStartTime: null,        // When current session started
      lastResetTime: null,           // When limits were last reset
      nextResetTime: null,           // When limits will reset
      
      // Modal states
      showUpgradeModal: false,
      showTimeLimitModal: false,
      showLoginModal: false,
      showLanguageRestrictionModal: false,
      upgradeReason: null,           // Why upgrade modal is shown
      isPlaybackBlocked: false,      // Whether playback is blocked due to limit
      
      // Current tracking
      isTracking: false,             // Whether currently tracking playback time
      trackingInterval: null,        // Interval ID for time tracking
      
      /**
       * Set user's subscription tier (called when user data loads)
       */
      setTier: (tier) => {
        const validTier = Object.values(SUBSCRIPTION_TIERS).includes(tier)
          ? tier
          : SUBSCRIPTION_TIERS.FREE;
        
        set({ tier: validTier, isLoaded: true });
        
        // Check if limits should reset
        get().checkAndResetLimits();
      },
      
      /**
       * Set subscription tier based on auth state
       */
      setTierFromAuth: (isAuthenticated, userTier) => {
        if (!isAuthenticated) {
          set({ tier: SUBSCRIPTION_TIERS.GUEST, isLoaded: true });
        } else {
          const tier = userTier || SUBSCRIPTION_TIERS.FREE;
          set({ tier, isLoaded: true });
        }
        get().checkAndResetLimits();
      },
      
      /**
       * Check if playback limits should reset and reset if needed
       */
      checkAndResetLimits: () => {
        const { tier, lastResetTime } = get();
        const resetInterval = RESET_INTERVALS[tier];
        
        // If unlimited or no reset interval, no need to track
        if (hasUnlimitedPlayback(tier) || resetInterval === 0) {
          set({ nextResetTime: null, isPlaybackBlocked: false });
          return;
        }
        
        const now = Date.now();
        
        // Check if we need to reset
        if (lastResetTime) {
          const timeSinceReset = now - lastResetTime;
          if (timeSinceReset >= resetInterval) {
            // Reset the limits and unblock playback
            set({
              playbackTimeUsed: 0,
              lastResetTime: now,
              nextResetTime: now + resetInterval,
              isPlaybackBlocked: false,
            });
            return;
          }
        } else {
          // First time - set reset time
          set({
            lastResetTime: now,
            nextResetTime: now + resetInterval,
          });
        }
        
        // Calculate next reset time
        if (lastResetTime) {
          const nextReset = lastResetTime + resetInterval;
          if (nextReset !== get().nextResetTime) {
            set({ nextResetTime: nextReset });
          }
        }
      },
      
      /**
       * Get remaining playback time in seconds
       */
      getRemainingTime: () => {
        const { tier, playbackTimeUsed } = get();
        
        if (hasUnlimitedPlayback(tier)) {
          return -1; // Unlimited
        }
        
        const limit = PLAYBACK_LIMITS[tier];
        return Math.max(0, limit - playbackTimeUsed);
      },
      
      /**
       * Check if user can play content
       */
      canPlay: () => {
        const { tier, playbackTimeUsed, isPlaybackBlocked } = get();
        
        // If blocked, cannot play
        if (isPlaybackBlocked) {
          return false;
        }
        
        if (hasUnlimitedPlayback(tier)) {
          return true;
        }
        
        const limit = PLAYBACK_LIMITS[tier];
        return playbackTimeUsed < limit;
      },
      
      /**
       * Check if user can access a specific language
       */
      canAccessLanguage: (languageCode) => {
        const { tier } = get();
        return canAccessLanguage(tier, languageCode);
      },
      
      /**
       * Start tracking playback time
       */
      startTracking: () => {
        const { isTracking, canPlay, tier } = get();
        
        // Check if user can play
        if (!canPlay()) {
          get().showLimitReachedModal();
          return false;
        }
        
        if (isTracking) return true;
        
        // Don't track for unlimited tiers
        if (hasUnlimitedPlayback(tier)) {
          set({ isTracking: true, sessionStartTime: Date.now() });
          return true;
        }
        
        // Start interval to track time
        const interval = setInterval(() => {
          const { playbackTimeUsed, tier, isTracking } = get();
          
          if (!isTracking) {
            clearInterval(interval);
            return;
          }
          
          const limit = PLAYBACK_LIMITS[tier];
          const newTimeUsed = playbackTimeUsed + 1;
          
          // Check if limit reached
          if (limit > 0 && newTimeUsed >= limit) {
            set({ playbackTimeUsed: limit });
            get().stopTracking();
            get().showLimitReachedModal();
            return;
          }
          
          set({ playbackTimeUsed: newTimeUsed });
          
          // Show warning at 1 minute remaining
          if (limit - newTimeUsed === 60) {
            get().showTimeWarning();
          }
        }, 1000);
        
        set({
          isTracking: true,
          sessionStartTime: Date.now(),
          trackingInterval: interval,
        });
        
        return true;
      },
      
      /**
       * Stop tracking playback time
       */
      stopTracking: () => {
        const { trackingInterval } = get();
        
        if (trackingInterval) {
          clearInterval(trackingInterval);
        }
        
        set({
          isTracking: false,
          trackingInterval: null,
        });
      },
      
      /**
       * Pause tracking (for when player is paused)
       */
      pauseTracking: () => {
        const { trackingInterval } = get();
        
        if (trackingInterval) {
          clearInterval(trackingInterval);
          set({ trackingInterval: null });
        }
      },
      
      /**
       * Resume tracking (for when player resumes)
       */
      resumeTracking: () => {
        const { isTracking, tier, trackingInterval } = get();
        
        if (!isTracking || trackingInterval) return;
        
        // Don't track for unlimited tiers
        if (hasUnlimitedPlayback(tier)) return;
        
        const interval = setInterval(() => {
          const { playbackTimeUsed, tier, isTracking } = get();
          
          if (!isTracking) {
            clearInterval(interval);
            return;
          }
          
          const limit = PLAYBACK_LIMITS[tier];
          const newTimeUsed = playbackTimeUsed + 1;
          
          if (limit > 0 && newTimeUsed >= limit) {
            set({ playbackTimeUsed: limit });
            get().stopTracking();
            get().showLimitReachedModal();
            return;
          }
          
          set({ playbackTimeUsed: newTimeUsed });
        }, 1000);
        
        set({ trackingInterval: interval });
      },
      
      /**
       * Show time warning (1 minute remaining)
       */
      showTimeWarning: () => {
        // This could trigger a toast notification
        console.log('Warning: 1 minute of playback remaining');
      },
      
      /**
       * Show limit reached modal
       */
      showLimitReachedModal: () => {
        const { tier } = get();
        
        // Block playback
        set({ isPlaybackBlocked: true });
        
        if (tier === SUBSCRIPTION_TIERS.GUEST) {
          set({
            showLoginModal: true,
            showTimeLimitModal: false,
          });
        } else {
          set({
            showTimeLimitModal: true,
            showLoginModal: false,
          });
        }
      },
      
      /**
       * Show upgrade modal with reason
       */
      showUpgrade: (reason) => {
        set({
          showUpgradeModal: true,
          upgradeReason: reason,
        });
      },
      
      /**
       * Show language restriction modal
       */
      showLanguageRestriction: () => {
        set({ showLanguageRestrictionModal: true });
      },
      
      /**
       * Close all modals
       */
      closeModals: () => {
        set({
          showUpgradeModal: false,
          showTimeLimitModal: false,
          showLoginModal: false,
          showLanguageRestrictionModal: false,
          upgradeReason: null,
          // Note: isPlaybackBlocked stays true until limit resets
        });
      },
      
      /**
       * Close specific modal
       */
      closeModal: (modal) => {
        switch (modal) {
          case 'upgrade':
            set({ showUpgradeModal: false, upgradeReason: null });
            break;
          case 'timeLimit':
            set({ showTimeLimitModal: false });
            break;
          case 'login':
            set({ showLoginModal: false });
            break;
          case 'language':
            set({ showLanguageRestrictionModal: false });
            break;
          default:
            get().closeModals();
        }
      },
      
      /**
       * Reset all playback tracking (for testing/admin)
       */
      resetPlaybackTracking: () => {
        get().stopTracking();
        set({
          playbackTimeUsed: 0,
          sessionStartTime: null,
          lastResetTime: Date.now(),
          nextResetTime: null,
        });
        get().checkAndResetLimits();
      },
      
      /**
       * Get playback usage percentage
       */
      getUsagePercentage: () => {
        const { tier, playbackTimeUsed } = get();
        
        if (hasUnlimitedPlayback(tier)) {
          return 0;
        }
        
        const limit = PLAYBACK_LIMITS[tier];
        return Math.min(100, (playbackTimeUsed / limit) * 100);
      },
      
      /**
       * Check language access and show modal if restricted
       */
      checkLanguageAccess: (languageCode) => {
        const { tier } = get();
        const access = LANGUAGE_ACCESS[tier];
        
        if (access === 'all') return true;
        
        if (!access.includes(languageCode)) {
          set({
            showLanguageRestrictionModal: true,
            upgradeReason: 'language',
          });
          return false;
        }
        
        return true;
      },
      
      /**
       * Attempt to play content with subscription checks
       */
      attemptPlay: (track) => {
        const { tier, canPlay, checkLanguageAccess } = get();
        
        // Check if user is guest (not logged in)
        if (tier === SUBSCRIPTION_TIERS.GUEST) {
          const remaining = get().getRemainingTime();
          if (remaining <= 0) {
            set({ showLoginModal: true });
            return false;
          }
        }
        
        // Check playback limit
        if (!canPlay()) {
          get().showLimitReachedModal();
          return false;
        }
        
        // Check language access if track has language info
        if (track?.language && track.language !== 'en') {
          if (!checkLanguageAccess(track.language)) {
            return false;
          }
        }
        
        return true;
      },
    }),
    {
      name: 'subscription-storage',
      partialize: (state) => ({
        tier: state.tier,
        playbackTimeUsed: state.playbackTimeUsed,
        lastResetTime: state.lastResetTime,
        nextResetTime: state.nextResetTime,
      }),
    }
  )
);

export default useSubscriptionStore;
