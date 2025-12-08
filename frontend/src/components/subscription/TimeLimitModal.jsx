import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Timer, Sparkles, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import {
  SUBSCRIPTION_TIERS,
  TIER_DISPLAY_NAMES,
  RESET_INTERVALS,
  formatResetTime,
  formatTimeRemaining,
  PLAYBACK_LIMITS,
} from '../../config/subscription';
import useSubscriptionStore from '../../store/subscriptionStore';
import usePlayerStore from '../../store/playerStore';

/**
 * Time Limit Modal
 * Shows when user has reached their playback limit
 */
export default function TimeLimitModal({ open, onOpenChange }) {
  const {
    tier,
    nextResetTime,
    playbackTimeUsed,
    closeModal,
    showUpgrade,
    isPlaybackBlocked,
  } = useSubscriptionStore();
  const { closeMiniPlayer } = usePlayerStore();

  const handleClose = () => {
    // If playback is blocked, close the player too
    if (isPlaybackBlocked) {
      closeMiniPlayer();
    }
    closeModal('timeLimit');
    onOpenChange?.(false);
  };

  const handleUpgrade = () => {
    handleClose();
    showUpgrade('timeLimit');
  };

  const limit = PLAYBACK_LIMITS[tier];
  const usagePercent = limit > 0 ? (playbackTimeUsed / limit) * 100 : 100;

  const getModalContent = () => {
    if (tier === SUBSCRIPTION_TIERS.FREE) {
      return {
        title: 'Playback Limit Reached',
        description: 'You\'ve used your 10 minutes of free listening time.',
        icon: Timer,
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-500/20',
        showResetTime: true,
        showUpgrade: true,
      };
    }

    if (tier === SUBSCRIPTION_TIERS.PREMIUM) {
      return {
        title: 'Daily Limit Reached',
        description: 'You\'ve used your 5 hours of daily listening time.',
        icon: Clock,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-500/20',
        showResetTime: true,
        showUpgrade: true,
        upgradeText: 'Upgrade to Premium Plus for unlimited listening!',
      };
    }

    return {
      title: 'Limit Reached',
      description: 'Your playback limit has been reached.',
      icon: Timer,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/20',
      showResetTime: true,
      showUpgrade: true,
    };
  };

  const content = getModalContent();
  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" preventClose>
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={cn(
              'mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center',
              content.iconBg
            )}
          >
            <Icon className={cn('h-8 w-8', content.iconColor)} />
          </motion.div>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-base">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Usage progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time used</span>
              <span className="font-medium">
                {formatTimeRemaining(playbackTimeUsed).replace(' remaining', '')}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>

          {/* Reset time */}
          {content.showResetTime && nextResetTime && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-lg bg-muted/50 text-center"
            >
              <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                {formatResetTime(nextResetTime)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Come back then to continue listening
              </p>
            </motion.div>
          )}

          {/* Upgrade prompt */}
          {content.showUpgrade && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {content.upgradeText || 'Want unlimited listening?'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upgrade now and never hit a limit again
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          {content.showUpgrade && (
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} className="w-full">
            {nextResetTime ? 'I\'ll Wait' : 'Close'}
          </Button>
        </div>

        {tier === SUBSCRIPTION_TIERS.FREE && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            Free users can listen for 10 minutes every 2 hours
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
