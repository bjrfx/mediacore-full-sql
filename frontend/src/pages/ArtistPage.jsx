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
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { cn, generateGradient, formatDuration } from '../lib/utils';

export default function ArtistPage() {
  const { artistId } = useParams();
  const { playTrack, setQueue } = usePlayerStore();
  const { toggleFavorite, isFavorite } = useLibraryStore();

  // Fetch artist details
  const {
    data: artistData,
    isLoading: artistLoading,
    isError: artistError,
    error: artistErrorMsg,
  } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => publicApi.getArtistById(artistId),
    enabled: !!artistId,
  });

  // Fetch artist's albums
  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: ['artist', artistId, 'albums'],
    queryFn: () => publicApi.getArtistAlbums(artistId),
    enabled: !!artistId,
  });


  const artist = artistData?.data;
  const artistAlbums = useMemo(() => albumsData?.data || [], [albumsData?.data]);

  // Fetch media for each album and combine them
  const { data: allAlbumMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ["artist", artistId, "allAlbumMedia", artistAlbums.map(a => a.id).join(",")],
    queryFn: async () => {
      const mediaPromises = artistAlbums.map(album =>
        publicApi.getAlbumMedia(album.id).then(res => res?.data || [])
      );
      const allMedia = await Promise.all(mediaPromises);
      return allMedia.flat();
    },
    enabled: artistAlbums.length > 0,
  });

  const artistMedia = useMemo(() => {
    const tracks = allAlbumMedia || [];
    return tracks.map(track => {
      const trackAlbum = artistAlbums.find(a => a.id === track.albumId);
      return {
        ...track,
        artistName: artist?.name || "",
        artistId: artist?.id,
        albumTitle: trackAlbum?.title || "",
        albumCover: trackAlbum?.coverImage || "",
      };
    });
  }, [allAlbumMedia, artist, artistAlbums]);

  // Calculate stats
  const stats = useMemo(() => {
    let totalDuration = 0;
    artistMedia.forEach((track) => {
      if (track.duration) totalDuration += track.duration;
    });
    return {
      trackCount: artistMedia.length,
      albumCount: artistAlbums.length,
      totalDuration,
    };
  }, [artistMedia, artistAlbums]);

  // Play all tracks
  const handlePlayAll = () => {
    if (artistMedia.length > 0) {
      setQueue(artistMedia, 0);
      playTrack(artistMedia[0], artistMedia);
    }
  };

  // Shuffle play
  const handleShufflePlay = () => {
    if (artistMedia.length > 0) {
      const shuffled = [...artistMedia].sort(() => Math.random() - 0.5);
      setQueue(shuffled, 0);
      playTrack(shuffled[0], shuffled);
    }
  };

  // Play single track
  const handlePlayTrack = (track, context) => {
    playTrack(track, context);
  };

  // Loading state
  if (artistLoading) {
    return (
      <div className="space-y-8 pb-32">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 py-8">
          <Skeleton className="w-48 h-48 md:w-56 md:h-56 rounded-full" />
          <div className="flex-1 text-center md:text-left space-y-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 w-28 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (artistError || !artist) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        {artistError ? (
          <>
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to load artist</h2>
            <p className="text-muted-foreground mb-4">{artistErrorMsg?.message || 'An error occurred'}</p>
          </>
        ) : (
          <>
            <User className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Artist not found</h2>
            <p className="text-muted-foreground mb-4">This artist doesn't exist or has been removed</p>
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
      {/* Artist Header */}
      <div className="relative">
        {/* Background gradient */}
        <div
          className={cn(
            'absolute inset-0 -z-10 opacity-30 blur-3xl',
            `bg-gradient-to-br ${generateGradient(artist.id)}`
          )}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 py-8"
        >
          {/* Artist Image */}
          <div
            className={cn(
              'w-48 h-48 md:w-56 md:h-56 rounded-full shadow-2xl overflow-hidden shrink-0',
              !artist.image && `bg-gradient-to-br ${generateGradient(artist.id)}`
            )}
          >
            {artist.image ? (
              <img
                src={artist.image}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-24 w-24 text-white/50" />
              </div>
            )}
          </div>

          {/* Artist Info */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium text-primary mb-2">Artist</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{artist.name}</h1>
            {artist.genre && (
              <Badge variant="secondary" className="mb-4">
                {artist.genre}
              </Badge>
            )}
            {artist.bio && (
              <p className="text-muted-foreground max-w-2xl mb-4 line-clamp-3">
                {artist.bio}
              </p>
            )}
            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
              <span>{stats.albumCount} albums</span>
              <span>•</span>
              <span>{stats.trackCount} tracks</span>
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
            disabled={artistMedia.length === 0}
          >
            <Play className="h-5 w-5 mr-2 ml-1" />
            Play
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            onClick={handleShufflePlay}
            disabled={artistMedia.length === 0}
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
                navigator.share?.({ title: artist.name, url: window.location.href });
              }}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>

      {/* Albums Section */}
      {albumsLoading ? (
        <section>
          <h2 className="text-2xl font-bold mb-4">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="aspect-square rounded-lg mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      ) : artistAlbums.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {artistAlbums.map((album, index) => (
              <AlbumCard 
                key={album.id} 
                album={album} 
                index={index} 
              />
            ))}
          </div>
        </section>
      )}

      {/* All Tracks Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">All Tracks</h2>
        {mediaLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : artistMedia.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
            <p className="text-muted-foreground">
              This artist doesn't have any tracks yet
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-2 border-b text-sm text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span>Title</span>
              <span className="hidden md:block">Album</span>
              <span className="w-12"></span>
              <span className="w-16 text-right">
                <Clock className="h-4 w-4 inline" />
              </span>
            </div>

            {/* Tracks */}
            {artistMedia.map((track, index) => {
              const isLiked = isFavorite(track.id);
              // Find album from track's albumId if available
              const trackAlbum = artistAlbums.find((a) => a.id === track.albumId);

              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="group grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-2 hover:bg-muted/50 items-center"
                >
                  {/* Track number */}
                  <div className="w-8 text-center text-muted-foreground">
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="hidden group-hover:flex mx-auto"
                      onClick={() => handlePlayTrack(track, artistMedia)}
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
                      </div>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="hidden md:block text-sm text-muted-foreground truncate">
                    {trackAlbum ? (
                      <Link
                        to={`/album/${trackAlbum.id}`}
                        className="hover:underline hover:text-foreground"
                      >
                        {trackAlbum.title}
                      </Link>
                    ) : (
                      <span className="italic">Single</span>
                    )}
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
    </div>
  );
}

// Album card component with track count
function AlbumCard({ album, index }) {
  const { playTrack, setQueue } = usePlayerStore();

  // Fetch album tracks
  const { data: tracksData } = useQuery({
    queryKey: ['album', album.id, 'media'],
    queryFn: () => publicApi.getAlbumMedia(album.id),
    staleTime: 5 * 60 * 1000,
  });

  const albumTracks = tracksData?.data || [];

  const handlePlayAlbum = (e) => {
    e.preventDefault();
    if (albumTracks.length > 0) {
      setQueue(albumTracks, 0);
      playTrack(albumTracks[0], albumTracks);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/album/${album.id}`}>
        <div className="group p-4 rounded-lg bg-card hover:bg-card/80 transition-colors">
          <div
            className={cn(
              'aspect-square rounded-lg mb-4 relative overflow-hidden shadow-lg',
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
                <Disc className="h-12 w-12 text-white/50" />
              </div>
            )}
            <Button
              size="icon"
              variant="spotify"
              className="absolute bottom-2 right-2 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg"
              onClick={handlePlayAlbum}
              disabled={albumTracks.length === 0}
            >
              <Play className="h-5 w-5 ml-0.5" />
            </Button>
          </div>
          <h3 className="font-semibold truncate">{album.title}</h3>
          <p className="text-sm text-muted-foreground">
            {albumTracks.length} tracks
            {album.releaseDate && ` • ${new Date(album.releaseDate).getFullYear()}`}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
