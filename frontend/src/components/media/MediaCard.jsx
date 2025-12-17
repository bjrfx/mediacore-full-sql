import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, MoreHorizontal, Heart, ListPlus, Download, Trash2, Share2 } from 'lucide-react';
import { cn, getLanguageName } from '../../lib/utils';
import usePlayerStore from '../../store/playerStore';
import useLibraryStore from '../../store/libraryStore';
import useUIStore from '../../store/uiStore';
import useDownloadStore from '../../store/downloadStore';
import useAuthStore from '../../store/authStore';
import { Button } from '../ui/button';
import DownloadButton from '../ui/DownloadButton';
import ThumbnailFallback from './ThumbnailFallback';
import { MediaActionsButton } from './ShareMenu';

export default function MediaCard({ media, queue = [], index = 0, size = 'medium' }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useLibraryStore();
  const { openModal } = useUIStore();
  const { user } = useAuthStore();
  const { startDownload, removeDownload, isDownloaded } = useDownloadStore();

  // Long press handling for mobile
  const longPressRef = useRef(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const isCurrentTrack = currentTrack?.id === media.id;
  const isLiked = isFavorite(media.id);
  const isVideo = media.type === 'video';
  const downloaded = isDownloaded(media.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(media, queue.length > 0 ? queue : [media]);
    }
  };

  const handleCardClick = () => {
    if (isLongPressing) return;
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(media, queue.length > 0 ? queue : [media]);
    }
  };

  // Long press handlers for mobile
  const handleTouchStart = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    setTimeout(() => setIsLongPressing(false), 100);
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const sizeClasses = {
    small: 'w-36',
    medium: 'w-44',
    large: 'w-52',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={cn(
        'media-card group cursor-pointer',
        sizeClasses[size]
      )}
    >
      {/* Thumbnail */}
      <div className="media-card-image">
        <div className="w-full h-full">
          {media.thumbnail ? (
            <img
              src={media.thumbnail}
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <ThumbnailFallback
              title={media.title}
              id={media.id}
              isVideo={isVideo}
              size="medium"
            />
          )}
        </div>

        {/* Play button overlay */}
        <div className="play-button-overlay">
          <motion.div
            initial={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="relative"
          >
            <Button
              variant="spotify"
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-xl',
                isCurrentTrack && isPlaying && 'animate-pulse-glow'
              )}
              onClick={handlePlay}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
          </motion.div>
        </div>

        {/* ALWAYS VISIBLE 3-dot action button - top right */}
        <div className="absolute top-2 right-2 z-10">
          <MediaActionsButton 
            media={media} 
            queue={queue}
            className="bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white h-8 w-8"
            alwaysVisible={true}
            size="iconSm"
          />
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium backdrop-blur-md',
              isVideo
                ? 'text-[#6366F1]'
                : 'text-[#22C55E]'
            )}
            style={isVideo 
              ? { background: 'rgba(99, 102, 241, 0.15)' }
              : { background: 'rgba(34, 197, 94, 0.15)' }
            }
          >
            {isVideo ? 'VIDEO' : 'AUDIO'}
          </span>
          
          {/* Language badge */}
          <span 
            className="px-2 py-0.5 rounded text-xs font-medium text-[#EDE9FE] flex items-center gap-1 backdrop-blur-md"
            style={{ background: 'rgba(139, 92, 246, 0.2)' }}
          >
            {getLanguageName(media.language || 'en')}
          </span>
        </div>

        {/* Download button - appears on hover on desktop */}
        {user && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            <DownloadButton media={media} size="sm" />
          </div>
        )}

        {/* Currently playing indicator */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5">
            <div className="audio-bar" style={{ animationDelay: '0s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.1s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.2s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.3s' }} />
          </div>
        )}

        {/* Like indicator */}
        {isLiked && !isCurrentTrack && (
          <div className="absolute bottom-2 left-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500 drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-semibold text-sm truncate',
              isCurrentTrack && 'text-primary'
            )}
          >
            {media.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-1">
            {media.artistName || media.subtitle || 'Unknown artist'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
