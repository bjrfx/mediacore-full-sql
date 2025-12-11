import React from 'react';
import { motion } from 'framer-motion';
import ResponsiveMediaCard from './ResponsiveMediaCard';
import { Skeleton } from '../ui/skeleton';

/**
 * ResponsiveMediaGrid - Mobile-first responsive grid
 * 
 * Key improvements:
 * - Mobile: 2 columns (grid-cols-2)
 * - Tablet: 3 columns (sm:grid-cols-3)
 * - Desktop: 4-5 columns (md:grid-cols-4 lg:grid-cols-5)
 * - Proper gap sizing for all breakpoints
 * - No card overlap due to proper flex/grid structure
 * - Proper aspect ratios maintained
 */
export default function ResponsiveMediaGrid({ 
  media = [], 
  isLoading = false, 
  title, 
  showAll, 
  onShowAll, 
  emptyMessage = 'No media found' 
}) {
  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        {title && <Skeleton className="h-8 w-48" />}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-full min-w-0 space-y-3">
              <Skeleton className="w-full aspect-square rounded-xl" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (media.length === 0) {
    return (
      <div className="w-full space-y-4">
        {title && <h2 className="text-2xl font-bold">{title}</h2>}
        {typeof emptyMessage === 'string' ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          emptyMessage
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          {showAll && (
            <button
              onClick={onShowAll}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Responsive Grid */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 auto-rows-max">
        {media.map((item, index) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
            className="w-full min-w-0"
          >
            <ResponsiveMediaCard 
              media={item} 
              queue={media} 
              index={index} 
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
