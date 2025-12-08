import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Chrome, Headphones, Clock, Languages, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import useSubscriptionStore from '../../store/subscriptionStore';
import usePlayerStore from '../../store/playerStore';

/**
 * Login Prompt Modal
 * Shows for guest users after 1 minute of playback
 */
export default function LoginPromptModal({ open, onOpenChange }) {
  const { closeModal, isPlaybackBlocked } = useSubscriptionStore();
  const { closeMiniPlayer } = usePlayerStore();

  const handleClose = () => {
    // If playback is blocked, close the player too
    if (isPlaybackBlocked) {
      closeMiniPlayer();
    }
    closeModal('login');
    onOpenChange?.(false);
  };

  const handleLogin = () => {
    handleClose();
    // Trigger global login modal
    window.dispatchEvent(new Event('show-login-modal'));
  };

  const handleSignUp = () => {
    handleClose();
    // Trigger global login modal (with sign up mode if supported)
    window.dispatchEvent(new Event('show-login-modal'));
  };

  const benefits = [
    {
      icon: Clock,
      title: '10 Minutes Free',
      description: 'Get 10 minutes of listening per session',
    },
    {
      icon: Headphones,
      title: 'Resume Playback',
      description: 'Continue where you left off',
    },
    {
      icon: Languages,
      title: 'Save Favorites',
      description: 'Build your personal library',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" preventClose>
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <User className="h-8 w-8 text-primary" />
          </motion.div>
          <DialogTitle className="text-xl">
            Sign Up to Continue Listening
          </DialogTitle>
          <DialogDescription className="text-base">
            Your 1-minute preview has ended. Create a free account to unlock more listening time!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{benefit.title}</p>
                <p className="text-xs text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={handleSignUp} className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Sign Up Free
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={handleLogin}
            className="w-full"
          >
            <Chrome className="h-4 w-4 mr-2" />
            Sign In with Google
          </Button>
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
          Free accounts include 10 minutes of listening every 2 hours
        </p>
      </DialogContent>
    </Dialog>
  );
}
