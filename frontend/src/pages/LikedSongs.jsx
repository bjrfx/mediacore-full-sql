import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Shuffle } from 'lucide-react';
import { useLibraryStore, usePlayerStore } from '../store';
import { MediaList } from '../components/media';
import { Button } from '../components/ui/button';

export default function Favorites() {
  const { favorites } = useLibraryStore();
  const { playTrack } = usePlayerStore();

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      playTrack(favorites[0], favorites);
    }
  };

  const handleShuffle = () => {
    if (favorites.length > 0) {
      const shuffled = [...favorites].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative px-6 pt-16 pb-8 bg-gradient-to-b from-purple-900/50 to-transparent">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Cover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-48 h-48 md:w-56 md:h-56 rounded-lg shadow-2xl bg-gradient-to-br from-purple-700 to-blue-300 flex items-center justify-center"
          >
            <Heart className="w-20 h-20 text-white fill-white" />
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <span className="text-sm font-medium">Playlist</span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mt-2 mb-4"
            >
              Favorites
            </motion.h1>
            <div className="text-muted-foreground">
              {favorites.length} tracks
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 flex items-center gap-4">
        <Button
          variant="spotify"
          size="lg"
          className="rounded-full"
          onClick={handlePlayAll}
          disabled={favorites.length === 0}
        >
          <Play className="h-6 w-6 mr-2" />
          Play
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleShuffle}
          disabled={favorites.length === 0}
        >
          <Shuffle className="h-6 w-6" />
        </Button>
      </div>

      {/* Tracks */}
      <div className="px-6 pb-8">
        {favorites.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Content you like will appear here
            </h3>
            <p className="text-muted-foreground">
              Save content by tapping the heart icon
            </p>
          </div>
        ) : (
          <MediaList media={favorites} showIndex showDate />
        )}
      </div>
    </div>
  );
}
