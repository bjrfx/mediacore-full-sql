import React from 'react';
import { motion } from 'framer-motion';
import MediaListItem from './MediaListItem';
import { Skeleton } from '../ui/skeleton';

export default function MediaList({ 
  media = [], 
  isLoading = false, 
  title, 
  showIndex = true, 
  showDragHandle = false,
  showDate = false,
  emptyMessage = 'No media found' 
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {title && <Skeleton className="h-8 w-48" />}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2">
              <Skeleton className="w-8 h-4" />
              <Skeleton className="w-10 h-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="w-12 h-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {title && <h2 className="text-2xl font-bold">{title}</h2>}

      {/* List header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
        {showDragHandle && <div className="w-4" />}
        <div className="w-8 text-center">#</div>
        <div className="w-10" />
        <div className="flex-1">Title</div>
        <div className="w-20 hidden sm:block">Type</div>
        {showDate && <div className="w-24 hidden md:block">Date</div>}
        <div className="w-8" />
        <div className="w-12 text-right hidden sm:block">Duration</div>
        <div className="w-8" />
      </div>

      {/* List items */}
      <div className="space-y-1">
        {media.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <MediaListItem
              media={item}
              queue={media}
              index={index}
              showIndex={showIndex}
              showDragHandle={showDragHandle}
              showDate={showDate}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
