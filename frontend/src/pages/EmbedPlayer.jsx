import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { publicApi } from '../services/api';
import { cn, formatDuration } from '../lib/utils';

/**
 * EmbedPlayer - Lightweight embeddable media player
 * 
 * URL: /embed/:id
 * 
 * Features:
 * - Lightweight and fast loading
 * - Responsive design
 * - Works for both audio and video
 * - No external dependencies on app state
 * - Supports autoplay parameter
 * - Privacy-respecting (no tracking unless explicitly enabled)
 * 
 * Query Parameters:
 * - autoplay=1 - Start playing automatically
 * - loop=1 - Loop the media
 * - muted=1 - Start muted
 * - start=<seconds> - Start at specific time
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
const APP_DOMAIN = process.env.REACT_APP_DOMAIN || 'https://app.mediacore.in';

export default function EmbedPlayer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  // URL parameters
  const autoplay = searchParams.get('autoplay') === '1';
  const loop = searchParams.get('loop') === '1';
  const startMuted = searchParams.get('muted') === '1';
  const startTime = parseInt(searchParams.get('start') || '0', 10);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(startMuted);
  const [volume, setVolume] = useState(startMuted ? 0 : 1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Refs
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Fetch media data
  const { data, isLoading: isQueryLoading, error } = useQuery({
    queryKey: ['embedMedia', id],
    queryFn: () => publicApi.getMediaById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const media = data?.data;
  const isVideo = media?.type === 'video';

  // Get media source URL
  const getMediaUrl = () => {
    if (!media) return '';
    // Handle HLS
    if (media.isHls && media.hlsPlaylistUrl) {
      return media.hlsPlaylistUrl;
    }
    return media.fileUrl || media.filePath || '';
  };

  // Handle autoplay when media loads
  useEffect(() => {
    if (media && autoplay && !hasInteracted) {
      // Browsers require muted for autoplay
      setIsMuted(true);
      handlePlay();
    }
  }, [media, autoplay]);

  // Set start time
  useEffect(() => {
    if (mediaRef.current && startTime > 0) {
      mediaRef.current.currentTime = startTime;
    }
  }, [startTime, isLoading]);

  // Controls auto-hide
  useEffect(() => {
    const hideControls = () => {
      if (isPlaying && isVideo) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    hideControls();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isVideo, showControls]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Player controls
  const handlePlay = () => {
    if (!mediaRef.current) return;
    
    setHasInteracted(true);
    
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error('Playback failed:', err);
          // If autoplay fails, require user interaction
          if (err.name === 'NotAllowedError') {
            setIsMuted(true);
            setVolume(0);
            mediaRef.current.muted = true;
            mediaRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(console.error);
          }
        });
    }
  };

  const handleToggleMute = () => {
    if (!mediaRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaRef.current.muted = newMuted;
    if (!newMuted && volume === 0) {
      setVolume(1);
      mediaRef.current.volume = 1;
    }
  };

  const handleVolumeChange = (e) => {
    if (!mediaRef.current) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    mediaRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (e) => {
    if (!mediaRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (loop && mediaRef.current) {
      mediaRef.current.currentTime = 0;
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (isFullscreen) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="w-full h-full min-h-[200px] bg-black flex items-center justify-center">
        <div className="text-center text-white/80 px-4">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Content not available</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isQueryLoading || !media) {
    return (
      <div className="w-full h-full min-h-[200px] bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full bg-black overflow-hidden",
        isVideo ? "aspect-video" : "h-[152px]"
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Media Element */}
      {isVideo ? (
        <video
          ref={mediaRef}
          src={getMediaUrl()}
          poster={media.thumbnail}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          playsInline
          muted={isMuted}
        />
      ) : (
        <>
          {/* Audio background with thumbnail */}
          <div className="absolute inset-0">
            {media.thumbnail ? (
              <img
                src={media.thumbnail}
                alt=""
                className="w-full h-full object-cover blur-sm opacity-30"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
            )}
          </div>
          
          <audio
            ref={mediaRef}
            src={getMediaUrl()}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            muted={isMuted}
          />
          
          {/* Audio info overlay */}
          <div className="absolute inset-0 flex items-center px-4 gap-4 z-10">
            {/* Thumbnail */}
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
              {media.thumbnail ? (
                <img
                  src={media.thumbnail}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Play className="h-8 w-8 text-white/50" />
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0 text-white">
              <h3 className="font-semibold text-sm line-clamp-1">{media.title}</h3>
              <p className="text-xs text-white/60 line-clamp-1 mt-1">
                {media.artistName || media.subtitle || 'Unknown'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Click to play overlay (video only, before first interaction) */}
      {isVideo && !hasInteracted && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30"
          onClick={handlePlay}
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="h-8 w-8 text-black ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent",
          isVideo ? "pt-12 pb-3" : "pt-2 pb-2"
        )}
      >
        <div className="px-3">
          {/* Progress bar */}
          <div 
            className="group h-1 bg-white/20 rounded-full cursor-pointer mb-2 hover:h-1.5 transition-all"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={handlePlay}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/vol:w-16 opacity-0 group-hover/vol:opacity-100 transition-all h-1 cursor-pointer accent-primary"
                />
              </div>

              {/* Time display */}
              <span className="text-xs text-white/70 ml-2">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* MediaCore branding */}
              <a
                href={`${APP_DOMAIN}/${isVideo ? 'watch' : 'listen'}/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/50 hover:text-white/80 transition-colors px-2"
              >
                MediaCore
              </a>

              {/* Fullscreen (video only) */}
              {isVideo && (
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
