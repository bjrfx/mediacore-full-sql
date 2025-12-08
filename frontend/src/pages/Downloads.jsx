import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  Play, 
  HardDrive,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '../lib/utils';
import useDownloadStore, { DownloadStatus } from '../store/downloadStore';
import { usePlayerStore, useAuthStore } from '../store';
import { Button } from '../components/ui/button';
import { ThumbnailFallback } from '../components/media';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Navigate } from 'react-router-dom';

// Format bytes to human readable
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function DownloadItem({ download, onPlay, onRemove, onRetry }) {
  const { media, status, progress, size, downloadedAt, error } = download;
  const isVideo = media?.type === 'video';

  const getStatusIcon = () => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case DownloadStatus.DOWNLOADING:
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case DownloadStatus.FAILED:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return `Downloaded ${formatDate(downloadedAt)}`;
      case DownloadStatus.DOWNLOADING:
        return `Downloading ${progress}%`;
      case DownloadStatus.FAILED:
        return error || 'Download failed';
      default:
        return 'Pending';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg bg-card hover:bg-card/80 transition-colors group',
        status === DownloadStatus.FAILED && 'border border-red-500/20'
      )}
    >
      {/* Thumbnail */}
      <div 
        className={cn(
          'relative w-16 h-16 rounded-md overflow-hidden shrink-0 cursor-pointer',
          status === DownloadStatus.COMPLETED && 'group-hover:ring-2 ring-primary'
        )}
        onClick={() => status === DownloadStatus.COMPLETED && onPlay(media)}
      >
        {media?.thumbnail ? (
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <ThumbnailFallback
            title={media?.title || 'Unknown'}
            id={media?.id || '0'}
            isVideo={isVideo}
            size="small"
          />
        )}
        
        {/* Play overlay */}
        {status === DownloadStatus.COMPLETED && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-6 h-6 text-white" fill="white" />
          </div>
        )}

        {/* Progress overlay */}
        {status === DownloadStatus.DOWNLOADING && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-white/20"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${progress * 0.88} 88`}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {progress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{media?.title || 'Unknown'}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
          {size > 0 && status === DownloadStatus.COMPLETED && (
            <>
              <span>•</span>
              <span>{formatBytes(size)}</span>
            </>
          )}
        </div>
        {media?.artist && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {media.artist}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {status === DownloadStatus.COMPLETED && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPlay(media)}
            className="text-primary hover:text-primary"
          >
            <Play className="w-5 h-5" fill="currentColor" />
          </Button>
        )}
        
        {status === DownloadStatus.FAILED && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRetry(media.id)}
            className="text-yellow-500 hover:text-yellow-400"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === DownloadStatus.COMPLETED && (
              <DropdownMenuItem onClick={() => onPlay(media)}>
                <Play className="w-4 h-4 mr-2" />
                Play
              </DropdownMenuItem>
            )}
            {status === DownloadStatus.FAILED && (
              <DropdownMenuItem onClick={() => onRetry(media.id)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Download
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onRemove(media.id)}
              className="text-red-500 focus:text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export default function Downloads() {
  const { user } = useAuthStore();
  const { downloads, removeDownload, retryDownload, clearAllDownloads, getTotalDownloadSize } = useDownloadStore();
  const { playTrack, getDownloadedUrl, isDownloaded } = useDownloadStore.getState();
  const { playTrack: playerPlayTrack } = usePlayerStore();
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const downloadList = Object.values(downloads);
  const completedDownloads = downloadList.filter(d => d.status === DownloadStatus.COMPLETED);
  const downloadingItems = downloadList.filter(d => d.status === DownloadStatus.DOWNLOADING);
  const failedDownloads = downloadList.filter(d => d.status === DownloadStatus.FAILED);
  const totalSize = getTotalDownloadSize();

  const handlePlay = async (media) => {
    // Try to get downloaded URL
    const downloadedUrl = await useDownloadStore.getState().getDownloadedUrl(media.id);
    
    if (downloadedUrl) {
      // Play from local storage
      playerPlayTrack({ ...media, fileUrl: downloadedUrl, isOffline: true }, null, false);
    } else {
      // Fallback to server or prompt redownload
      playerPlayTrack(media, null, false);
    }
  };

  const handleRemove = (mediaId) => {
    removeDownload(mediaId);
  };

  const handleRetry = (mediaId) => {
    retryDownload(mediaId);
  };

  const handleClearAll = () => {
    clearAllDownloads();
    setShowClearDialog(false);
  };

  return (
    <div className="min-h-full pb-32">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Download className="w-8 h-8 text-primary" />
              Downloads
            </h1>
            <p className="text-muted-foreground mt-1">
              {completedDownloads.length} items • {formatBytes(totalSize)}
            </p>
          </div>
          
          {downloadList.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(true)}
              className="text-red-500 hover:text-red-400 hover:border-red-500/50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {(downloadingItems.length > 0 || failedDownloads.length > 0) && (
        <div className="px-6 pb-4">
          <div className="flex gap-4">
            {downloadingItems.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {downloadingItems.length} downloading
              </div>
            )}
            {failedDownloads.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {failedDownloads.length} failed
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download List */}
      <div className="px-6">
        {downloadList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Downloads Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Download videos and audio to watch or listen offline. 
              Look for the download button on any media item.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {/* Downloading items first */}
              {downloadingItems.map((download) => (
                <DownloadItem
                  key={download.media.id}
                  download={download}
                  onPlay={handlePlay}
                  onRemove={handleRemove}
                  onRetry={handleRetry}
                />
              ))}
              
              {/* Failed items */}
              {failedDownloads.map((download) => (
                <DownloadItem
                  key={download.media.id}
                  download={download}
                  onPlay={handlePlay}
                  onRemove={handleRemove}
                  onRetry={handleRetry}
                />
              ))}
              
              {/* Completed items */}
              {completedDownloads.map((download) => (
                <DownloadItem
                  key={download.media.id}
                  download={download}
                  onPlay={handlePlay}
                  onRemove={handleRemove}
                  onRetry={handleRetry}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Storage Info */}
      {completedDownloads.length > 0 && (
        <div className="px-6 mt-8">
          <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
            <HardDrive className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Storage Used</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(totalSize)} used for offline content
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Downloads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all downloaded content ({formatBytes(totalSize)}). 
              You can always download them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-red-500 hover:bg-red-600"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
