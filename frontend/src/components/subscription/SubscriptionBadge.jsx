import React from 'react';
import { Crown, Star, Sparkles, Building2, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  SUBSCRIPTION_TIERS,
  TIER_DISPLAY_NAMES,
  TIER_COLORS,
} from '../../config/subscription';

/**
 * Subscription Badge
 * Displays user's subscription tier with appropriate styling
 */
export default function SubscriptionBadge({ tier, size = 'default', className }) {
  const getIcon = () => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.ENTERPRISE:
        return <Building2 className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />;
      case SUBSCRIPTION_TIERS.PREMIUM_PLUS:
        return <Crown className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />;
      case SUBSCRIPTION_TIERS.PREMIUM:
        return <Star className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />;
      case SUBSCRIPTION_TIERS.FREE:
        return <Sparkles className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />;
      default:
        return <User className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />;
    }
  };
  
  const getBgStyle = () => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.GUEST:
        return { background: 'rgba(156, 163, 175, 0.15)' };
      case SUBSCRIPTION_TIERS.FREE:
        return { background: 'rgba(99, 102, 241, 0.15)' };
      case SUBSCRIPTION_TIERS.PREMIUM:
        return { background: 'rgba(139, 92, 246, 0.2)' };
      case SUBSCRIPTION_TIERS.PREMIUM_PLUS:
        return {}; // Uses gradient from TIER_COLORS
      case SUBSCRIPTION_TIERS.ENTERPRISE:
        return { background: 'rgba(34, 197, 94, 0.15)' };
      default:
        return { background: 'rgba(156, 163, 175, 0.15)' };
    }
  };

  const displayName = TIER_DISPLAY_NAMES[tier] || 'Unknown';
  const colorClass = TIER_COLORS[tier] || TIER_COLORS[SUBSCRIPTION_TIERS.FREE];

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1',
        colorClass,
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        size === 'lg' && 'text-sm px-3 py-1',
        className
      )}
      style={getBgStyle()}
    >
      {getIcon()}
      {displayName}
    </Badge>
  );
}

/**
 * Compact subscription icon only
 */
export function SubscriptionIcon({ tier, size = 'default', className }) {
  const getIcon = () => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.ENTERPRISE:
        return <Building2 className={cn(size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />;
      case SUBSCRIPTION_TIERS.PREMIUM_PLUS:
        return <Crown className={cn(size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />;
      case SUBSCRIPTION_TIERS.PREMIUM:
        return <Star className={cn(size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />;
      default:
        return null;
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  const getColor = () => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.ENTERPRISE:
        return 'text-[#22C55E]';
      case SUBSCRIPTION_TIERS.PREMIUM_PLUS:
        return 'text-amber-500';
      case SUBSCRIPTION_TIERS.PREMIUM:
        return 'text-[#8B5CF6]';
      default:
        return 'text-[#9CA3AF]';
    }
  };

  return <span className={cn(getColor(), className)}>{icon}</span>;
}
