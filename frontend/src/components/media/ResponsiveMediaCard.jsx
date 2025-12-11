import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, MoreHorizontal, Heart, ListPlus, Download, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import usePlayerStore from '../../store/playerStore';
import useLibraryStore from '../../store/libraryStore';
import useUIStore from '../../store/uiStore';
import useDownloadStore from '../../store/downloadStore';
import useAuthStore from '../../store/authStore';
import { Button } from '../ui/button';
import DownloadButton from '../ui/DownloadButton';
import ThumbnailFallback from './ThumbnailFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/**
 * ResponsiveMediaCard - Mobile-first responsive card design
 * 
 * Key improvements:
 * - Uses w-full for proper responsive behavior
 * - min-w-0 prevents flex children from overflowing
 * - aspect-square ensures consistent dimensions
 * - No fixed widths that cause overlapping
 * - Proper mobile spacing and touch targets
 * - Better title visibility with proper text truncation
 */
export default function ResponsiveMediaCard({ media, queue = [], index = 0 }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useLibraryStore();
  const { openModal } = useUIStore();
  const { user } = useAuthStore();
  const { startDownload, removeDownload, isDownloaded } = useDownloadStore();

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
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(media, queue.length > 0 ? queue : [media]);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
      onClick={handleCardClick}
      className="w-full min-w-0 flex flex-col cursor-pointer group"
    >
      {/* Card Container - ensures no overflow */}
      <div className="w-full min-w-0 flex flex-col">
        
        {/* Image Container - Fixed aspect ratio prevents overlapping */}
        <div className="w-full min-w-0 relative rounded-xl overflow-hidden mb-3 sm:mb-4 shadow-md hover:shadow-xl transition-shadow duration-300 group/image">
          
          {/* Aspect ratio container */}
          <div className="aspect-square w-full relative">
            
            {/* Thumbnail */}
            {media.thumbnail ? (
              <img
                src={media.thumbnail}
                alt={media.title}
                className="w-full h-full object-cover group-hover/image:scale-110 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <ThumbnailFallback
                title={media.title}
                id={media.id}
                isVideo={isVideo}
                size="medium"
              />
            )}

            {/* Gradient overlay - dark on bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />

            {/* Play button overlay - smooth appearance */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
              <motion.div
                initial={{ scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                className="relative"
              >
                <Button
                  variant="spotify"
                  size="icon"
                  className={cn(
                    'h-14 w-14 rounded-full shadow-2xl',
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

            {/* Type badge - top left */}
            <div className="absolute top-2 left-2">
              <span
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-bold backdrop-blur-sm',
                  isVideo
                    ? 'bg-blue-500/90 text-white'
                    : 'bg-green-500/90 text-white'
                )}
              >
                {isVideo ? '🎬 VIDEO' : '🎵 AUDIO'}
              </span>
            </div>

            {/* Download button - top right, appears on hover */}
            {user && (
              <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
                <DownloadButton media={media} size="sm" />
              </div>
            )}

            {/* Currently playing indicator - animated bars */}
            {isCurrentTrack && isPlaying && (
              <div className="absolute bottom-2 right-2 flex items-end gap-0.5">
                <div className="audio-bar" style={{ animationDelay: '0s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.1s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.2s' }} />
                <div className="audio-bar" style={{ animationDelay: '0.3s' }} />
              </div>
            )}

            {/* Like button - bottom right corner alternative */}
            {isLiked && (
              <div className="absolute bottom-2 left-2">
                <Heart className="h-5 w-5 fill-red-500 text-red-500" />
              </div>
            )}
          </div>
        </div>

        {/* Info Section - Proper spacing and truncation */}
        <div className="w-full min-w-0 flex flex-col">
          
          {/* Title - prevent overflow with proper truncation */}
          <h3
            className={cn(
              'font-semibold text-sm leading-tight line-clamp-2 w-full min-w-0',
              isCurrentTrack && 'text-primary'
            )}
            title={media.title}
          >
            {media.title}
          </h3>

          {/* Artist name - secondary text */}
          <p className="text-xs text-muted-foreground line-clamp-1 w-full min-w-0 mt-1">
            {media.artistName || media.subtitle || 'Unknown'}
          </p>

          {/* Action buttons - mobile-friendly */}
          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            
            {/* Like button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(media);
              }}
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  isLiked && 'fill-red-500 text-red-500'
                )}
              />
            </Button>

            {/* More options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(media);
                  }}
                >
                  <Heart
                    className={cn(
                      'mr-2 h-4 w-4',
                      isLiked && 'fill-red-500 text-red-500'
                    )}
                  />
                  {isLiked ? 'Remove from Favorites' : 'Add to Favorites'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('addToPlaylist', media);
                  }}
                >
                  <ListPlus className="mr-2 h-4 w-4" />
                  Add to Playlist
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (downloaded) {
                        removeDownload(media.id);
                      } else {
                        startDownload(media);
                      }
                    }}
                  >
                    {downloaded ? (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Download
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(e);
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Play Now
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
