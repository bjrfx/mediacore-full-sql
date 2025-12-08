import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, Grid, List } from 'lucide-react';
import { publicApi } from '../services/api';
import { useUIStore } from '../store';
import { MediaGrid, MediaList } from '../components/media';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../lib/utils';

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = searchParams.get('type') || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const { viewMode, setViewMode } = useUIStore();

  // Debounce search query - memoized
  const debouncedSetQuery = useMemo(
    () => debounce((value, currentFilter) => {
      setDebouncedQuery(value);
      if (value) {
        setSearchParams({ q: value, type: currentFilter });
      } else {
        setSearchParams({});
      }
    }, 300),
    [setSearchParams]
  );

  useEffect(() => {
    debouncedSetQuery(query, filter);
  }, [query, filter, debouncedSetQuery]);

  // Update URL when filter changes
  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery, type: filter });
    }
  }, [filter, debouncedQuery, setSearchParams]);

  // Fetch media based on filter
  const { data, isLoading } = useQuery({
    queryKey: ['search', filter],
    queryFn: () => publicApi.getMedia({ 
      type: filter === 'all' ? undefined : filter,
      limit: 100 
    }),
  });

  // Filter results based on search query (client-side for now)
  const allMedia = data?.data || [];
  const filteredMedia = debouncedQuery
    ? allMedia.filter(
        (item) =>
          item.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : allMedia;

  const handleClearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSearchParams({});
  };

  return (
    <div className="min-h-full px-6 py-4">
      {/* Search header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg -mx-6 px-6 py-4">
        {/* Search input - YouTube Music style */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for meditation, podcasts, content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 h-12 bg-secondary rounded-full border-0 text-lg focus:ring-2 focus:ring-primary"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-transparent gap-2">
              <TabsTrigger
                value="all"
                className={cn(
                  'rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black',
                  'bg-secondary hover:bg-secondary/80'
                )}
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="video"
                className={cn(
                  'rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black',
                  'bg-secondary hover:bg-secondary/80'
                )}
              >
                Videos
              </TabsTrigger>
              <TabsTrigger
                value="audio"
                className={cn(
                  'rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black',
                  'bg-secondary hover:bg-secondary/80'
                )}
              >
                Audio
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        {/* Search query indicator */}
        {debouncedQuery && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground mb-4"
          >
            {filteredMedia.length} results for "{debouncedQuery}"
          </motion.p>
        )}

        {/* Results grid/list */}
        {viewMode === 'grid' ? (
          <MediaGrid
            media={filteredMedia}
            isLoading={isLoading}
            emptyMessage={
              debouncedQuery
                ? `No results found for "${debouncedQuery}"`
                : 'Start typing to search...'
            }
          />
        ) : (
          <MediaList
            media={filteredMedia}
            isLoading={isLoading}
            showDate
            emptyMessage={
              debouncedQuery
                ? `No results found for "${debouncedQuery}"`
                : 'Start typing to search...'
            }
          />
        )}

        {/* Browse all when no search */}
        {!debouncedQuery && !isLoading && filteredMedia.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Browse All</h2>
            {viewMode === 'grid' ? (
              <MediaGrid media={filteredMedia} />
            ) : (
              <MediaList media={filteredMedia} showDate />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
