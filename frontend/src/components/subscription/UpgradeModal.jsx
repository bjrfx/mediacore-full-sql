import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  SUBSCRIPTION_TIERS,
  TIER_DISPLAY_NAMES,
  PRICING_INR,
  TIER_FEATURES,
  getSubscriptionPlans,
  formatPrice,
} from '../../config/subscription';
import useSubscriptionStore from '../../store/subscriptionStore';

/**
 * Upgrade Modal
 * Shows subscription plans and encourages user to upgrade
 */
export default function UpgradeModal({ open, onOpenChange, reason }) {
  const { tier: currentTier, closeModal } = useSubscriptionStore();
  const plans = getSubscriptionPlans().filter(
    (p) => p.tier !== SUBSCRIPTION_TIERS.FREE
  );

  const handleClose = () => {
    closeModal('upgrade');
    onOpenChange?.(false);
  };

  const handleSelectPlan = (plan) => {
    // In a real app, this would redirect to payment/checkout
    console.log('Selected plan:', plan.tier);
    // For now, just close the modal
    handleClose();
    // Could dispatch to a payment flow here
  };

  const getReasonTitle = () => {
    switch (reason) {
      case 'language':
        return 'Unlock All Languages';
      case 'timeLimit':
        return 'Want More Listening Time?';
      case 'offline':
        return 'Enable Offline Downloads';
      case 'quality':
        return 'Unlock HD Quality';
      default:
        return 'Upgrade Your Experience';
    }
  };

  const getReasonDescription = () => {
    switch (reason) {
      case 'language':
        return 'Upgrade to Premium to access content in all available languages including Hindi, Telugu, Tamil, and more!';
      case 'timeLimit':
        return 'You\'ve reached your playback limit. Upgrade for more listening time!';
      case 'offline':
        return 'Download your favorite tracks and listen offline with Premium.';
      case 'quality':
        return 'Experience crystal clear HD audio and video with Premium.';
      default:
        return 'Get unlimited access to all features and content.';
    }
  };

  const getPlanIcon = (tier) => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.PREMIUM:
        return <Star className="h-5 w-5" />;
      case SUBSCRIPTION_TIERS.PREMIUM_PLUS:
        return <Crown className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" preventClose>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-2xl">{getReasonTitle()}</DialogTitle>
          <DialogDescription className="text-base">
            {getReasonDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-primary/50',
                  plan.popular
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/50'
                )}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        plan.tier === SUBSCRIPTION_TIERS.PREMIUM
                          ? 'bg-purple-500/20 text-purple-500'
                          : 'bg-amber-500/20 text-amber-500'
                      )}
                    >
                      {getPlanIcon(plan.tier)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.features.playbackLimit}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatPrice(plan.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    plan.features.languages === 'All languages' && 'All Languages',
                    plan.features.offline && 'Offline Downloads',
                    plan.features.adFree && 'Ad-Free',
                    plan.features.priority && 'Priority Support',
                  ]
                    .filter(Boolean)
                    .map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                </div>

                <Button
                  className="w-full mt-4"
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.tier === SUBSCRIPTION_TIERS.PREMIUM
                    ? 'Get Premium'
                    : 'Get Premium Plus'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          Prices shown in INR. Payment processed securely.
        </p>
      </DialogContent>
    </Dialog>
  );
}
