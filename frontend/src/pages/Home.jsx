import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, TrendingUp, RotateCcw, Video, Music, Upload, Globe, Sparkles, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicApi } from '../services/api';
import { usePlayerStore, useAuthStore } from '../store';
import { ResponsiveMediaGrid, LanguageCardGrid, CompactLanguageBadges, ThumbnailFallback } from '../components/media';
import { Button } from '../components/ui/button';
import { cn, formatDuration } from '../lib/utils';

/**
 * HOME PAGE REDESIGN - Mobile-First Responsive Layout
 * 
 * ISSUES FIXED:
 * 1. Cards overlapping on real devices - caused by fixed widths, missing min-w-0
 * 2. Chrome DevTools showing correct but real devices broken - DevTools doesn't account for safe areas, browser UI, etc.
 * 3. Aspect ratio issues - now using proper aspect-square/aspect-video
 * 4. Text truncation problems - now using line-clamp with proper min-w-0
 * 5. Non-responsive containers - now using full width + responsive padding
 * 
 * DESIGN IMPROVEMENTS:
 * - Spotify-style clean UI with proper shadows and spacing
 * - Mobile-first: starts at 2 columns, scales up to 6 on desktop
 * - Hero section stays within safe viewport with proper aspect ratios
 * - Smooth animations and transitions
 * - Better touch targets for mobile
 * - Gradient overlays on hero for text readability
 */
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

  // Fetch artists
  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ['artists', 'home'],
    queryFn: () => publicApi.getArtists({ limit: 20, orderBy: 'createdAt', order: 'desc' }),
  });

  const artists = artistsData?.data || [];
  
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
        artistName: item.artistName || albumInfo?.artistName || item.subtitle || '',
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


  // Carousel: select up to 5 featured items (could be improved to use a 'featured' flag)
  const featuredItems = allMedia.slice(0, 5);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredItem = featuredItems[featuredIndex];

  // Auto-scroll carousel
  const autoScrollRef = useRef();
  useEffect(() => {
    if (featuredItems.length <= 1) return;
    // Clear any previous interval
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setFeaturedIndex((prev) => (prev === featuredItems.length - 1 ? 0 : prev + 1));
    }, 5000); // 5 seconds
    return () => clearInterval(autoScrollRef.current);
  }, [featuredItems.length]);

  // Reset auto-scroll on manual navigation
  const resetAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = setInterval(() => {
        setFeaturedIndex((prev) => (prev === featuredItems.length - 1 ? 0 : prev + 1));
      }, 5000);
    }
  };

  const handlePlayAll = () => {
    if (featuredItems.length > 0) {
      playTrack(featuredItems[featuredIndex], featuredItems);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setFeaturedIndex((prev) => (prev === 0 ? featuredItems.length - 1 : prev - 1));
    resetAutoScroll();
  };
  const handleNext = (e) => {
    e.stopPropagation();
    setFeaturedIndex((prev) => (prev === featuredItems.length - 1 ? 0 : prev + 1));
    resetAutoScroll();
  };

  // Handle resume play
  const handleResumePlay = (item) => {
    playTrack(item, null, true); // true = resume from saved position
  };

  return (
    <div className="w-full min-h-full pb-8 sm:pb-12">
      
      {/* ========== HERO SECTION ========== */}
      {/* Mobile-first: proper safe area insets, responsive padding */}
      <div className="relative w-full overflow-hidden">
        
        {/* Background gradient - ensures text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background/50 to-background pointer-events-none" />
        
        {/* Greeting section */}
        <div className="relative w-full px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-2 sm:pb-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold truncate"
          >
            {getGreeting()}{isAuthenticated && user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
          </motion.h1>
        </div>
      </div>

      {/* ========== FEATURED CARD CAROUSEL ========== */}
      {/* Mobile-responsive hero section with proper aspect ratios */}
      {featuredItems.length > 0 && (
        <div className="w-full px-4 sm:px-6 md:px-8 mb-6 sm:mb-8 md:mb-10">
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="relative w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer group"
            onClick={() => playTrack(featuredItem, featuredItems)}
          >
            
            {/* Hero aspect ratio: mobile 2:1, tablet 2.5:1, desktop 3:1 */}
            <div className="w-full min-w-0 relative">
              <div className="aspect-square sm:aspect-video md:aspect-[3/1] lg:aspect-[4/1] w-full">
                
                {/* Background image - thumbnail on mobile, fallback on larger screens */}
                {featuredItem.thumbnail ? (
                  <>
                    {/* Mobile: show actual thumbnail */}
                    <img
                      src={featuredItem.thumbnail}
                      alt={featuredItem.title}
                      className="block sm:hidden w-full h-full object-cover"
                    />
                    {/* Tablet/Desktop: show gradient fallback */}
                    <div className="hidden sm:block w-full h-full">
                      <ThumbnailFallback
                        title={featuredItem.title}
                        id={featuredItem.id}
                        isVideo={featuredItem.type === 'video'}
                        size="large"
                      />
                    </div>
                  </>
                ) : (
                  /* Fallback for items without thumbnails */
                  <ThumbnailFallback
                    title={featuredItem.title}
                    id={featuredItem.id}
                    isVideo={featuredItem.type === 'video'}
                    size="large"
                  />
                )}

                {/* Gradient overlays for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>

              {/* Carousel Navigation Buttons - Only show on larger screens or hover */}
              {featuredItems.length > 1 && (
                <>
                  {/* Previous button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Previous featured"
                    onClick={handlePrev}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3 shadow-lg backdrop-blur-sm transition-all duration-200 opacity-0 sm:opacity-100 group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 rotate-180" />
                  </motion.button>

                  {/* Next button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Next featured"
                    onClick={handleNext}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3 shadow-lg backdrop-blur-sm transition-all duration-200 opacity-0 sm:opacity-100 group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </motion.button>
                </>
              )}

              {/* Content - positioned at bottom */}
              <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 md:p-6 lg:p-8">
                
                {/* Featured badge */}
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="inline-flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-bold text-primary bg-primary/25 backdrop-blur-md px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full w-fit mb-2 sm:mb-3 md:mb-4"
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  FEATURED
                </motion.span>

                {/* Title - proper truncation on mobile */}
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-1 sm:mb-2 md:mb-3 line-clamp-2 min-w-0"
                >
                  {featuredItem.title}
                </motion.h2>

                {/* Subtitle/Artist - hidden on very small screens */}
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-white/80 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6 line-clamp-1 min-w-0 hidden sm:block"
                >
                  {featuredItem.artistName || featuredItem.subtitle || 'Start exploring amazing content'}
                </motion.p>

                {/* Action buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className="flex items-center gap-2 sm:gap-3 flex-wrap"
                >
                  <Button 
                    variant="spotify" 
                    size="sm"
                    className="shadow-lg h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayAll();
                    }}
                  >
                    <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" fill="currentColor" />
                    <span className="truncate">Play</span>
                  </Button>

                  {/* Type badge */}
                  <span className={cn(
                    'px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold backdrop-blur-md flex-shrink-0',
                    featuredItem.type === 'video' 
                      ? 'bg-blue-500/40 text-blue-200' 
                      : 'bg-green-500/40 text-green-200'
                  )}>
                    {featuredItem.type === 'video' ? '🎬' : '🎵'}
                  </span>
                </motion.div>
              </div>

              {/* Carousel Dots - Bottom center */}
              {featuredItems.length > 1 && (
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {featuredItems.map((_, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`Go to featured ${idx + 1}`}
                      className={cn(
                        'rounded-full transition-all duration-200',
                        idx === featuredIndex 
                          ? 'bg-primary w-3 sm:w-4 h-2.5 sm:h-3' 
                          : 'bg-white/40 w-2.5 sm:w-3 h-2.5 sm:h-3'
                      )}
                      onClick={e => {
                        e.stopPropagation();
                        setFeaturedIndex(idx);
                        resetAutoScroll();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ========== RECENTLY PLAYED SECTION ========== */}
      {recentlyPlayed.length > 0 && (
        <div className="w-full px-4 sm:px-6 md:px-8 mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Continue Listening
          </h2>
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {recentlyPlayed.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                onClick={() => handleResumePlay(item)}
                className="w-full min-w-0 flex flex-col cursor-pointer group"
              >
                {/* Thumbnail with progress bar */}
                <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 relative shadow-md hover:shadow-lg transition-shadow">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <ThumbnailFallback
                      title={item.title}
                      id={item.id}
                      isVideo={item.type === 'video'}
                      size="medium"
                    />
                  )}
                  
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${item.progress?.percentage || 0}%` }}
                    />
                  </div>

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="spotify" size="icon" className="h-10 w-10 shadow-lg">
                      <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <h3 className="font-semibold text-xs sm:text-sm truncate">{item.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {item.progress?.percentage}% • {formatDuration(item.progress?.duration - item.progress?.currentTime)} left
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ========== MAIN CONTENT SECTIONS ========== */}
      <div id="content-sections" className="w-full px-4 sm:px-6 md:px-8 space-y-6 sm:space-y-8 md:space-y-10">
        
        {/* Browse by Language section */}
        {availableLanguages.length > 1 && (
          <LanguageCardGrid
            languages={availableLanguages}
            onLanguageSelect={handleLanguageSelect}
            title="Browse by Language"
          />
        )}

        {/* Language filter badges */}
        {selectedLanguage && availableLanguages.length > 1 && (
          <section className="w-full space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold">Filtered Content</h2>
            </div>
            <CompactLanguageBadges
              languages={availableLanguages}
              selectedLanguage={selectedLanguage}
              onLanguageSelect={setSelectedLanguage}
            />
          </section>
        )}

        {/* Artists section - Horizontal Scroll */}
        {(artists.length > 0 || artistsLoading) && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold truncate">Popular Artists</h2>
              </div>
              <Link 
                to="/artists" 
                className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors flex-shrink-0"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            {/* Horizontal scrolling container */}
            <div className="relative -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
              <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
                {artistsLoading ? (
                  // Loading skeletons
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-32 sm:w-36 md:w-40 snap-start">
                      <div className="w-full aspect-square rounded-full bg-muted animate-pulse" />
                      <div className="h-4 bg-muted rounded mt-2 animate-pulse" />
                      <div className="h-3 bg-muted rounded mt-1 w-2/3 animate-pulse" />
                    </div>
                  ))
                ) : (
                  artists.map((artist, index) => (
                    <Link
                      key={artist.id}
                      to={`/artist/${artist.id}`}
                      className="flex-shrink-0 w-32 sm:w-36 md:w-40 snap-start group"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className="w-full"
                      >
                        {/* Circular artist image */}
                        <div className="w-full aspect-square rounded-full overflow-hidden mb-2 shadow-md hover:shadow-xl transition-shadow relative">
                          {artist.imageUrl ? (
                            <img
                              src={artist.imageUrl}
                              alt={artist.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                              <Music className="h-10 w-10 sm:h-12 sm:w-12 text-primary/40" />
                            </div>
                          )}
                          
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="spotify" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 shadow-lg">
                              <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" fill="currentColor" />
                            </Button>
                          </div>
                        </div>

                        {/* Artist name */}
                        <h3 className="font-semibold text-xs sm:text-sm text-center truncate px-1">
                          {artist.name}
                        </h3>
                        
                        {/* Genre or bio (optional) */}
                        {artist.genre && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground text-center truncate px-1">
                            {artist.genre}
                          </p>
                        )}
                      </motion.div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* Videos section */}
        {(videos.length > 0 || mediaLoading) && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold truncate">Videos</h2>
              </div>
              {videos.length > 6 && (
                <Link 
                  to="/search?type=video" 
                  className="text-xs sm:text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  All <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <ResponsiveMediaGrid
              media={videos}
              isLoading={mediaLoading}
              emptyMessage={null}
            />
          </section>
        )}

        {/* Audio section */}
        {(audio.length > 0 || mediaLoading) && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Music className="h-5 w-5 text-green-400 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold truncate">Music</h2>
              </div>
              {audio.length > 6 && (
                <Link 
                  to="/search?type=audio" 
                  className="text-xs sm:text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  All <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <ResponsiveMediaGrid
              media={audio}
              isLoading={mediaLoading}
              emptyMessage={null}
            />
          </section>
        )}

        {/* Browse All section */}
        {filteredMedia.length > 0 && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {selectedLanguage ? `All (${selectedLanguage.toUpperCase()})` : 'Browse All'}
                </h2>
              </div>
              {selectedLanguage && (
                <button
                  onClick={() => setSelectedLanguage(null)}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
            <ResponsiveMediaGrid
              media={filteredMedia}
              isLoading={mediaLoading}
            />
          </section>
        )}

        {/* Empty state */}
        {!mediaLoading && allMedia.length === 0 && (
          <section className="w-full text-center py-12 sm:py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No media available yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6">
                {isAdminUser 
                  ? 'Start by uploading your first video or audio file to get started.'
                  : 'Content is being prepared. Check back soon!'}
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
      </div>
    </div>
  );
}
