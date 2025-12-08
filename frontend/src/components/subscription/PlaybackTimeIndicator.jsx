import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Timer } from 'lucide-react';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import {
  SUBSCRIPTION_TIERS,
  PLAYBACK_LIMITS,
  formatTimeRemaining,
  hasUnlimitedPlayback,
} from '../../config/subscription';
import useSubscriptionStore from '../../store/subscriptionStore';

/**
 * Playback Time Indicator
 * Shows remaining playback time for limited tiers
 */
export default function PlaybackTimeIndicator({ className, variant = 'default' }) {
  const { tier, playbackTimeUsed, getRemainingTime, isTracking } = useSubscriptionStore();

  // Don't show for unlimited tiers
  if (hasUnlimitedPlayback(tier)) {
    return null;
  }

  const remaining = getRemainingTime();
  const limit = PLAYBACK_LIMITS[tier];
  const usagePercent = limit > 0 ? (playbackTimeUsed / limit) * 100 : 0;

  // Determine color based on remaining time
  const getStatusColor = () => {
    const percentRemaining = 100 - usagePercent;
    if (percentRemaining <= 10) return 'text-red-500';
    if (percentRemaining <= 25) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  const getProgressColor = () => {
    const percentRemaining = 100 - usagePercent;
    if (percentRemaining <= 10) return 'bg-red-500';
    if (percentRemaining <= 25) return 'bg-orange-500';
    return 'bg-primary';
  };

  if (variant === 'mini') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Timer className={cn('h-3.5 w-3.5', getStatusColor(), isTracking && 'animate-pulse')} />
        <span className={cn('text-xs font-medium', getStatusColor())}>
          {formatTimeRemaining(remaining)}
        </span>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          usagePercent >= 90
            ? 'bg-red-500/20 text-red-500'
            : usagePercent >= 75
            ? 'bg-orange-500/20 text-orange-500'
            : 'bg-muted text-muted-foreground',
          className
        )}
      >
        <Clock className="h-3 w-3" />
        {formatTimeRemaining(remaining)}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className={cn('flex items-center gap-1', getStatusColor())}>
          <Timer className={cn('h-3.5 w-3.5', isTracking && 'animate-pulse')} />
          {formatTimeRemaining(remaining)}
        </span>
        <span className="text-muted-foreground">
          {tier === SUBSCRIPTION_TIERS.FREE ? 'Free tier' : 'Daily limit'}
        </span>
      </div>
      <Progress
        value={usagePercent}
        className="h-1.5"
      />
    </div>
  );
}

/**
 * Compact time indicator for player controls
 */
export function CompactTimeIndicator({ className }) {
  const { tier, getRemainingTime, isTracking } = useSubscriptionStore();

  if (hasUnlimitedPlayback(tier)) {
    return null;
  }

  const remaining = getRemainingTime();
  const isLow = remaining > 0 && remaining <= 60; // 1 minute or less

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
        isLow ? 'bg-red-500/20 text-red-500' : 'bg-muted/50 text-muted-foreground',
        className
      )}
    >
      <Timer className={cn('h-3 w-3', isTracking && 'animate-pulse')} />
      <span className="font-medium">
        {remaining <= 0 ? 'Limit reached' : formatTimeRemaining(remaining).replace(' remaining', '')}
      </span>
    </motion.div>
  );
}
