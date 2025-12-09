import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Music2, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseSubtitles, findActiveCue, getSurroundingCues } from '../../lib/subtitleParser';
import { publicApi } from '../../services/api';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/**
 * LyricsDisplay - Spotify-style live-synced lyrics component
 * 
 * Features:
 * - Live-synced lyrics with current line highlighted
 * - Smooth scrolling to keep current line centered
 * - Support for SRT, VTT (synced) and TXT (static) formats
 * - Multiple subtitle track selection
 * - Click on lyrics line to seek to that time
 */
export default function LyricsDisplay({
  mediaId,
  currentTime = 0,
  duration = 0,
  onSeek,
  isExpanded = true,
  className,
  isPlaying = false,
}) {
  const [selectedSubtitleId, setSelectedSubtitleId] = useState(null);
  const [parsedLyrics, setParsedLyrics] = useState({ cues: [], format: 'unknown', hasTimestamps: false });
  const [isLoading, setIsLoading] = useState(false);
  const lyricsContainerRef = useRef(null);
  const lyricRefs = useRef({});
  const prevIndexRef = useRef(-1);
  const prevTimeRef = useRef(0);

  // Fetch available subtitles for this media
  const { data: subtitlesData, isLoading: isLoadingSubtitles } = useQuery({
    queryKey: ['subtitles', mediaId],
    queryFn: () => publicApi.getSubtitles(mediaId),
    enabled: !!mediaId,
  });

  const subtitles = subtitlesData?.data || [];

  // Auto-select default or first subtitle
  useEffect(() => {
    if (subtitles.length > 0 && !selectedSubtitleId) {
      const defaultSub = subtitles.find(s => s.isDefault) || subtitles[0];
      setSelectedSubtitleId(defaultSub.id);
    }
  }, [subtitles, selectedSubtitleId]);

  // Get selected subtitle
  const selectedSubtitle = useMemo(() => {
    return subtitles.find(s => s.id === selectedSubtitleId);
  }, [subtitles, selectedSubtitleId]);

  // Fetch and parse subtitle content
  useEffect(() => {
    if (!selectedSubtitle?.fileUrl) {
      setParsedLyrics({ cues: [], format: 'unknown', hasTimestamps: false });
      return;
    }

    setIsLoading(true);

    publicApi.fetchSubtitleFile(selectedSubtitle.fileUrl)
      .then(content => {
        const parsed = parseSubtitles(content, selectedSubtitle.format);
        setParsedLyrics(parsed);
      })
      .catch(err => {
        console.error('Failed to load lyrics:', err);
        setParsedLyrics({ cues: [], format: 'unknown', hasTimestamps: false });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedSubtitle]);

  // Find current active cue
  const { currentCue, currentIndex } = useMemo(() => {
    if (!parsedLyrics.hasTimestamps || parsedLyrics.cues.length === 0) {
      return { currentCue: null, currentIndex: -1 };
    }

    const result = findActiveCue(parsedLyrics.cues, currentTime);
    return {
      currentCue: result?.cue || null,
      currentIndex: result?.index ?? -1
    };
  }, [parsedLyrics, currentTime]);

  // Scroll to active cue - triggers on every currentIndex or currentTime change
  useEffect(() => {
    if (currentIndex < 0 || !parsedLyrics.hasTimestamps) return;
    
    const container = lyricsContainerRef.current;
    const element = lyricRefs.current[currentIndex];
    
    if (!container || !element) return;
    
    // Detect if user is scrubbing (time jumped more than 2 seconds)
    const timeDiff = Math.abs(currentTime - prevTimeRef.current);
    const isScrubbing = timeDiff > 2;
    const indexChanged = currentIndex !== prevIndexRef.current;
    
    // Scroll when index changes OR when scrubbing
    if (indexChanged || isScrubbing) {
      // Calculate scroll position to center the active element
      const containerHeight = container.clientHeight;
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      
      // Target position: center the element in the container
      const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
      
      // Use instant scroll for scrubbing, smooth for normal playback
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: isScrubbing ? 'auto' : 'smooth'
      });
      
      prevIndexRef.current = currentIndex;
    }
    
    prevTimeRef.current = currentTime;
  }, [currentIndex, currentTime, parsedLyrics.hasTimestamps]);

  // Reset refs when media changes
  useEffect(() => {
    prevIndexRef.current = -1;
    prevTimeRef.current = 0;
    lyricRefs.current = {};
  }, [mediaId]);

  // Handle clicking on a lyric line to seek
  const handleLyricClick = (cue) => {
    if (cue.startTime !== null && onSeek) {
      onSeek(cue.startTime);
    }
  };

  // No lyrics available
  if (isLoadingSubtitles) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subtitles.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <Music2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No lyrics available for this track</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Subtitle track selector */}
      {subtitles.length > 1 && (
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Lyrics Track</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                {selectedSubtitle?.label || 'Select track'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {subtitles.map(sub => (
                <DropdownMenuItem
                  key={sub.id}
                  onClick={() => setSelectedSubtitleId(sub.id)}
                  className={cn(sub.id === selectedSubtitleId && 'bg-accent')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {sub.label}
                  {sub.format !== 'txt' && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (synced)
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Lyrics content */}
      <div
        ref={lyricsContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : parsedLyrics.cues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Could not load lyrics</p>
          </div>
        ) : parsedLyrics.hasTimestamps ? (
          // Synced lyrics (SRT/VTT)
          <div className="space-y-4 pt-[30%] pb-[50%]">
            {parsedLyrics.cues.map((cue, index) => {
              const isActive = index === currentIndex;
              const isPast = currentIndex > -1 && index < currentIndex;
              const isFuture = currentIndex > -1 && index > currentIndex;

              return (
                <motion.div
                  key={cue.id}
                  ref={(el) => {
                    if (el) lyricRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{
                    opacity: isActive ? 1 : isPast ? 0.4 : 0.6,
                    scale: isActive ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'cursor-pointer transition-all duration-300 py-2 px-3 rounded-lg text-center',
                    isActive
                      ? 'text-primary font-semibold text-2xl md:text-3xl'
                      : isPast
                      ? 'text-muted-foreground text-lg md:text-xl'
                      : 'text-foreground/70 text-lg md:text-xl hover:text-foreground',
                    onSeek && 'hover:bg-accent/50'
                  )}
                  onClick={() => handleLyricClick(cue)}
                >
                  {cue.text}
                </motion.div>
              );
            })}
          </div>
        ) : (
          // Static lyrics (TXT) - display all at once
          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground mb-6">
              <FileText className="h-4 w-4 inline mr-2" />
              Plain text lyrics (not synced)
            </div>
            {parsedLyrics.cues.map((cue) => (
              <div
                key={cue.id}
                className="text-lg text-foreground/80 leading-relaxed"
              >
                {cue.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Format indicator */}
      {parsedLyrics.cues.length > 0 && (
        <div className="p-2 text-center text-xs text-muted-foreground border-t border-border/50">
          {parsedLyrics.format.toUpperCase()} format
          {parsedLyrics.hasTimestamps && ' • Click lyrics to seek'}
        </div>
      )}
    </div>
  );
}
