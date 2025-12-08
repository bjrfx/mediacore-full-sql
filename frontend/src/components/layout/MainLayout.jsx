import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import MiniPlayer from './MiniPlayer';
import { usePlayerStore } from '../../store';
import { cn } from '../../lib/utils';

export default function MainLayout() {
  const { isMiniPlayerVisible } = usePlayerStore();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            isMiniPlayerVisible && 'pb-24'
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="min-h-full p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mini Player - outside AnimatePresence, stays mounted */}
      <MiniPlayer />
    </div>
  );
}
