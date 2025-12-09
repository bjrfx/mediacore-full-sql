import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseSubtitles, findActiveCue } from '../../lib/subtitleParser';
import { publicApi } from '../../services/api';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

/**
 * VideoSubtitles - YouTube-style subtitle overlay for video playback
 * 
 * Features:
 * - Subtitle display at bottom of video
 * - Multiple subtitle track selection
 * - Toggle subtitles on/off
 * - Support for SRT, VTT, and TXT formats
 * - Customizable styling
 */
export default function VideoSubtitles({
  mediaId,
  currentTime = 0,
  isVisible = true,
  className,
  onSubtitlesChange,
}) {
  const [selectedSubtitleId, setSelectedSubtitleId] = useState(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [parsedSubtitles, setParsedSubtitles] = useState({ cues: [], format: 'unknown', hasTimestamps: false });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available subtitles for this media
  const { data: subtitlesData } = useQuery({
    queryKey: ['subtitles', mediaId],
    queryFn: () => publicApi.getSubtitles(mediaId),
    enabled: !!mediaId,
  });

  const subtitles = subtitlesData?.data || [];
  const hasSubtitles = subtitles.length > 0;

  // Auto-select default or first subtitle
  useEffect(() => {
    if (subtitles.length > 0 && !selectedSubtitleId) {
      const defaultSub = subtitles.find(s => s.isDefault) || subtitles[0];
      setSelectedSubtitleId(defaultSub.id);
    }
  }, [subtitles, selectedSubtitleId]);

  // Get selected subtitle info
  const selectedSubtitle = useMemo(() => {
    return subtitles.find(s => s.id === selectedSubtitleId);
  }, [subtitles, selectedSubtitleId]);

  // Fetch and parse subtitle content
  useEffect(() => {
    if (!selectedSubtitle?.fileUrl) {
      setParsedSubtitles({ cues: [], format: 'unknown', hasTimestamps: false });
      return;
    }

    setIsLoading(true);

    publicApi.fetchSubtitleFile(selectedSubtitle.fileUrl)
      .then(content => {
        const parsed = parseSubtitles(content, selectedSubtitle.format);
        setParsedSubtitles(parsed);
      })
      .catch(err => {
        console.error('Failed to load subtitles:', err);
        setParsedSubtitles({ cues: [], format: 'unknown', hasTimestamps: false });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedSubtitle]);

  // Notify parent of subtitle availability
  useEffect(() => {
    if (onSubtitlesChange) {
      onSubtitlesChange({
        hasSubtitles,
        subtitlesEnabled,
        selectedSubtitle,
        toggleSubtitles: () => setSubtitlesEnabled(prev => !prev),
        selectSubtitle: setSelectedSubtitleId,
        availableSubtitles: subtitles,
      });
    }
  }, [hasSubtitles, subtitlesEnabled, selectedSubtitle, subtitles, onSubtitlesChange]);

  // Find current active cue
  const currentCue = useMemo(() => {
    if (!subtitlesEnabled || !parsedSubtitles.hasTimestamps || parsedSubtitles.cues.length === 0) {
      return null;
    }

    const result = findActiveCue(parsedSubtitles.cues, currentTime);
    return result?.cue || null;
  }, [parsedSubtitles, currentTime, subtitlesEnabled]);

  // Handle subtitle with HTML line breaks
  const formatSubtitleText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, i, arr) => (
      <React.Fragment key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  if (!isVisible || !hasSubtitles) return null;

  return (
    <div className={cn('absolute bottom-16 left-0 right-0 pointer-events-none', className)}>
      {/* Current subtitle display */}
      <AnimatePresence mode="wait">
        {subtitlesEnabled && currentCue && (
          <motion.div
            key={currentCue.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center px-4 mb-4"
          >
            <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-lg md:text-xl text-center max-w-[90%] leading-relaxed">
              {formatSubtitleText(currentCue.text)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static text display for TXT format */}
      {subtitlesEnabled && !parsedSubtitles.hasTimestamps && parsedSubtitles.cues.length > 0 && (
        <div className="flex justify-center px-4 mb-4">
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm text-center max-w-[90%]">
            <Subtitles className="h-4 w-4 inline mr-2" />
            Subtitles available (not time-synced)
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SubtitleSelector - Dropdown component for selecting subtitles
 * Can be used in video player controls
 */
export function SubtitleSelector({
  subtitleState,
  className,
}) {
  if (!subtitleState?.hasSubtitles) return null;

  const {
    subtitlesEnabled,
    toggleSubtitles,
    selectedSubtitle,
    selectSubtitle,
    availableSubtitles,
  } = subtitleState;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'text-white hover:bg-white/20',
            subtitlesEnabled && 'text-primary',
            className
          )}
        >
          <Subtitles className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={toggleSubtitles}
          className={cn(!subtitlesEnabled && 'bg-accent')}
        >
          <X className="h-4 w-4 mr-2" />
          Off
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {availableSubtitles.map(sub => (
          <DropdownMenuItem
            key={sub.id}
            onClick={() => {
              selectSubtitle(sub.id);
              if (!subtitlesEnabled) toggleSubtitles();
            }}
            className={cn(
              subtitlesEnabled && sub.id === selectedSubtitle?.id && 'bg-accent'
            )}
          >
            {subtitlesEnabled && sub.id === selectedSubtitle?.id && (
              <Check className="h-4 w-4 mr-2" />
            )}
            {(!subtitlesEnabled || sub.id !== selectedSubtitle?.id) && (
              <span className="w-4 mr-2" />
            )}
            {sub.label}
            <span className="ml-auto text-xs text-muted-foreground">
              {sub.format.toUpperCase()}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
