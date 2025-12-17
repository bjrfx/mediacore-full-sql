import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Share2,
  ChevronLeft,
  Music,
  Video,
  Clock,
  User,
  ListPlus,
  MoreHorizontal,
} from 'lucide-react';
import { publicApi } from '../services/api';
import { usePlayerStore, useLibraryStore, useAuthStore } from '../store';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import ThumbnailFallback from '../components/media/ThumbnailFallback';
import MediaMeta from '../components/media/MediaMeta';
import MiniPlayer from '../components/layout/MiniPlayer';
import { ShareButton, MediaActionsButton } from '../components/media/ShareMenu';
import { cn, formatDuration, getLanguageName } from '../lib/utils';

/**
 * PublicMediaPage - Public shareable page for media content
 * 
 * Routes:
 * - /watch/:id - Video content
 * - /listen/:id - Audio content
 * 
 * Features:
 * - SEO-optimized with Open Graph meta tags
 * - Works for both authenticated and unauthenticated users
 * - Full-featured media player
 * - Share functionality
 * - Related content suggestions
 */
export default function PublicMediaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    togglePlay 
  } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useLibraryStore();

  // Determine expected type from route
  const expectedType = location.pathname.startsWith('/watch') ? 'video' : 'audio';

  // Fetch media details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['publicMedia', id],
    queryFn: () => publicApi.getMediaById(id),
    enabled: !!id,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const media = data?.data;
  const isCurrentTrack = currentTrack?.id === media?.id;
  const isLiked = media ? isFavorite(media.id) : false;
  const isVideo = media?.type === 'video';

  // Auto-redirect to correct route if type doesn't match
  useEffect(() => {
    if (media) {
      const correctRoute = media.type === 'video' ? 'watch' : 'listen';
      const currentRoute = location.pathname.startsWith('/watch') ? 'watch' : 'listen';
      
      if (correctRoute !== currentRoute) {
        navigate(`/${correctRoute}/${id}`, { replace: true });
      }
    }
  }, [media, location.pathname, navigate, id]);

  // Play handler - Public pages always use playTrack for consistent behavior
  const handlePlay = () => {
    if (!media) {
      console.error('[PublicMediaPage] No media data available');
      return;
    }
    
    console.log('[PublicMediaPage] Play button clicked', {
      media,
      isCurrentTrack,
      isPlaying,
      hasFileUrl: !!media.fileUrl,
      hasFilePath: !!media.filePath,
    });
    
    // If already playing this track, pause it
    if (isCurrentTrack && isPlaying) {
      console.log('[PublicMediaPage] Pausing current track');
      togglePlay({ skipSubscriptionCheck: true });
      return;
    }
    
    // Otherwise start playing (skip subscription check for public access)
    console.log('[PublicMediaPage] Starting playback with skipSubscriptionCheck');
    playTrack(media, [media], true, { skipSubscriptionCheck: true });
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            {expectedType === 'video' ? (
              <Video className="h-10 w-10 text-muted-foreground" />
            ) : (
              <Music className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">Content Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This {expectedType === 'video' ? 'video' : 'audio'} may have been removed or is not available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="w-full aspect-video rounded-xl mb-6" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-8" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-12 w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <MediaMeta media={media} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background pb-32"
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <ShareButton media={media} />
              <MediaActionsButton media={media} />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* Media Container */}
          <div className="mb-6">
            {isVideo ? (
              // Video player area
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                {media.thumbnail ? (
                  <>
                    <img
                      src={media.thumbnail}
                      alt={media.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Button
                        variant="spotify"
                        size="lg"
                        className="h-20 w-20 rounded-full"
                        onClick={handlePlay}
                      >
                        {isCurrentTrack && isPlaying ? (
                          <Pause className="h-10 w-10" />
                        ) : (
                          <Play className="h-10 w-10 ml-1" />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Button
                      variant="spotify"
                      size="lg"
                      className="h-20 w-20 rounded-full"
                      onClick={handlePlay}
                    >
                      {isCurrentTrack && isPlaying ? (
                        <Pause className="h-10 w-10" />
                      ) : (
                        <Play className="h-10 w-10 ml-1" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Audio player - album art style
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* Album art */}
                <div className="w-64 h-64 md:w-80 md:h-80 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl">
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
                      isVideo={false}
                      size="large"
                    />
                  )}
                </div>

                {/* Audio info on the side for desktop */}
                <div className="flex-1 text-center md:text-left md:py-4">
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    {media.type === 'audio' ? 'Song' : 'Track'}
                  </span>
                  <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-4">
                    {media.title}
                  </h1>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-6">
                    <User className="h-4 w-4" />
                    <span>{media.artistName || media.subtitle || 'Unknown Artist'}</span>
                    {media.duration && (
                      <>
                        <span>•</span>
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(media.duration)}</span>
                      </>
                    )}
                  </div>

                  {/* Play button for audio */}
                  <div className="flex items-center gap-4 justify-center md:justify-start">
                    <Button
                      variant="spotify"
                      size="lg"
                      className="px-8"
                      onClick={handlePlay}
                    >
                      {isCurrentTrack && isPlaying ? (
                        <>
                          <Pause className="h-5 w-5 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-12 w-12 rounded-full",
                        isLiked && "text-red-500 border-red-500"
                      )}
                      onClick={() => media && toggleFavorite(media)}
                    >
                      <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                    </Button>
                    <ShareButton media={media} variant="outline" size="icon" className="h-12 w-12 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video info (below player for video) */}
          {isVideo && (
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{media.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground mb-4">
                {media.artistName && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {media.artistName}
                  </span>
                )}
                {media.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(media.duration)}
                  </span>
                )}
                {media.language && (
                  <span className="px-2 py-1 rounded-full bg-muted text-xs">
                    {getLanguageName(media.language)}
                  </span>
                )}
              </div>

              {/* Action buttons for video */}
              <div className="flex items-center gap-3">
                <Button
                  variant="spotify"
                  size="lg"
                  onClick={handlePlay}
                >
                  {isCurrentTrack && isPlaying ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(isLiked && "text-red-500 border-red-500")}
                  onClick={() => media && toggleFavorite(media)}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </Button>
                <ShareButton media={media} variant="outline" />
                <MediaActionsButton media={media} variant="outline" />
              </div>
            </div>
          )}

          {/* Description */}
          {media.description && (
            <div className="mb-8 p-4 bg-muted/30 rounded-xl">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">
                About
              </h2>
              <p className="text-sm text-foreground/80">{media.description}</p>
            </div>
          )}

          {/* Sign up CTA for non-authenticated users */}
          {!user && (
            <div className="mt-8 p-6 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl text-center">
              <h2 className="text-xl font-bold mb-2">
                Enjoy unlimited streaming
              </h2>
              <p className="text-muted-foreground mb-4">
                Sign up for free to save favorites, create playlists, and more.
              </p>
              <Button onClick={() => navigate('/')} className="px-8">
                Get Started
              </Button>
            </div>
          )}
        </main>
      </motion.div>

      {/* Mini Player */}
      <MiniPlayer />
    </>
  );
}
