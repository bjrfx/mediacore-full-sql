import React from 'react';
import { motion } from 'framer-motion';
import MediaCard from './MediaCard';
import { Skeleton } from '../ui/skeleton';

export default function MediaGrid({ media = [], isLoading = false, title, showAll, onShowAll, emptyMessage = 'No media found' }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {title && <Skeleton className="h-8 w-48" />}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="space-y-4">
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
    <div className="space-y-4">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          {showAll && (
            <button
              onClick={onShowAll}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {media.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <MediaCard media={item} queue={media} index={index} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
