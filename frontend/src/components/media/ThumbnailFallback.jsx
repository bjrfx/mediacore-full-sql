import React from 'react';
import { Video, Music } from 'lucide-react';
import { cn, generateGradient, getTitleInitials, getShortTitle } from '../../lib/utils';

/**
 * ThumbnailFallback - Displays title-based fallback when no thumbnail is available
 * 
 * @param {string} title - The media title to display
 * @param {string} id - Media ID used for gradient generation
 * @param {boolean} isVideo - Whether the media is a video
 * @param {'small' | 'medium' | 'large'} size - Size variant for the fallback
 * @param {string} className - Additional classes
 */
export default function ThumbnailFallback({ 
  title, 
  id, 
  isVideo = false, 
  size = 'medium',
  className 
}) {
  const initials = getTitleInitials(title);
  const shortTitle = getShortTitle(title, size === 'small' ? 12 : 18);
  const gradient = generateGradient(id);

  // Size-specific styling
  const sizeStyles = {
    small: {
      container: 'p-1',
      initials: 'text-lg font-bold',
      title: 'text-[8px] leading-tight',
      icon: 'w-3 h-3',
      iconWrapper: 'p-0.5',
    },
    medium: {
      container: 'p-2',
      initials: 'text-2xl font-bold',
      title: 'text-[10px] leading-tight',
      icon: 'w-4 h-4',
      iconWrapper: 'p-1',
    },
    large: {
      container: 'p-3',
      initials: 'text-4xl font-bold',
      title: 'text-xs leading-tight',
      icon: 'w-5 h-5',
      iconWrapper: 'p-1.5',
    },
  };

  const styles = sizeStyles[size] || sizeStyles.medium;

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center relative overflow-hidden',
        `bg-gradient-to-br ${gradient}`,
        className
      )}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-black rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />
      </div>

      {/* Content */}
      <div className={cn('relative z-10 flex flex-col items-center gap-1 text-center', styles.container)}>
        {/* Large initials */}
        <span className={cn(styles.initials, 'text-white drop-shadow-lg tracking-wide')}>
          {initials}
        </span>
        
        {/* Short title (only show on medium and large) */}
        {size !== 'small' && (
          <span className={cn(
            styles.title,
            'text-white/80 font-medium max-w-[90%] text-center line-clamp-2 px-1'
          )}>
            {shortTitle}
          </span>
        )}
      </div>

      {/* Media type icon in corner */}
      <div className={cn(
        'absolute bottom-1.5 right-1.5 rounded-full bg-black/30 backdrop-blur-sm',
        styles.iconWrapper
      )}>
        {isVideo ? (
          <Video className={cn(styles.icon, 'text-white/80')} />
        ) : (
          <Music className={cn(styles.icon, 'text-white/80')} />
        )}
      </div>
    </div>
  );
}
