import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, TrendingUp, Clock, Video, Music, Sparkles, Grid3x3, List } from 'lucide-react';
import { publicApi } from '../services/api';
import { useUIStore } from '../store';
import { ResponsiveMediaGrid } from '../components/media';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Category chips
const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = searchParams.get('type') || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const { viewMode, setViewMode } = useUIStore();

  // Debounce search query
  const debouncedSetQuery = useMemo(
    () => debounce((value, currentFilter) => {
      setDebouncedQuery(value);
      if (value) {
        setSearchParams({ q: value, type: currentFilter });
        // Add to recent searches
        setRecentSearches(prev => {
          const updated = [value, ...prev.filter(s => s !== value)].slice(0, 5);
          localStorage.setItem('recentSearches', JSON.stringify(updated));
          return updated;
        });
      } else {
        setSearchParams({});
      }
    }, 300),
    [setSearchParams]
  );

  useEffect(() => {
    debouncedSetQuery(query, filter);
  }, [query, filter, debouncedSetQuery]);

  // Fetch media
  const { data, isLoading } = useQuery({
    queryKey: ['search', filter],
    queryFn: () => publicApi.getMedia({ 
      type: filter === 'all' ? undefined : filter,
      limit: 100 
    }),
  });

  // Filter results
  const allMedia = data?.data || [];
  const filteredMedia = debouncedQuery
    ? allMedia.filter(
        (item) =>
          item.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          item.artistName?.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : allMedia;

  // Get trending (most recent uploads)
  const trendingMedia = allMedia.slice(0, 6);

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchParams({});
  };

  const handleRecentSearchClick = (search) => {
    setQuery(search);
  };

  const clearRecentSearch = (search, e) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== search);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="min-h-full -m-4 sm:-m-6 md:m-0 md:p-0">
      {/* Mobile Header with Search - Sticky */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border md:border-0 md:static md:bg-transparent md:backdrop-blur-none">
        <div className="px-4 py-3 md:px-0 md:py-4">
          
          {/* Page Title - Hidden on mobile when searching */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "text-2xl md:text-3xl font-bold mb-4 transition-all",
              query && "hidden md:block"
            )}
          >
            Search
          </motion.h1>

          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Artists, songs, or podcasts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                "w-full pl-12 pr-12 h-12 md:h-14 bg-secondary/50 md:bg-secondary rounded-full border-0 text-base md:text-lg",
                "focus:ring-2 focus:ring-primary/50 focus:bg-secondary transition-all",
                "placeholder:text-muted-foreground/60"
              )}
              autoFocus={false}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    filter === cat.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-secondary hover:bg-secondary/80 text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </motion.button>
              );
            })}
          </div>

          {/* View Mode Toggle - Desktop only */}
          <div className="hidden md:flex items-center gap-2 mt-4">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 md:px-0 pb-4">
        
        {/* Show when no search query */}
        {!debouncedQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Searches
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllRecentSearches}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {recentSearches.map((search, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleRecentSearchClick(search)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm md:text-base">{search}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => clearRecentSearch(search, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Now */}
            <div className="mb-8">
              <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trending Now
              </h2>
              <ResponsiveMediaGrid
                media={trendingMedia}
                isLoading={isLoading}
                emptyMessage="No trending content available"
              />
            </div>

            {/* Browse All */}
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-4">Browse All</h2>
              <ResponsiveMediaGrid
                media={allMedia}
                isLoading={isLoading}
                emptyMessage="No content available"
              />
            </div>
          </motion.div>
        )}

        {/* Show search results */}
        {debouncedQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm md:text-base text-muted-foreground">
                {isLoading ? (
                  'Searching...'
                ) : (
                  <>
                    {filteredMedia.length} result{filteredMedia.length !== 1 ? 's' : ''} for{' '}
                    <span className="text-foreground font-semibold">"{debouncedQuery}"</span>
                  </>
                )}
              </p>
            </div>

            {/* Results */}
            <ResponsiveMediaGrid
              media={filteredMedia}
              isLoading={isLoading}
              emptyMessage={`No results found for "${debouncedQuery}". Try a different search.`}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
