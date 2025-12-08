import React, { useMemo, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, TrendingUp, RotateCcw, Video, Music, Upload, Globe, Sparkles, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicApi } from '../services/api';
import { usePlayerStore, useAuthStore } from '../store';
import { MediaGrid, LanguageCardGrid, CompactLanguageBadges, ThumbnailFallback } from '../components/media';
import { Button } from '../components/ui/button';
import { cn, formatDuration } from '../lib/utils';

export default function Home() {
  const { user, isAuthenticated, isAdminUser } = useAuthStore();
  const { playTrack, history, getResumeItems, playbackProgress } = usePlayerStore();
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  // Get items that can be resumed
  const resumeItems = useMemo(() => getResumeItems(), [getResumeItems, playbackProgress, history]);

  // Fetch all media (single request, filter client-side due to backend type filter bug)
  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['media', 'all'],
    queryFn: () => publicApi.getMedia({ limit: 50 }),
  });

  const rawMedia = mediaData?.data || [];
  
  // Get unique album IDs from media
  const albumIds = useMemo(() => {
    const ids = [...new Set(rawMedia.filter(m => m.albumId).map(m => m.albumId))];
    return ids;
  }, [rawMedia]);

  // Fetch album details to get artist info
  const albumQueries = useQueries({
    queries: albumIds.map(albumId => ({
      queryKey: ['album', albumId],
      queryFn: () => publicApi.getAlbumById(albumId),
      staleTime: 5 * 60 * 1000,
      enabled: !!albumId,
    })),
  });

  // Build album map with artist info
  const albumMap = useMemo(() => {
    const map = {};
    albumQueries.forEach(query => {
      if (query.data?.data) {
        const album = query.data.data;
        map[album.id] = {
          title: album.title,
          coverImage: album.coverImage,
          artistName: album.artist?.name || '',
          artistId: album.artist?.id || album.artistId,
        };
      }
    });
    return map;
  }, [albumQueries]);

  // Enrich media with artist info from albums
  const allMedia = useMemo(() => {
    return rawMedia.map(item => {
      const albumInfo = item.albumId ? albumMap[item.albumId] : null;
      return {
        ...item,
        artistName: albumInfo?.artistName || item.subtitle || '',
        albumTitle: albumInfo?.title || '',
        albumCover: albumInfo?.coverImage || '',
      };
    });
  }, [rawMedia, albumMap]);

  // Extract available languages from media
  const availableLanguages = useMemo(() => {
    const languageCounts = {};
    allMedia.forEach(item => {
      const lang = item.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
    
    // Sort by count (most content first)
    return Object.entries(languageCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [allMedia]);

  // Filter media by selected language
  const filteredMedia = useMemo(() => {
    if (!selectedLanguage) return allMedia;
    return allMedia.filter(item => (item.language || 'en') === selectedLanguage);
  }, [allMedia, selectedLanguage]);
  
  // Filter videos and audio client-side (from filtered media)
  const videos = useMemo(() => 
    filteredMedia.filter(item => item.type === 'video').slice(0, 12), 
    [filteredMedia]
  );
  
  const audio = useMemo(() => 
    filteredMedia.filter(item => item.type === 'audio').slice(0, 12), 
    [filteredMedia]
  );
  
  const recentlyPlayed = history.slice(0, 6);

  // Handle language selection from cards
  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    // Scroll to content section
    document.getElementById('content-sections')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Featured/Hero section with first item
  const featuredItem = allMedia[0];

  const handlePlayAll = () => {
    if (allMedia.length > 0) {
      playTrack(allMedia[0], allMedia);
    }
  };

  // Handle resume play
  const handleResumePlay = (item) => {
    playTrack(item, null, true); // true = resume from saved position
  };

  return (
    <div className="min-h-full pb-8">
      {/* Hero Section with Greeting */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background/50 to-background" />
        
        <div className="relative px-6 pt-6 pb-4">
          {/* Greeting */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold"
          >
            {getGreeting()}{isAuthenticated && user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
          </motion.h1>
        </div>
      </div>

      {/* Featured Card - Always visible when content exists */}
      {featuredItem && (
        <div className="px-4 sm:px-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
            onClick={() => playTrack(featuredItem, allMedia)}
          >
            {/* Background */}
            <div className="aspect-[1.5/1] sm:aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] relative">
              {featuredItem.thumbnail ? (
                <img
                  src={featuredItem.thumbnail}
                  alt={featuredItem.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <ThumbnailFallback
                  // title={featuredItem.title}
                  id={featuredItem.id}
                  isVideo={featuredItem.type === 'video'}
                  size="large"
                />
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8">
              {/* Featured badge */}
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-primary bg-primary/20 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full w-fit mb-2 sm:mb-3"
              >
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                FEATURED
              </motion.span>

              {/* Title */}
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-1 sm:mb-2 line-clamp-2"
              >
                {featuredItem.title}
              </motion.h2>

              {/* Subtitle / Artist */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-white/70 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 line-clamp-1"
              >
                {featuredItem.artistName || featuredItem.subtitle || 'Start exploring amazing content'}
              </motion.p>

              {/* Actions */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <Button 
                  variant="spotify" 
                  size="sm"
                  className="shadow-lg sm:h-10 sm:px-4 sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAll();
                  }}
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" fill="currentColor" />
                  Play All
                </Button>
                
                {/* Media type badge */}
                <span className={cn(
                  'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium backdrop-blur-sm',
                  featuredItem.type === 'video' 
                    ? 'bg-blue-500/30 text-blue-200' 
                    : 'bg-green-500/30 text-green-200'
                )}>
                  {featuredItem.type === 'video' ? 'VIDEO' : 'AUDIO'}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Access - Recently Played (compact horizontal) */}
      {recentlyPlayed.length > 0 && (
        <div className="px-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {recentlyPlayed.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => playTrack(item, recentlyPlayed)}
                className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden cursor-pointer transition-all duration-200"
              >
                <div className="w-12 h-12 shrink-0">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ThumbnailFallback
                      title={item.title}
                      id={item.id}
                      isVideo={item.type === 'video'}
                      size="small"
                    />
                  )}
                </div>
                <span className="font-medium text-sm truncate pr-2 flex-1">
                  {item.title}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Content sections */}
      <div id="content-sections" className="px-6 space-y-10">
        {/* Browse by Language section */}
        {availableLanguages.length > 1 && (
          <LanguageCardGrid
            languages={availableLanguages}
            onLanguageSelect={handleLanguageSelect}
            title="Browse by Language"
          />
        )}

        {/* Language filter badges (when a language is selected) */}
        {selectedLanguage && availableLanguages.length > 1 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Filtering by Language</h2>
            </div>
            <CompactLanguageBadges
              languages={availableLanguages}
              selectedLanguage={selectedLanguage}
              onLanguageSelect={setSelectedLanguage}
            />
          </section>
        )}

        {/* Continue Watching/Listening section */}
        {resumeItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Continue Watching</h2>
              </div>
              <Link 
                to="/history" 
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {resumeItems.slice(0, 5).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleResumePlay(item)}
                  className="group relative cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video rounded-lg overflow-hidden mb-2 relative">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ThumbnailFallback
                        title={item.title}
                        id={item.id}
                        isVideo={item.type === 'video'}
                        size="medium"
                      />
                    )}
                    
                    {/* Progress bar overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.progress?.percentage || 0}%` }}
                      />
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="spotify" size="icon" className="h-12 w-12 shadow-lg">
                        <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                      </Button>
                    </div>

                    {/* Type badge */}
                    <span className={cn(
                      'absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded',
                      item.type === 'video' ? 'bg-blue-500/80' : 'bg-green-500/80'
                    )}>
                      {item.type === 'video' ? 'VIDEO' : 'AUDIO'}
                    </span>
                  </div>

                  {/* Info */}
                  <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.progress?.percentage}% • {formatDuration(item.progress?.duration - item.progress?.currentTime)} left
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Videos section */}
        {(videos.length > 0 || mediaLoading) && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-400" />
                <h2 className="text-2xl font-bold">Videos</h2>
              </div>
              {videos.length > 6 && (
                <Link 
                  to="/search?type=video" 
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  Show all <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <MediaGrid
              media={videos}
              isLoading={mediaLoading}
              emptyMessage={null}
            />
          </section>
        )}

        {/* Audio section */}
        {(audio.length > 0 || mediaLoading) && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-green-400" />
                <h2 className="text-2xl font-bold">Audio</h2>
              </div>
              {audio.length > 6 && (
                <Link 
                  to="/search?type=audio" 
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  Show all <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <MediaGrid
              media={audio}
              isLoading={mediaLoading}
              emptyMessage={null}
            />
          </section>
        )}

        {/* Empty state when no content */}
        {!mediaLoading && allMedia.length === 0 && (
          <section className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Upload className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No media available yet</h3>
              <p className="text-muted-foreground mb-6">
                {isAdminUser 
                  ? 'Start by uploading your first video or audio file to get started.'
                  : 'Content is being prepared. Check back soon for amazing media!'}
              </p>
              {isAdminUser && (
                <Button asChild size="lg">
                  <Link to="/admin/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Media
                  </Link>
                </Button>
              )}
            </motion.div>
          </section>
        )}

        {/* Browse All section */}
        {filteredMedia.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-2xl font-bold">
                  {selectedLanguage ? `Browse All (${selectedLanguage.toUpperCase()})` : 'Browse All'}
                </h2>
                {selectedLanguage && (
                  <button
                    onClick={() => setSelectedLanguage(null)}
                    className="text-sm text-muted-foreground hover:text-primary ml-2"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>
            <MediaGrid
              media={filteredMedia}
              isLoading={mediaLoading}
            />
          </section>
        )}
      </div>
    </div>
  );
}
