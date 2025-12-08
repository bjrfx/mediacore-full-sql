import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Shuffle,
  Heart,
  MoreHorizontal,
  Clock,
  Music,
  Film,
  Disc,
  User,
  Share2,
  AlertCircle,
} from 'lucide-react';
import { usePlayerStore, useLibraryStore } from '../store';
import { publicApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { cn, generateGradient, formatDuration } from '../lib/utils';

export default function AlbumPage() {
  const { albumId } = useParams();
  const { playTrack, setQueue } = usePlayerStore();
  const { toggleFavorite, isFavorite } = useLibraryStore();

  // Fetch album details (includes artist info from backend)
  const {
    data: albumData,
    isLoading: albumLoading,
    isError: albumError,
    error: albumErrorMsg,
  } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => publicApi.getAlbumById(albumId),
    enabled: !!albumId,
  });

  // Fetch album tracks (ordered by trackNumber)
  const { data: tracksData, isLoading: tracksLoading } = useQuery({
    queryKey: ['album', albumId, 'media'],
    queryFn: () => publicApi.getAlbumMedia(albumId),
    enabled: !!albumId,
  });

  const album = albumData?.data;
  const artist = album?.artist;
  
  // Enrich tracks with artist and album info for the player
  const albumTracks = useMemo(() => {
    const tracks = tracksData?.data || [];
    return tracks.map(track => ({
      ...track,
      artistName: artist?.name || "",
      artistId: artist?.id || album?.artistId,
      albumTitle: album?.title || "",
      albumCover: album?.coverImage || "",
    }));
  }, [tracksData?.data, artist, album]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    let total = 0;
    albumTracks.forEach((track) => {
      if (track.duration) total += track.duration;
    });
    return total;
  }, [albumTracks]);

  // Play all tracks
  const handlePlayAll = () => {
    if (albumTracks.length > 0) {
      setQueue(albumTracks, 0);
      playTrack(albumTracks[0], albumTracks);
    }
  };

  // Shuffle play
  const handleShufflePlay = () => {
    if (albumTracks.length > 0) {
      const shuffled = [...albumTracks].sort(() => Math.random() - 0.5);
      setQueue(shuffled, 0);
      playTrack(shuffled[0], shuffled);
    }
  };

  // Play single track
  const handlePlayTrack = (track, index) => {
    setQueue(albumTracks, index);
    playTrack(track, albumTracks);
  };

  // Loading state
  if (albumLoading) {
    return (
      <div className="space-y-8 pb-32">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 py-8">
          <Skeleton className="w-48 h-48 md:w-56 md:h-56 rounded-lg" />
          <div className="flex-1 text-center md:text-left space-y-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 w-28 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (albumError || !album) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        {albumError ? (
          <>
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to load album</h2>
            <p className="text-muted-foreground mb-4">{albumErrorMsg?.message || 'An error occurred'}</p>
          </>
        ) : (
          <>
            <Disc className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Album not found</h2>
            <p className="text-muted-foreground mb-4">This album doesn't exist or has been removed</p>
          </>
        )}
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Album Header */}
      <div className="relative">
        {/* Background gradient */}
        <div
          className={cn(
            'absolute inset-0 -z-10 opacity-30 blur-3xl',
            `bg-gradient-to-br ${generateGradient(album.id)}`
          )}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 py-8"
        >
          {/* Album Cover */}
          <div
            className={cn(
              'w-48 h-48 md:w-56 md:h-56 rounded-lg shadow-2xl overflow-hidden shrink-0',
              !album.coverImage && `bg-gradient-to-br ${generateGradient(album.id)}`
            )}
          >
            {album.coverImage ? (
              <img
                src={album.coverImage}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc className="h-24 w-24 text-white/50" />
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium text-primary mb-2">
              {album.type ? (album.type === 'album' ? 'Album' : album.type.charAt(0).toUpperCase() + album.type.slice(1)) : 'Album'}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{album.title}</h1>
            {album.description && (
              <p className="text-muted-foreground max-w-2xl mb-4 line-clamp-2">
                {album.description}
              </p>
            )}
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm">
              {artist && (
                <>
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center',
                      `bg-gradient-to-br ${generateGradient(artist.id)}`
                    )}>
                      <User className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <Link
                    to={`/artist/${artist.id}`}
                    className="font-semibold hover:underline"
                  >
                    {artist.name}
                  </Link>
                  <span className="text-muted-foreground">•</span>
                </>
              )}
              {album.releaseDate && (
                <>
                  <span className="text-muted-foreground">
                    {new Date(album.releaseDate).getFullYear()}
                  </span>
                  <span className="text-muted-foreground">•</span>
                </>
              )}
              <span className="text-muted-foreground">
                {albumTracks.length} tracks
                {totalDuration > 0 && `, ${formatDuration(totalDuration)}`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 mt-6"
        >
          <Button
            size="lg"
            variant="spotify"
            className="rounded-full px-8"
            onClick={handlePlayAll}
            disabled={albumTracks.length === 0}
          >
            <Play className="h-5 w-5 mr-2 ml-1" />
            Play
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            onClick={handleShufflePlay}
            disabled={albumTracks.length === 0}
          >
            <Shuffle className="h-5 w-5 mr-2" />
            Shuffle
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                navigator.share?.({ title: album.title, url: window.location.href });
              }}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>

      {/* Track List */}
      <section>
        {tracksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : albumTracks.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
            <p className="text-muted-foreground">
              This album doesn't have any tracks yet
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 border-b text-sm text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span>Title</span>
              <span className="w-12"></span>
              <span className="w-16 text-right">
                <Clock className="h-4 w-4 inline" />
              </span>
            </div>

            {/* Tracks */}
            {albumTracks.map((track, index) => {
              const isLiked = isFavorite(track.id);
              // Use trackNumber from API if available, otherwise use index
              const displayNumber = track.trackNumber || index + 1;

              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="group grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 hover:bg-muted/50 items-center"
                >
                  {/* Track number */}
                  <div className="w-8 text-center text-muted-foreground">
                    <span className="group-hover:hidden">{displayNumber}</span>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="hidden group-hover:flex mx-auto"
                      onClick={() => handlePlayTrack(track, index)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded shrink-0',
                        `bg-gradient-to-br ${generateGradient(track.id)}`
                      )}
                    >
                      {track.thumbnail && (
                        <img
                          src={track.thumbnail}
                          alt=""
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {track.type === 'video' ? (
                          <Film className="h-3 w-3" />
                        ) : (
                          <Music className="h-3 w-3" />
                        )}
                        <span>{track.type}</span>
                        {track.subtitle && (
                          <>
                            <span>•</span>
                            <span className="truncate">{track.subtitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Like button */}
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className={cn(
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      isLiked && 'opacity-100'
                    )}
                    onClick={() => toggleFavorite(track)}
                  >
                    <Heart
                      className={cn('h-4 w-4', isLiked && 'fill-primary text-primary')}
                    />
                  </Button>

                  {/* Duration */}
                  <span className="w-16 text-right text-sm text-muted-foreground">
                    {track.duration ? formatDuration(track.duration) : '--:--'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Artist Link */}
      {artist && (
        <section>
          <h2 className="text-lg font-semibold mb-4">More from {artist.name}</h2>
          <Link to={`/artist/${artist.id}`}>
            <div className="flex items-center gap-4 p-4 bg-card rounded-lg hover:bg-card/80 transition-colors">
              {artist.image ? (
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  `bg-gradient-to-br ${generateGradient(artist.id)}`
                )}>
                  <User className="h-8 w-8 text-white/50" />
                </div>
              )}
              <div>
                <p className="font-semibold">{artist.name}</p>
                <p className="text-sm text-muted-foreground">View artist profile</p>
              </div>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
