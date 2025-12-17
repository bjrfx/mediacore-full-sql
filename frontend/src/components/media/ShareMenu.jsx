import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Link2,
  Code2,
  Copy,
  Check,
  Play,
  Heart,
  ListPlus,
  Download,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  MessageCircle,
  Send,
  Mail,
  X as XIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
  BottomSheetAction,
  BottomSheetSeparator,
} from '../ui/bottom-sheet';
import usePlayerStore from '../../store/playerStore';
import useLibraryStore from '../../store/libraryStore';
import useUIStore from '../../store/uiStore';
import useDownloadStore from '../../store/downloadStore';
import useAuthStore from '../../store/authStore';

// App domain for public URLs
const APP_DOMAIN = process.env.REACT_APP_DOMAIN || 'https://app.mediacore.in';

/**
 * ShareMenu Component
 * 
 * Universal sharing component for media items.
 * - Desktop: Opens a modal dialog
 * - Mobile: Opens a bottom sheet
 * 
 * Features:
 * - Native share API support
 * - Copy link functionality
 * - Embed code generation
 * - Social sharing shortcuts
 * - Full media actions (play, favorite, playlist, download)
 */
export default function ShareMenu({ 
  media, 
  open, 
  onOpenChange,
  showActions = true,
  initialView = 'actions', // 'actions' | 'share'
  queue = [],
}) {
  const [view, setView] = useState(initialView);
  const [copied, setCopied] = useState(null); // 'link' | 'embed' | null
  const [isMobile, setIsMobile] = useState(false);

  // Stores
  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useLibraryStore();
  const { openModal } = useUIStore();
  const { user } = useAuthStore();
  const { startDownload, removeDownload, isDownloaded } = useDownloadStore();

  const isCurrentTrack = currentTrack?.id === media?.id;
  const isLiked = media ? isFavorite(media.id) : false;
  const downloaded = media ? isDownloaded(media.id) : false;

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset view when opening
  useEffect(() => {
    if (open) {
      setView(initialView);
      setCopied(null);
    }
  }, [open, initialView]);

  // Generate URLs
  const getShareUrl = useCallback(() => {
    if (!media) return '';
    const type = media.type === 'video' ? 'watch' : 'listen';
    return `${APP_DOMAIN}/${type}/${media.id}`;
  }, [media]);

  const getEmbedUrl = useCallback(() => {
    if (!media) return '';
    return `${APP_DOMAIN}/embed/${media.id}`;
  }, [media]);

  const getEmbedCode = useCallback(() => {
    if (!media) return '';
    const embedUrl = getEmbedUrl();
    const width = media.type === 'video' ? '560' : '100%';
    const height = media.type === 'video' ? '315' : '152';
    return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }, [media, getEmbedUrl]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Native share
  const handleNativeShare = useCallback(async () => {
    if (!media || !navigator.share) return;

    try {
      await navigator.share({
        title: media.title,
        text: `Check out "${media.title}" on MediaCore`,
        url: getShareUrl(),
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        // Fallback to copy
        copyToClipboard(getShareUrl(), 'link');
      }
    }
  }, [media, getShareUrl, copyToClipboard]);

  // Social share URLs
  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
      color: '#25D366',
      getUrl: () => `https://wa.me/?text=${encodeURIComponent(`Check out "${media?.title}" on MediaCore: ${getShareUrl()}`)}`,
    },
    {
      name: 'Telegram',
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: '#0088cc',
      getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(`Check out "${media?.title}" on MediaCore`)}`,
    },
    {
      name: 'X',
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
        </svg>
      ),
      color: '#000',
      getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${media?.title}" on MediaCore`)}&url=${encodeURIComponent(getShareUrl())}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      getUrl: () => `mailto:?subject=${encodeURIComponent(`Check out "${media?.title}" on MediaCore`)}&body=${encodeURIComponent(`I thought you might enjoy this: ${getShareUrl()}`)}`,
    },
  ];

  // Action handlers
  const handlePlay = useCallback(() => {
    if (!media) return;
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(media, queue.length > 0 ? queue : [media]);
    }
    onOpenChange(false);
  }, [media, isCurrentTrack, togglePlay, playTrack, queue, onOpenChange]);

  const handleFavorite = useCallback(() => {
    if (!media) return;
    toggleFavorite(media);
  }, [media, toggleFavorite]);

  const handleAddToPlaylist = useCallback(() => {
    if (!media) return;
    openModal('addToPlaylist', media);
    onOpenChange(false);
  }, [media, openModal, onOpenChange]);

  const handleDownload = useCallback(() => {
    if (!media) return;
    if (downloaded) {
      removeDownload(media.id);
    } else {
      startDownload(media);
    }
  }, [media, downloaded, removeDownload, startDownload]);

  if (!media) return null;

  // Content for actions menu
  const ActionsContent = () => (
    <>
      {/* Media info header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-muted/30">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          {media.thumbnail ? (
            <img 
              src={media.thumbnail} 
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Play className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">{media.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {media.artistName || media.subtitle || 'Unknown artist'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="py-2">
        <BottomSheetAction 
          icon={isCurrentTrack && isPlaying ? () => <span className="w-5 h-5 flex items-center justify-center"><span className="flex gap-0.5"><span className="audio-bar-mini" style={{animationDelay: '0s'}} /><span className="audio-bar-mini" style={{animationDelay: '0.1s'}} /><span className="audio-bar-mini" style={{animationDelay: '0.2s'}} /></span></span> : Play} 
          onClick={handlePlay}
        >
          {isCurrentTrack && isPlaying ? 'Now Playing' : 'Play Now'}
        </BottomSheetAction>
        
        <BottomSheetAction 
          icon={Heart}
          onClick={handleFavorite}
          className={cn(isLiked && "text-red-500")}
        >
          {isLiked ? 'Remove from Favorites' : 'Add to Favorites'}
        </BottomSheetAction>
        
        <BottomSheetAction icon={ListPlus} onClick={handleAddToPlaylist}>
          Add to Playlist
        </BottomSheetAction>
        
        {user && (
          <BottomSheetAction 
            icon={downloaded ? Trash2 : Download}
            onClick={handleDownload}
          >
            {downloaded ? 'Remove Download' : 'Download'}
          </BottomSheetAction>
        )}
        
        <BottomSheetSeparator />
        
        <BottomSheetAction 
          icon={Share2}
          onClick={() => setView('share')}
        >
          Share
        </BottomSheetAction>
      </div>
    </>
  );

  // Content for share menu
  const ShareContent = () => (
    <>
      {/* Back button on mobile */}
      {showActions && (
        <div className="px-6 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setView('actions')}
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Media preview */}
      <div className="flex items-center gap-4 px-6 py-4 bg-muted/30">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          {media.thumbnail ? (
            <img 
              src={media.thumbnail} 
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Play className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">{media.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{getShareUrl()}</p>
        </div>
      </div>

      {/* Share actions */}
      <div className="px-6 py-4 space-y-4">
        {/* Native Share (if supported) */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button 
            onClick={handleNativeShare}
            className="w-full"
            size="lg"
          >
            <Share2 className="mr-2 h-5 w-5" />
            Share
          </Button>
        )}

        {/* Copy Link */}
        <div className="flex gap-2">
          <div className="flex-1 bg-muted/50 rounded-lg px-4 py-3 text-sm truncate">
            {getShareUrl()}
          </div>
          <Button 
            variant="secondary"
            size="icon"
            className="h-12 w-12"
            onClick={() => copyToClipboard(getShareUrl(), 'link')}
          >
            {copied === 'link' ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Social sharing */}
        <div className="flex justify-center gap-3">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.getUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              title={`Share on ${social.name}`}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: social.color }}
              >
                {typeof social.icon === 'function' ? (
                  <social.icon />
                ) : (
                  <social.icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{social.name}</span>
            </a>
          ))}
        </div>

        <BottomSheetSeparator />

        {/* Embed code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Embed Code</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(getEmbedCode(), 'embed')}
            >
              {copied === 'embed' ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Code2 className="mr-2 h-4 w-4" />
                  Copy Embed
                </>
              )}
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-nowrap">
            {getEmbedCode()}
          </div>
        </div>
      </div>
    </>
  );

  // Render mobile bottom sheet
  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent>
          {showActions && view === 'actions' ? <ActionsContent /> : <ShareContent />}
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  // Render desktop dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showActions && view === 'actions' ? 'Actions' : 'Share'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Share or perform actions on {media.title}
          </DialogDescription>
        </DialogHeader>
        
        {showActions && view === 'actions' ? <ActionsContent /> : <ShareContent />}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ShareButton Component
 * 
 * A simple share button that triggers the share menu.
 */
export function ShareButton({ media, queue = [], className, variant = 'ghost', size = 'icon' }) {
  const [open, setOpen] = useState(false);

  if (!media) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Share"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <ShareMenu
        media={media}
        open={open}
        onOpenChange={setOpen}
        showActions={false}
        initialView="share"
        queue={queue}
      />
    </>
  );
}

/**
 * MediaActionsButton Component
 * 
 * The 3-dot menu button that opens the full actions menu.
 * Always visible (not hover-dependent) for mobile compatibility.
 */
export function MediaActionsButton({ 
  media, 
  queue = [], 
  className,
  variant = 'ghost',
  size = 'icon',
  alwaysVisible = true,
}) {
  const [open, setOpen] = useState(false);

  if (!media) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(
          !alwaysVisible && "opacity-0 group-hover:opacity-100 transition-opacity",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      <ShareMenu
        media={media}
        open={open}
        onOpenChange={setOpen}
        showActions={true}
        initialView="actions"
        queue={queue}
      />
    </>
  );
}
