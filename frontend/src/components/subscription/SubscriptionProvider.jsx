import React, { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../../store';
import useSubscriptionStore from '../../store/subscriptionStore';
import usePlayerStore from '../../store/playerStore';
import { userApi } from '../../services/api';
import {
  UpgradeModal,
  TimeLimitModal,
  LoginPromptModal,
  LanguageRestrictionModal,
} from '../subscription';
import { SUBSCRIPTION_TIERS } from '../../config/subscription';

// Heartbeat interval: 30 seconds
const HEARTBEAT_INTERVAL = 30000;

// Subscription refresh interval: 60 seconds (to pick up admin changes)
const SUBSCRIPTION_REFRESH_INTERVAL = 60000;

/**
 * SubscriptionProvider
 * Wraps the app and handles subscription state, enforcement, and modals
 */
export default function SubscriptionProvider({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  const {
    tier: currentTier,
    setTierFromAuth,
    showUpgradeModal,
    showTimeLimitModal,
    showLoginModal,
    showLanguageRestrictionModal,
    upgradeReason,
    closeModal,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    checkAndResetLimits,
  } = useSubscriptionStore();
  
  const { isPlaying, currentTrack, pause } = usePlayerStore();
  const heartbeatIntervalRef = useRef(null);
  const subscriptionRefreshIntervalRef = useRef(null);

  // Function to fetch subscription from API
  const fetchSubscription = useCallback(async (forceUpdate = false) => {
    if (!isAuthenticated || !user) {
      setTierFromAuth(false, null);
      return;
    }
    
    try {
      const response = await userApi.getMySubscription();
      const tier = response?.data?.subscriptionTier || response?.subscriptionTier || SUBSCRIPTION_TIERS.FREE;
      console.log('[Subscription] Fetched tier from server:', tier, 'Current local tier:', currentTier);
      
      // Always update from server - server is the source of truth
      if (forceUpdate || tier !== currentTier) {
        console.log('[Subscription] Updating tier from', currentTier, 'to', tier);
        setTierFromAuth(true, tier);
      }
    } catch (error) {
      console.log('[Subscription] Failed to fetch subscription:', error.message);
      // Only set to free if we don't have a tier yet
      if (!currentTier || currentTier === SUBSCRIPTION_TIERS.GUEST) {
        setTierFromAuth(true, SUBSCRIPTION_TIERS.FREE);
      }
    }
  }, [isAuthenticated, user, currentTier, setTierFromAuth]);

  // Sync subscription tier with auth state on login/logout - ALWAYS fetch fresh from server
  useEffect(() => {
    if (isAuthenticated && user) {
      // Force update on initial load to get fresh data from server
      fetchSubscription(true);
    } else {
      setTierFromAuth(false, null);
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically refresh subscription to pick up admin changes
  useEffect(() => {
    if (!isAuthenticated) {
      if (subscriptionRefreshIntervalRef.current) {
        clearInterval(subscriptionRefreshIntervalRef.current);
        subscriptionRefreshIntervalRef.current = null;
      }
      return;
    }

    // Refresh subscription every 60 seconds
    subscriptionRefreshIntervalRef.current = setInterval(() => {
      fetchSubscription();
    }, SUBSCRIPTION_REFRESH_INTERVAL);

    return () => {
      if (subscriptionRefreshIntervalRef.current) {
        clearInterval(subscriptionRefreshIntervalRef.current);
        subscriptionRefreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchSubscription]);

  // Refresh subscription when window regains focus (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log('[Subscription] Tab became visible, refreshing subscription...');
        fetchSubscription();
      }
    };

    const handleFocus = () => {
      if (isAuthenticated) {
        console.log('[Subscription] Window focused, refreshing subscription...');
        fetchSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, fetchSubscription]);

  // Heartbeat to track online status
  useEffect(() => {
    const sendHeartbeat = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await userApi.sendHeartbeat();
        console.debug('[Heartbeat] Sent successfully:', response);
      } catch (error) {
        // Log the error for debugging
        console.warn('[Heartbeat] Failed:', error.message);
        if (error.response) {
          console.warn('[Heartbeat] Server response:', error.response.status, error.response.data);
        }
      }
    };

    if (isAuthenticated) {
      // Send immediately when user logs in
      sendHeartbeat();
      
      // Then send every 30 seconds
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // Check and reset limits periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndResetLimits();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkAndResetLimits]);

  // Handle playback tracking based on player state
  useEffect(() => {
    if (isPlaying && currentTrack) {
      startTracking();
    } else {
      pauseTracking();
    }
  }, [isPlaying, currentTrack, startTracking, pauseTracking]);

  // CRITICAL: Pause playback when any restriction modal shows
  useEffect(() => {
    if (showTimeLimitModal || showLoginModal || showLanguageRestrictionModal) {
      if (isPlaying) {
        pause();
        stopTracking();
      }
    }
  }, [showTimeLimitModal, showLoginModal, showLanguageRestrictionModal, isPlaying, pause, stopTracking]);

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Handle modal closes
  const handleUpgradeClose = useCallback((open) => {
    if (!open) closeModal('upgrade');
  }, [closeModal]);

  const handleTimeLimitClose = useCallback((open) => {
    if (!open) closeModal('timeLimit');
  }, [closeModal]);

  const handleLoginClose = useCallback((open) => {
    if (!open) closeModal('login');
  }, [closeModal]);

  const handleLanguageClose = useCallback((open) => {
    if (!open) closeModal('language');
  }, [closeModal]);

  return (
    <>
      {children}

      {/* Subscription Modals */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={handleUpgradeClose}
        reason={upgradeReason}
      />

      <TimeLimitModal
        open={showTimeLimitModal}
        onOpenChange={handleTimeLimitClose}
      />

      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={handleLoginClose}
      />

      <LanguageRestrictionModal
        open={showLanguageRestrictionModal}
        onOpenChange={handleLanguageClose}
      />
    </>
  );
}
