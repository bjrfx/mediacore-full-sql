import React, { useRef, useEffect, useCallback, useState, memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Maximize2,
  Minimize2,
  ChevronDown,
  Settings,
  PictureInPicture2,
  Monitor,
  Music,
  Film,
  X,
  Loader2,
  ChevronUp,
  Rewind,
  FastForward,
  WifiOff,
} from 'lucide-react';
import { cn, formatDuration } from '../../lib/utils';
import { usePlayerStore, useLibraryStore, useDownloadStore } from '../../store';
import { publicApi } from '../../services/api';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import ThumbnailFallback from '../media/ThumbnailFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu';
import LanguageSelector from '../player/LanguageSelector';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function MiniPlayer() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [playbackError, setPlaybackError] = useState(null);
  const lastTrackIdRef = useRef(null);
  const lastTimeUpdateRef = useRef(0);

  // Note: Stats tracking is now handled in playerStore via startPlay/recordPlay

  const {
    currentTrack,
    isPlaying,
    isLoading,
    duration,
    currentTime,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    isExpanded,
    isMiniPlayerVisible,
    isVideoMode,
    isFullscreen,
    showControls,
    playbackSpeed,
    buffered,
    seekToTime,
    togglePlay,
    playNext,
    playPrevious,
    setDuration,
    setCurrentTime,
    setIsLoading,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setExpanded,
    toggleVideoMode,
    setFullscreen,
    setShowControls,
    setPlaybackSpeed,
    setBuffered,
    closeMiniPlayer,
    clearSeekToTime,
    playTrack,
  } = usePlayerStore();

  const { toggleFavorite, isFavorite } = useLibraryStore();
  const isVideo = currentTrack?.type === 'video';

  // Fetch language variants for current content
  const { data: languageVariantsData } = useQuery({
    queryKey: ['language-variants', currentTrack?.contentGroupId],
    queryFn: () => publicApi.getLanguageVariants(currentTrack?.contentGroupId),
    enabled: !!currentTrack?.contentGroupId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get available languages for current track
  const availableLanguages = useMemo(() => {
    if (languageVariantsData?.data && languageVariantsData.data.length > 0) {
      return languageVariantsData.data.map(item => ({
        code: item.language || 'en',
        name: item.title,
        mediaId: item.id,
        fileUrl: item.fileUrl,
      }));
    }
    // Fallback: just current track's language
    if (currentTrack?.language) {
      return [{
        code: currentTrack.language,
        name: currentTrack.title,
        mediaId: currentTrack.id,
        fileUrl: currentTrack.fileUrl,
      }];
    }
    return [];
  }, [languageVariantsData, currentTrack]);

  // Handle language change
  const handleLanguageChange = useCallback((langOption) => {
    if (langOption.mediaId && langOption.mediaId !== currentTrack?.id) {
      // Find the full media object from variants
      const variant = languageVariantsData?.data?.find(v => v.id === langOption.mediaId);
      if (variant) {
        // Play the new language variant, preserving current time
        playTrack({
          ...variant,
          language: langOption.code,
        }, null, false); // false = don't resume from saved, we'll set time manually
        
        // Seek to current time after a short delay
        setTimeout(() => {
          if (playerRef.current && currentTime > 0) {
            playerRef.current.seekTo(currentTime, 'seconds');
          }
        }, 500);
      }
    }
  }, [currentTrack, languageVariantsData, playTrack, currentTime]);

  // Auto-hide controls for video
  const hideControls = useCallback(() => {
    if (isPlaying && isVideoMode && isExpanded) {
      setShowControls(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isVideoMode, isExpanded]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isVideoMode && isExpanded) {
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    }
  }, [hideControls, isVideoMode, isExpanded]);

  // Track when track changes for resume tracking
  useEffect(() => {
    if (currentTrack) {
      // Reset time tracking for new track
      if (lastTrackIdRef.current !== currentTrack.id) {
        lastTimeUpdateRef.current = 0;
      }
      lastTrackIdRef.current = currentTrack.id;
    }
  }, [currentTrack?.id]);

  // Note: Stats tracking (listening time + play counts) is now handled 
  // in playerStore via startPlay, updatePlayDuration, and recordPlay

  // Handle seekToTime from store (for resuming playback)
  useEffect(() => {
    if (seekToTime !== null && seekToTime > 0 && playerRef.current) {
      // Small delay to ensure player is ready
      setTimeout(() => {
        playerRef.current?.seekTo(seekToTime, 'seconds');
        clearSeekToTime();
      }, 200);
    }
  }, [seekToTime, clearSeekToTime]);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setFullscreen]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!currentTrack) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          showControlsTemporarily();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            playNext();
          } else {
            const skipTime = e.ctrlKey ? 30 : 10;
            const newTime = Math.min(currentTime + skipTime, duration);
            playerRef.current?.seekTo(newTime, 'seconds');
            setCurrentTime(newTime);
          }
          showControlsTemporarily();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            playPrevious();
          } else {
            const skipTime = e.ctrlKey ? 30 : 10;
            const newTime = Math.max(currentTime - skipTime, 0);
            playerRef.current?.seekTo(newTime, 'seconds');
            setCurrentTime(newTime);
          }
          showControlsTemporarily();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(volume + 0.1, 1));
          showControlsTemporarily();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(volume - 0.1, 0));
          showControlsTemporarily();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          showControlsTemporarily();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreenHandler();
          break;
        case 'KeyV':
          e.preventDefault();
          if (isVideo) toggleVideoMode();
          showControlsTemporarily();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else if (isExpanded) {
            setExpanded(false);
          }
          break;
        case 'KeyJ':
          e.preventDefault();
          const backTime = Math.max(currentTime - 10, 0);
          playerRef.current?.seekTo(backTime, 'seconds');
          setCurrentTime(backTime);
          showControlsTemporarily();
          break;
        case 'KeyL':
          e.preventDefault();
          const fwdTime = Math.min(currentTime + 10, duration);
          playerRef.current?.seekTo(fwdTime, 'seconds');
          setCurrentTime(fwdTime);
          showControlsTemporarily();
          break;
        case 'Home':
          e.preventDefault();
          playerRef.current?.seekTo(0, 'seconds');
          setCurrentTime(0);
          showControlsTemporarily();
          break;
        case 'End':
          e.preventDefault();
          playerRef.current?.seekTo(duration - 1, 'seconds');
          showControlsTemporarily();
          break;
        case 'Comma':
          if (e.shiftKey) {
            e.preventDefault();
            const newSpeed = Math.max(0.25, playbackSpeed - 0.25);
            setPlaybackSpeed(newSpeed);
            showControlsTemporarily();
          }
          break;
        case 'Period':
          if (e.shiftKey) {
            e.preventDefault();
            const newSpeed = Math.min(2, playbackSpeed + 0.25);
            setPlaybackSpeed(newSpeed);
            showControlsTemporarily();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentTrack,
    currentTime,
    duration,
    volume,
    isFullscreen,
    isExpanded,
    isVideo,
    playbackSpeed,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    setExpanded,
    toggleVideoMode,
    setPlaybackSpeed,
    setCurrentTime,
    showControlsTemporarily,
  ]);

  const toggleFullscreenHandler = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const togglePiP = async () => {
    const video = playerRef.current?.getInternalPlayer();
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  const handleProgress = useCallback(
    (state) => {
      if (!seeking) {
        setCurrentTime(state.playedSeconds);
      }
      if (state.loaded) {
        setBuffered(state.loaded * 100);
      }
    },
    [seeking, setCurrentTime, setBuffered]
  );

  const handleDuration = useCallback(
    (dur) => {
      setDuration(dur);
    },
    [setDuration]
  );

  // Handle player ready - also seek if there's a pending seekToTime
  const handleReady = useCallback(() => {
    setIsLoading(false);
    // If there's a pending seek time, seek to it after player is ready
    const storeState = usePlayerStore.getState();
    if (storeState.seekToTime !== null && storeState.seekToTime > 0) {
      setTimeout(() => {
        playerRef.current?.seekTo(storeState.seekToTime, 'seconds');
        storeState.clearSeekToTime();
      }, 100);
    }
  }, [setIsLoading]);

  const handleSeekStart = () => {
    setSeeking(true);
  };

  const handleSeekChange = (value) => {
    setSeekValue(value[0]);
  };

  const handleSeekEnd = (value) => {
    setSeeking(false);
    const seekTime = (value[0] / 100) * duration;
    playerRef.current?.seekTo(seekTime, 'seconds');
    setCurrentTime(seekTime);
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      playerRef.current?.seekTo(0);
    } else {
      playNext();
    }
  };

  // Handle playback errors - fallback to server URL if offline version fails
  const handleError = useCallback(async (error) => {
    console.error('Playback error:', error);
    
    // If playing offline version and it failed, try server URL
    if (currentTrack?.isOffline) {
      setPlaybackError('Offline playback failed. Trying server...');
      
      // Get original track info from download store
      const downloadStore = useDownloadStore.getState();
      const downloadInfo = downloadStore.getDownloadInfo(currentTrack.id);
      
      if (downloadInfo?.media?.fileUrl) {
        // Play from server instead
        setTimeout(() => {
          usePlayerStore.setState({
            currentTrack: { ...downloadInfo.media, isOffline: false },
          });
          setPlaybackError(null);
        }, 1000);
      } else {
        setPlaybackError('Unable to play. Please try downloading again.');
      }
    } else {
      setPlaybackError('Unable to play media');
      setTimeout(() => setPlaybackError(null), 3000);
    }
  }, [currentTrack]);

  // Clear error when track changes
  useEffect(() => {
    setPlaybackError(null);
  }, [currentTrack?.id]);

  const handleDoubleClick = () => {
    if (isExpanded && isVideoMode) {
      toggleFullscreenHandler();
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const isLiked = currentTrack ? isFavorite(currentTrack.id) : false;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!isMiniPlayerVisible || !currentTrack) return null;

  // Expanded full-screen player (Video or Audio)
  if (isExpanded) {
    return (
      <motion.div
        ref={containerRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed inset-0 z-50 flex flex-col',
          isVideoMode && isVideo ? 'bg-black' : 'bg-gradient-to-b from-zinc-900 to-black'
        )}
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => isPlaying && isVideoMode && setShowControls(false)}
      >
        {/* Video/Audio Player */}
        <div 
          className={cn(
            'relative flex-1 flex items-center justify-center',
            isVideoMode && isVideo ? 'w-full h-full' : 'px-8 py-4'
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget || isVideoMode) {
              togglePlay();
              showControlsTemporarily();
            }
          }}
          onDoubleClick={handleDoubleClick}
        >
          {/* ReactPlayer */}
          <ReactPlayer
            ref={playerRef}
            url={currentTrack.fileUrl}
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            playbackRate={playbackSpeed}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onEnded={handleEnded}
            onReady={handleReady}
            onError={handleError}
            onBuffer={() => setIsLoading(true)}
            onBufferEnd={() => setIsLoading(false)}
            width={isVideoMode && isVideo ? '100%' : '0'}
            height={isVideoMode && isVideo ? '100%' : '0'}
            progressInterval={250}
            style={{
              position: isVideoMode && isVideo ? 'absolute' : 'absolute',
              top: 0,
              left: 0,
              visibility: isVideoMode && isVideo ? 'visible' : 'hidden',
              pointerEvents: 'none',
            }}
            config={{
              file: {
                attributes: {
                  style: { width: '100%', height: '100%', objectFit: 'contain' },
                },
              },
            }}
          />

          {/* Loading indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
              >
                <Loader2 className="h-16 w-16 text-white animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audio mode - show album art */}
          {(!isVideoMode || !isVideo) && (
            <div className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-xl shadow-2xl overflow-hidden">
              {currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ThumbnailFallback
                  title={currentTrack.title}
                  id={currentTrack.id}
                  isVideo={isVideo}
                  size="large"
                />
              )}
            </div>
          )}

          {/* Center play button (when paused in video mode) */}
          {isVideoMode && isVideo && !isPlaying && showControls && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-20"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="h-20 w-20 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              >
                <Play className="h-10 w-10 ml-1" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'absolute inset-0 pointer-events-none z-30',
                isVideoMode && isVideo && 'bg-gradient-to-t from-black/90 via-transparent to-black/50'
              )}
            >
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpanded(false)}
                  className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>
                
                <div className="flex-1 text-center">
                  <span className={cn(
                    'text-sm font-medium',
                    isVideoMode && isVideo ? 'text-white/80' : 'text-muted-foreground'
                  )}>
                    Now Playing
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Video/Audio toggle for video files */}
                  {isVideo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleVideoMode}
                            className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                          >
                            {isVideoMode ? <Music className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isVideoMode ? 'Switch to Audio Mode' : 'Switch to Video Mode'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Language selector */}
                  <LanguageSelector
                    currentLanguage={currentTrack?.language || 'en'}
                    availableLanguages={availableLanguages}
                    onLanguageChange={handleLanguageChange}
                    isVideoMode={isVideoMode && isVideo}
                    variant="full"
                  />

                  {/* Settings menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Playback Settings</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          Speed: {playbackSpeed}x
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {PLAYBACK_SPEEDS.map((speed) => (
                            <DropdownMenuItem
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={cn(playbackSpeed === speed && 'bg-accent')}
                            >
                              {speed}x {speed === 1 && '(Normal)'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      {isVideo && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={toggleVideoMode}>
                            {isVideoMode ? (
                              <>
                                <Music className="mr-2 h-4 w-4" />
                                Audio Only Mode
                              </>
                            ) : (
                              <>
                                <Film className="mr-2 h-4 w-4" />
                                Video Mode
                              </>
                            )}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => closeMiniPlayer()}>
                        <X className="mr-2 h-4 w-4" />
                        Close Player
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-auto">
                {/* Track info (always show for audio, show on hover for video) */}
                {(!isVideoMode || !isVideo) && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold truncate">{currentTrack.title}</h2>
                        <p className="text-muted-foreground truncate">{currentTrack.artistName || currentTrack.subtitle || 'Unknown artist'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(currentTrack)}
                      >
                        <Heart
                          className={cn('h-6 w-6', isLiked && 'fill-primary text-primary')}
                        />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Video mode track info (shown in bottom bar) */}
                {isVideoMode && isVideo && (
                  <div className="mb-2 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white text-lg font-semibold truncate">{currentTrack.title}</h2>
                      {currentTrack.subtitle && (
                        <p className="text-white/70 text-sm truncate">{currentTrack.subtitle}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(currentTrack)}
                      className="text-white hover:bg-white/20"
                    >
                      <Heart
                        className={cn('h-5 w-5', isLiked && 'fill-primary text-primary')}
                      />
                    </Button>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="relative group">
                    {/* Buffered progress */}
                    <div
                      className="absolute h-1 bg-white/30 rounded-full"
                      style={{ width: `${buffered}%` }}
                    />
                    <Slider
                      value={[seeking ? seekValue : progress]}
                      max={100}
                      step={0.1}
                      onValueChange={handleSeekChange}
                      onPointerDown={handleSeekStart}
                      onValueCommit={handleSeekEnd}
                      className={cn(
                        'w-full',
                        isVideoMode && isVideo && '[&_[role=slider]]:bg-white [&_.range]:bg-white'
                      )}
                    />
                  </div>
                  <div className={cn(
                    'flex justify-between mt-1 text-xs',
                    isVideoMode && isVideo ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Main controls */}
                <div className="flex items-center justify-between">
                  {/* Left controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleShuffle}
                      className={cn(
                        isShuffled && 'text-primary',
                        isVideoMode && isVideo && 'text-white hover:bg-white/20'
                      )}
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Center controls */}
                  <div className="flex items-center gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newTime = Math.max(currentTime - 10, 0);
                              playerRef.current?.seekTo(newTime, 'seconds');
                              setCurrentTime(newTime);
                            }}
                            className={cn(
                              'hidden md:flex',
                              isVideoMode && isVideo && 'text-white hover:bg-white/20'
                            )}
                          >
                            <Rewind className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rewind 10s (J)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      variant="ghost"
                      size="iconLg"
                      onClick={playPrevious}
                      className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                    >
                      <SkipBack className="h-7 w-7" />
                    </Button>

                    <Button
                      variant={isVideoMode && isVideo ? 'ghost' : 'spotify'}
                      size="iconLg"
                      onClick={togglePlay}
                      className={cn(
                        'h-14 w-14 md:h-16 md:w-16 rounded-full',
                        isVideoMode && isVideo && 'bg-white/20 hover:bg-white/30 text-white'
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8 ml-1" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="iconLg"
                      onClick={playNext}
                      className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                    >
                      <SkipForward className="h-7 w-7" />
                    </Button>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newTime = Math.min(currentTime + 10, duration);
                              playerRef.current?.seekTo(newTime, 'seconds');
                              setCurrentTime(newTime);
                            }}
                            className={cn(
                              'hidden md:flex',
                              isVideoMode && isVideo && 'text-white hover:bg-white/20'
                            )}
                          >
                            <FastForward className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Forward 10s (L)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleRepeat}
                      className={cn(
                        repeatMode !== 'off' && 'text-primary',
                        isVideoMode && isVideo && 'text-white hover:bg-white/20'
                      )}
                    >
                      {repeatMode === 'one' ? (
                        <Repeat1 className="h-5 w-5" />
                      ) : (
                        <Repeat className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Bottom row - Volume and extra controls */}
                <div className="hidden md:flex items-center justify-between mt-4">
                  {/* Volume */}
                  <div className="flex items-center gap-2 w-32">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={toggleMute}
                      className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                    >
                      <VolumeIcon className="h-4 w-4" />
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={(value) => setVolume(value[0] / 100)}
                      className={cn(
                        'w-24',
                        isVideoMode && isVideo && '[&_[role=slider]]:bg-white [&_.range]:bg-white'
                      )}
                    />
                  </div>

                  {/* Playback speed indicator */}
                  {playbackSpeed !== 1 && (
                    <span className={cn(
                      'text-xs px-2 py-1 rounded bg-primary/20',
                      isVideoMode && isVideo ? 'text-white' : 'text-primary'
                    )}>
                      {playbackSpeed}x
                    </span>
                  )}

                  {/* Extra controls */}
                  <div className="flex items-center gap-2">
                    {/* PiP button (video only) */}
                    {isVideo && isVideoMode && document.pictureInPictureEnabled && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="iconSm"
                              onClick={togglePiP}
                              className="text-white hover:bg-white/20"
                            >
                              <PictureInPicture2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Picture in Picture</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Fullscreen button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="iconSm"
                            onClick={toggleFullscreenHandler}
                            className={cn(isVideoMode && isVideo && 'text-white hover:bg-white/20')}
                          >
                            {isFullscreen ? (
                              <Minimize2 className="h-4 w-4" />
                            ) : (
                              <Maximize2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Keyboard shortcuts hint */}
                {isVideoMode && isVideo && (
                  <div className="hidden lg:block text-center mt-4 text-white/40 text-xs">
                    Space: Play/Pause • F: Fullscreen • M: Mute • J/L: ±10s • V: Toggle Video/Audio
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Mini player bar
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="mini-player flex items-center px-4 gap-4"
    >
      {/* Hidden audio player for mini mode */}
      <div className="fixed" style={{ top: -9999, left: -9999 }}>
        <ReactPlayer
          ref={playerRef}
          url={currentTrack.fileUrl}
          playing={isPlaying}
          volume={isMuted ? 0 : volume}
          playbackRate={playbackSpeed}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={handleEnded}
          onReady={handleReady}
          onError={handleError}
          onBuffer={() => setIsLoading(true)}
          onBufferEnd={() => setIsLoading(false)}
          width="0"
          height="0"
          progressInterval={500}
          style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
        />
      </div>

      {/* Playback Error Toast */}
      <AnimatePresence>
        {playbackError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/90 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <WifiOff className="w-4 h-4" />
            {playbackError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Track info */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 relative">
          {currentTrack.thumbnail ? (
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <ThumbnailFallback
              title={currentTrack.title}
              id={currentTrack.id}
              isVideo={isVideo}
              size="small"
            />
          )}
          {/* Video indicator */}
          {isVideo && (
            <div className="absolute bottom-1 right-1 bg-black/70 rounded px-1">
              <Film className="w-3 h-3 text-white" />
            </div>
          )}
          {/* Offline indicator */}
          {currentTrack.isOffline && (
            <div className="absolute top-1 left-1 bg-green-500/90 rounded px-1 py-0.5">
              <span className="text-[10px] font-medium text-white">OFFLINE</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate hover:underline">
            {currentTrack.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.artistName || currentTrack.subtitle || 'Unknown'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(currentTrack);
          }}
          className="hidden sm:flex"
        >
          <Heart
            className={cn('h-4 w-4', isLiked && 'fill-primary text-primary')}
          />
        </Button>
      </div>

      {/* Center controls */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={toggleShuffle}
                className={cn('hidden md:flex', isShuffled && 'text-primary')}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shuffle</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" onClick={playPrevious}>
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button
            variant="spotify"
            size="icon"
            onClick={togglePlay}
            className="rounded-full"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={playNext}>
            <SkipForward className="h-5 w-5" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={toggleRepeat}
                className={cn('hidden md:flex', repeatMode !== 'off' && 'text-primary')}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="h-4 w-4" />
                ) : (
                  <Repeat className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {repeatMode === 'off' ? 'Enable repeat' : repeatMode === 'all' ? 'Repeat one' : 'Disable repeat'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right controls */}
      <div className="hidden md:flex items-center gap-2 w-48 justify-end">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatDuration(currentTime)}
        </span>
        <Slider
          value={[seeking ? seekValue : progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeekChange}
          onPointerDown={handleSeekStart}
          onValueCommit={handleSeekEnd}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Language selector for mini player */}
      <div className="hidden md:flex">
        <LanguageSelector
          currentLanguage={currentTrack?.language || 'en'}
          availableLanguages={availableLanguages}
          onLanguageChange={handleLanguageChange}
          isVideoMode={false}
          variant="mini"
        />
      </div>

      {/* Volume */}
      <div className="hidden lg:flex items-center gap-2 w-32">
        <Button variant="ghost" size="iconSm" onClick={toggleMute}>
          <VolumeIcon className="h-4 w-4" />
        </Button>
        <Slider
          value={[isMuted ? 0 : volume * 100]}
          max={100}
          step={1}
          onValueChange={(value) => setVolume(value[0] / 100)}
          className="w-20"
        />
      </div>

      {/* Expand button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setExpanded(true)}
              className="hidden sm:flex"
            >
              {isVideo ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideo ? 'Open Video Player' : 'Expand Player'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}

export default memo(MiniPlayer);
