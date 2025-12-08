import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Languages, Sparkles, Check, ArrowRight } from 'lucide-react';
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
  PRICING_INR,
  formatPrice,
} from '../../config/subscription';
import useSubscriptionStore from '../../store/subscriptionStore';

// Language list for display
const LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

/**
 * Language Restriction Modal
 * Shows when free user tries to access non-English content
 */
export default function LanguageRestrictionModal({ open, onOpenChange }) {
  const { tier, closeModal, showUpgrade } = useSubscriptionStore();

  const handleClose = () => {
    closeModal('language');
    onOpenChange?.(false);
  };

  const handleUpgrade = () => {
    handleClose();
    showUpgrade('language');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" preventClose>
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
          >
            <Globe className="h-8 w-8 text-blue-500" />
          </motion.div>
          <DialogTitle className="text-xl">
            Unlock All Languages
          </DialogTitle>
          <DialogDescription className="text-base">
            This content is available in a different language. Upgrade to Premium to access content in all languages!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Current access */}
          <div className="p-4 rounded-lg bg-muted/50 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Your current plan</span>
              <Badge variant="secondary">{tier === SUBSCRIPTION_TIERS.GUEST ? 'Guest' : 'Free'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">English content only</span>
            </div>
          </div>

          {/* Available languages preview */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Languages available with Premium:
            </p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <motion.div
                  key={lang.code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: LANGUAGES.indexOf(lang) * 0.05 }}
                >
                  <Badge
                    variant="outline"
                    className="px-3 py-1 text-xs"
                  >
                    {lang.native}
                  </Badge>
                </motion.div>
              ))}
              <Badge variant="outline" className="px-3 py-1 text-xs">
                +10 more
              </Badge>
            </div>
          </div>

          {/* Upgrade card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">Premium</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">{formatPrice(PRICING_INR[SUBSCRIPTION_TIERS.PREMIUM])}</span>
                <span className="text-xs text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Access all languages</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>5 hours of daily playback</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Offline downloads</span>
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Premium
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={handleClose} className="w-full">
            Stay with English
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
