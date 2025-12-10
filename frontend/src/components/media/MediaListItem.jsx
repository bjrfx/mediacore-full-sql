import React from 'react';
import { motion } from 'framer-motion';
import { Play, MoreHorizontal, Heart, ListPlus, GripVertical } from 'lucide-react';
import { cn, formatDuration, formatRelativeTime } from '../../lib/utils';
import { usePlayerStore, useLibraryStore, useUIStore } from '../../store';
import { Button } from '../ui/button';
import ThumbnailFallback from './ThumbnailFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export default function MediaListItem({ media, queue = [], index = 0, showIndex = false, showDragHandle = false, showDate = false }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useLibraryStore();
  const { openModal } = useUIStore();

  const isCurrentTrack = currentTrack?.id === media.id;
  const isLiked = isFavorite(media.id);
  const isVideo = media.type === 'video';

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(media, queue.length > 0 ? queue : [media]);
    }
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      className={cn(
        'group flex items-center gap-4 px-4 py-2 rounded-md cursor-pointer transition-colors',
        isCurrentTrack && 'bg-white/5'
      )}
      onClick={handlePlay}
    >
      {/* Drag handle */}
      {showDragHandle && (
        <div className="opacity-0 group-hover:opacity-100 cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Index or play indicator */}
      <div className="w-8 text-center shrink-0">
        {isCurrentTrack && isPlaying ? (
          <div className="flex items-end justify-center gap-0.5 h-4">
            <div className="audio-bar" style={{ animationDelay: '0s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.1s' }} />
            <div className="audio-bar" style={{ animationDelay: '0.2s' }} />
          </div>
        ) : (
          <>
            <span className="group-hover:hidden text-muted-foreground text-sm">
              {showIndex ? index + 1 : null}
            </span>
            <Play className="h-4 w-4 hidden group-hover:block mx-auto" />
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded shrink-0 overflow-hidden">
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
            size="small"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium text-sm truncate',
            isCurrentTrack && 'text-primary'
          )}
        >
          {media.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {media.artistName || media.subtitle || 'Unknown artist'}
        </p>
      </div>

      {/* Type badge */}
      <span
        className={cn(
          'px-2 py-0.5 rounded text-xs font-medium hidden sm:block',
          isVideo
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-green-500/20 text-green-400'
        )}
      >
        {isVideo ? 'VIDEO' : 'AUDIO'}
      </span>

      {/* Date */}
      {showDate && media.createdAt && (
        <span className="text-xs text-muted-foreground hidden md:block w-24">
          {formatRelativeTime(media.createdAt)}
        </span>
      )}

      {/* Like button */}
      <Button
        variant="ghost"
        size="iconSm"
        className={cn(
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isLiked && 'opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(media);
        }}
      >
        <Heart
          className={cn('h-4 w-4', isLiked && 'fill-primary text-primary')}
        />
      </Button>

      {/* Duration placeholder */}
      <span className="text-xs text-muted-foreground w-12 text-right hidden sm:block">
        {media.duration ? formatDuration(media.duration) : '--:--'}
      </span>

      {/* More actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePlay}>
            <Play className="mr-2 h-4 w-4" />
            Play Now
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
