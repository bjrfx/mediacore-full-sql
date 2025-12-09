import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'https://mediacoreapi-sql.masakalirestrobar.ca';

/**
 * Spotify-like Lyrics Display Component
 * 
 * Features:
 * - Synced lyrics highlighting based on audio time
 * - Smooth auto-scroll to active line
 * - Word-by-word highlighting (optional)
 * - Minimized/Expanded modes
 * - Gradient fade at top/bottom
 */
export default function LyricsDisplay({ 
  mediaId, 
  currentTime = 0, 
  isPlaying = false,
  onClose,
  className 
}) {
  const [lyrics, setLyrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLine, setActiveLine] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userScrolling, setUserScrolling] = useState(false);
  
  const containerRef = useRef(null);
  const lineRefs = useRef([]);
  const scrollTimeout = useRef(null);

  // Fetch lyrics
  useEffect(() => {
    if (!mediaId) return;
    
    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`${API_URL}/api/subtitles/${mediaId}`);
        const data = await res.json();
        
        if (data.success && data.subtitles) {
          setLyrics(data.subtitles);
        } else {
          setError('No lyrics available');
        }
      } catch (err) {
        setError('Failed to load lyrics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLyrics();
  }, [mediaId]);

  // Update active line based on current time
  useEffect(() => {
    if (!lyrics.length) return;
    
    const newActiveLine = lyrics.findIndex((line, index) => {
      const nextLine = lyrics[index + 1];
      const isInRange = currentTime >= line.startTime && 
        (nextLine ? currentTime < nextLine.startTime : currentTime <= line.endTime);
      return isInRange;
    });
    
    if (newActiveLine !== activeLine) {
      setActiveLine(newActiveLine);
    }
  }, [currentTime, lyrics, activeLine]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLine === -1 || userScrolling || isMinimized) return;
    
    const lineElement = lineRefs.current[activeLine];
    const container = containerRef.current;
    
    if (lineElement && container) {
      const containerRect = container.getBoundingClientRect();
      const lineRect = lineElement.getBoundingClientRect();
      
      // Calculate offset to center the line
      const offset = lineRect.top - containerRect.top - containerRect.height / 3;
      
      container.scrollTo({
        top: container.scrollTop + offset,
        behavior: 'smooth'
      });
    }
  }, [activeLine, userScrolling, isMinimized]);

  // Handle user scroll
  const handleScroll = useCallback(() => {
    setUserScrolling(true);
    
    // Reset after 3 seconds of no scrolling
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    scrollTimeout.current = setTimeout(() => {
      setUserScrolling(false);
    }, 3000);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // Calculate word highlighting progress
  const getWordProgress = (line, wordIndex) => {
    if (!line.words || !line.words[wordIndex]) return 0;
    
    const word = line.words[wordIndex];
    if (currentTime < word.startTime) return 0;
    if (currentTime >= word.endTime) return 1;
    
    return (currentTime - word.startTime) / (word.endTime - word.startTime);
  };

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center p-8 bg-gradient-to-b from-spotify-dark-elevated to-black rounded-lg",
        className
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-spotify-green" />
      </div>
    );
  }

  if (error || !lyrics.length) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-8 bg-gradient-to-b from-spotify-dark-elevated to-black rounded-lg",
        className
      )}>
        <Subtitles className="h-12 w-12 text-gray-500 mb-4" />
        <p className="text-gray-400">{error || 'No lyrics available'}</p>
      </div>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <motion.div
        initial={{ height: 200 }}
        animate={{ height: 80 }}
        className={cn(
          "bg-gradient-to-r from-spotify-dark-elevated to-black rounded-lg overflow-hidden cursor-pointer",
          className
        )}
        onClick={() => setIsMinimized(false)}
      >
        <div className="h-full flex items-center justify-between px-6">
          <div className="flex-1 overflow-hidden">
            <p className="text-gray-400 text-sm mb-1">Lyrics</p>
            <p className="text-white text-lg font-medium truncate">
              {activeLine >= 0 ? lyrics[activeLine]?.text : '♪ ♪ ♪'}
            </p>
          </div>
          <ChevronUp className="h-6 w-6 text-gray-400 ml-4" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "relative bg-gradient-to-b from-spotify-dark-elevated via-black/95 to-black rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-spotify-dark-elevated to-transparent">
        <div className="flex items-center gap-2">
          <Subtitles className="h-5 w-5 text-spotify-green" />
          <span className="text-white font-medium">Lyrics</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Lyrics container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-y-auto px-6 pb-20 scroll-smooth lyrics-scroll"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
        }}
      >
        {/* Spacer at top */}
        <div className="h-20" />
        
        {/* Lyrics lines */}
        <AnimatePresence>
          {lyrics.map((line, index) => {
            const isActive = index === activeLine;
            const isPast = index < activeLine;
            const isFuture = index > activeLine;
            
            return (
              <motion.div
                key={index}
                ref={el => lineRefs.current[index] = el}
                initial={{ opacity: 0.3 }}
                animate={{
                  opacity: isActive ? 1 : isPast ? 0.4 : 0.5,
                  scale: isActive ? 1 : 0.95,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "py-3 transition-all duration-300 cursor-pointer",
                  isActive && "transform-gpu"
                )}
                onClick={() => {
                  // Optionally seek to this line
                  // You could emit an event here to seek the player
                }}
              >
                {/* Word-by-word highlighting for active line */}
                {isActive && line.words ? (
                  <p className="text-2xl md:text-3xl font-bold leading-relaxed">
                    {line.words.map((word, wordIndex) => {
                      const progress = getWordProgress(line, wordIndex);
                      
                      return (
                        <span
                          key={wordIndex}
                          className="inline-block mr-2"
                          style={{
                            background: `linear-gradient(to right, #1DB954 ${progress * 100}%, white ${progress * 100}%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {word.word}
                        </span>
                      );
                    })}
                  </p>
                ) : (
                  <p className={cn(
                    "text-xl md:text-2xl font-bold leading-relaxed transition-colors duration-300",
                    isActive ? "text-spotify-green" : isPast ? "text-gray-600" : "text-gray-400"
                  )}>
                    {line.text}
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Spacer at bottom */}
        <div className="h-40" />
      </div>

      {/* User scrolling indicator */}
      {userScrolling && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-lg px-4 py-2 rounded-full"
        >
          <span className="text-sm text-white">Scroll paused • Tap to resume</span>
        </motion.div>
      )}

      {/* Now playing indicator */}
      {isPlaying && activeLine >= 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 right-4 flex items-center gap-2"
        >
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-1 bg-spotify-green rounded-full"
                animate={{
                  height: ['40%', '100%', '60%', '100%', '40%'],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Compact version for mini player
export function LyricsLine({ mediaId, currentTime }) {
  const [lyrics, setLyrics] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);

  useEffect(() => {
    if (!mediaId) return;
    
    fetch(`${API_URL}/api/subtitles/${mediaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.subtitles) {
          setLyrics(data.subtitles);
        }
      })
      .catch(() => {});
  }, [mediaId]);

  useEffect(() => {
    if (!lyrics.length) return;
    
    const line = lyrics.find((l, i) => {
      const next = lyrics[i + 1];
      return currentTime >= l.startTime && (next ? currentTime < next.startTime : true);
    });
    
    setCurrentLine(line?.text || null);
  }, [currentTime, lyrics]);

  if (!currentLine) return null;

  return (
    <motion.div
      key={currentLine}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-spotify-green truncate"
    >
      ♪ {currentLine}
    </motion.div>
  );
}
