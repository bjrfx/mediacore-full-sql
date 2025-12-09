import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Heart,
  Share2,
  MoreHorizontal,
  ListPlus,
  Download,
  Clock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  ChevronDown,
  Music,
} from 'lucide-react';
import { publicApi } from '../services/api';
import { usePlayerStore, useLibraryStore, useAuthStore } from '../store';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Skeleton } from '../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { cn, formatDuration, formatDate } from '../lib/utils';

export default function MediaPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffleEnabled,
    playTrack,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    skipNext,
    skipPrevious,
  } = usePlayerStore();
  const { isLiked, toggleLike, addToHistory } = useLibraryStore();

  // Fetch media details
  const { data, isLoading, error } = useQuery({
    queryKey: ['media', id],
    queryFn: () => publicApi.getMediaById(id),
    enabled: !!id,
  });

  const media = data?.data;

  // Play media when loaded
  useEffect(() => {
    if (media && (!currentTrack || currentTrack.id !== media.id)) {
      playTrack(media);
      addToHistory(media);
    }
  }, [media?.id, currentTrack?.id, playTrack, addToHistory]);

  const handleSeek = (value) => {
    const time = (value[0] / 100) * duration;
    seek(time);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: media?.title,
          text: `Check out ${media?.title}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">
            Failed to load media
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'min-h-screen flex flex-col',
        media?.mediaType === 'video' ? 'bg-black' : 'bg-gradient-to-b from-card to-background'
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="text-white"
          onClick={() => navigate(-1)}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
        <p className="text-sm text-white/70 truncate max-w-[200px]">
          Now Playing
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            {user && (
              <>
                <DropdownMenuItem onClick={() => media && toggleLike(media)}>
                  <Heart className="h-4 w-4 mr-2" />
                  {isLiked(media?.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ListPlus className="h-4 w-4 mr-2" />
                  Add to Playlist
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        {isLoading ? (
          <Skeleton className="w-72 h-72 rounded-lg" />
        ) : media?.mediaType === 'video' ? (
          // Video player
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={media.streamUrl || media.fileUrl}
              poster={media.thumbnailUrl}
              className="w-full h-full"
              controls={false}
            />
          </div>
        ) : (
          // Audio artwork
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="relative"
          >
            {media?.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className={cn(
                  'w-72 h-72 rounded-lg shadow-2xl object-cover',
                  isPlaying && 'animate-pulse'
                )}
              />
            ) : (
              <div className="w-72 h-72 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-2xl">
                <Music className="h-24 w-24 text-primary/50" />
              </div>
            )}
          </motion.div>
        )}

        {/* Media info */}
        <div className="mt-8 text-center w-full max-w-md">
          <h1 className="text-2xl font-bold text-white truncate">
            {isLoading ? <Skeleton className="h-8 w-48 mx-auto" /> : media?.title}
          </h1>
          <p className="text-white/70 mt-2 truncate">
            {isLoading ? (
              <Skeleton className="h-5 w-32 mx-auto" />
            ) : (
              media?.artist || media?.description
            )}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md mt-8">
          <Slider
            value={[progressPercent]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between mt-2 text-xs text-white/50">
            <span>{formatDuration(progress)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-white/70 hover:text-white',
              shuffleEnabled && 'text-primary'
            )}
            onClick={toggleShuffle}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:scale-110 transition-transform"
            onClick={skipPrevious}
          >
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-white text-black hover:scale-105 transition-transform"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:scale-110 transition-transform"
            onClick={skipNext}
          >
            <SkipForward className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-white/70 hover:text-white',
              repeatMode !== 'off' && 'text-primary'
            )}
            onClick={toggleRepeat}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Volume and actions */}
        <div className="flex items-center justify-between w-full max-w-md mt-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70"
              onClick={toggleMute}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                onValueChange={(v) => setVolume(v[0] / 100)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70"
                onClick={() => media && toggleLike(media)}
              >
                <Heart
                  className={cn(
                    'h-5 w-5',
                    isLiked(media?.id) && 'fill-primary text-primary'
                  )}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Media details */}
        {media && (
          <div className="mt-8 text-center text-white/50 text-sm">
            <p className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(media.duration)}
              </span>
              {media.createdAt && (
                <span>Added {formatDate(media.createdAt)}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
