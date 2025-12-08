import { useCallback } from 'react';
import { usePlayerStore, useSubscriptionStore } from '../store';
import { SUBSCRIPTION_TIERS, canAccessLanguage } from '../config/subscription';

/**
 * useSubscribedPlayer Hook
 * Wraps player actions with subscription checks
 */
export function useSubscribedPlayer() {
  const playerStore = usePlayerStore();
  const subscriptionStore = useSubscriptionStore();

  const {
    currentTrack,
    isPlaying,
    playTrack: originalPlayTrack,
    togglePlay: originalTogglePlay,
    play: originalPlay,
    pause: originalPause,
    playNext: originalPlayNext,
    playPrevious: originalPlayPrevious,
  } = playerStore;

  const {
    tier,
    canPlay,
    attemptPlay,
    startTracking,
    stopTracking,
    checkLanguageAccess,
    showUpgrade,
    showLimitReachedModal,
  } = subscriptionStore;

  /**
   * Play a track with subscription checks
   */
  const playTrack = useCallback(async (track, queue = null, resumeFromSaved = true) => {
    // Check subscription limits before playing
    if (!attemptPlay(track)) {
      return false;
    }

    // Play the track
    await originalPlayTrack(track, queue, resumeFromSaved);
    startTracking();
    return true;
  }, [attemptPlay, originalPlayTrack, startTracking]);

  /**
   * Toggle play/pause with subscription checks
   */
  const togglePlay = useCallback(() => {
    if (!isPlaying) {
      // Check if can play before resuming
      if (!canPlay()) {
        showLimitReachedModal();
        return;
      }
      startTracking();
    } else {
      stopTracking();
    }
    originalTogglePlay();
  }, [isPlaying, canPlay, showLimitReachedModal, startTracking, stopTracking, originalTogglePlay]);

  /**
   * Play with subscription checks
   */
  const play = useCallback(() => {
    if (!canPlay()) {
      showLimitReachedModal();
      return;
    }
    startTracking();
    originalPlay();
  }, [canPlay, showLimitReachedModal, startTracking, originalPlay]);

  /**
   * Pause and stop tracking
   */
  const pause = useCallback(() => {
    stopTracking();
    originalPause();
  }, [stopTracking, originalPause]);

  /**
   * Play next with subscription checks
   */
  const playNext = useCallback(() => {
    if (!canPlay()) {
      showLimitReachedModal();
      return;
    }
    originalPlayNext();
  }, [canPlay, showLimitReachedModal, originalPlayNext]);

  /**
   * Play previous with subscription checks
   */
  const playPrevious = useCallback(() => {
    if (!canPlay()) {
      showLimitReachedModal();
      return;
    }
    originalPlayPrevious();
  }, [canPlay, showLimitReachedModal, originalPlayPrevious]);

  /**
   * Check if user can switch to a language
   */
  const canSwitchLanguage = useCallback((languageCode) => {
    return canAccessLanguage(tier, languageCode);
  }, [tier]);

  /**
   * Attempt to switch language with subscription check
   */
  const switchLanguage = useCallback((languageCode, callback) => {
    if (!canAccessLanguage(tier, languageCode)) {
      showUpgrade('language');
      return false;
    }
    if (callback) callback();
    return true;
  }, [tier, showUpgrade]);

  return {
    // Original player state
    ...playerStore,
    
    // Wrapped actions with subscription checks
    playTrack,
    togglePlay,
    play,
    pause,
    playNext,
    playPrevious,
    
    // Language helpers
    canSwitchLanguage,
    switchLanguage,
    
    // Subscription info
    tier,
    canPlay: canPlay(),
  };
}

export default useSubscribedPlayer;
