import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Library, Heart, LogIn } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePlayerStore, useAuthStore, useUIStore } from '../../store';

/**
 * BottomNav - Mobile-first bottom navigation bar
 * Inspired by Spotify, Apple Music, and YouTube Music
 * 
 * Features:
 * - Fixed position at bottom on mobile
 * - Hidden on tablet/desktop (sidebar shows instead)
 * - Smooth animations and haptic feedback feel
 * - Active state with icon color + label
 * - Sits below mini-player when media is playing
 */

export default function BottomNav() {
  const location = useLocation();
  const { isMiniPlayerVisible, isExpanded } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const navItems = [
    {
      path: '/',
      icon: Home,
      label: 'Home',
      exact: true,
    },
    {
      path: '/search',
      icon: Search,
      label: 'Search',
    },
    {
      path: '/library',
      icon: Library,
      label: 'Library',
    },
    isAuthenticated
      ? {
          path: '/liked',
          icon: Heart,
          label: 'Liked',
        }
      : {
          path: '#signin',
          icon: LogIn,
          label: 'Sign In',
          onClick: () => openModal('login'),
        },
  ];

  // Don't show on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Hide bottom nav when expanded player is open
  if (isExpanded) {
    return null;
  }

  return (
    <>
      {/* Bottom Navigation - Only visible on mobile (< md) */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          'md:hidden', // Hide on tablet/desktop
          'bg-background/95 backdrop-blur-lg',
          'border-t border-border',
          'safe-area-bottom',
          // Add top margin and push up when mini-player is visible
          isMiniPlayerVisible && 'mb-20'
        )}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            const isSignIn = item.path === '#signin';
            
            if (isSignIn) {
              return (
                <button
                  key={item.path}
                  onClick={item.onClick}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 relative group"
                >
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    className="relative"
                  >
                    <Icon
                      className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200"
                      strokeWidth={2}
                    />
                  </motion.div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 relative group"
              >
                {({ isActive: linkActive }) => {
                  const active = item.exact
                    ? location.pathname === item.path
                    : linkActive;

                  return (
                    <>
                      {/* Icon container with animation */}
                      <motion.div
                        whileTap={{ scale: 0.85 }}
                        className="relative"
                      >
                        <Icon
                          className={cn(
                            'h-6 w-6 transition-colors duration-200',
                            active
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                          strokeWidth={active ? 2.5 : 2}
                        />

                        {/* Active indicator - small dot */}
                        <AnimatePresence>
                          {active && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Label */}
                      <span
                        className={cn(
                          'text-[10px] font-medium transition-colors duration-200',
                          active
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        {item.label}
                      </span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom safe area padding for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur-lg" />
      </nav>

      {/* Spacer to prevent content from being hidden under bottom nav */}
      <div
        className={cn(
          'h-16 md:hidden',
          'safe-area-bottom',
          isMiniPlayerVisible && 'mb-20'
        )}
      />
    </>
  );
}
