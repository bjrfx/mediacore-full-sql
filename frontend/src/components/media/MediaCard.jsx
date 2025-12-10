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

export default function MediaCard({ media, queue = [], index = 0, size = 'medium' }) {
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

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              isVideo
                ? 'bg-blue-500/80 text-white'
                : 'bg-green-500/80 text-white'
            )}
          >
            {isVideo ? 'VIDEO' : 'AUDIO'}
          </span>
        </div>

        {/* Download button */}
        {user && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DownloadButton media={media} size="sm" />
          </div>
        )}

        {/* Currently playing indicator */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute bottom-2 right-2 flex items-end gap-0.5">
            <div className="audio-bar" style={{ animationDelay: '0s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.1s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.2s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.3s' }} />
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

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(media);
              }}
            >
              <Heart
                className={cn(
                  'mr-2 h-4 w-4',
                  isLiked && 'fill-primary text-primary'
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
    </motion.div>
  );
}
