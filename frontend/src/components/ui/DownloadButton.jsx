import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Download, Check, X, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import useDownloadStore, { DownloadStatus } from '../../store/downloadStore';
import useAuthStore from '../../store/authStore';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './tooltip';

const DownloadButton = memo(function DownloadButton({ 
  media, 
  size = 'default', // 'sm', 'default', 'lg'
  className,
  showLabel = false,
}) {
  const { user } = useAuthStore();
  const { startDownload, cancelDownload, removeDownload, retryDownload, getDownloadInfo } = useDownloadStore();
  
  const downloadInfo = useDownloadStore((state) => state.downloads[media?.id]);
  
  // Only show for logged in users
  if (!user || !media) return null;

  const status = downloadInfo?.status;
  const progress = downloadInfo?.progress || 0;

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!status || status === DownloadStatus.FAILED) {
      // Start or retry download
      await startDownload(media);
    } else if (status === DownloadStatus.DOWNLOADING) {
      // Cancel download
      cancelDownload(media.id);
    } else if (status === DownloadStatus.COMPLETED) {
      // Remove download (on long press or right click, we just show it's downloaded)
      // Could add a context menu here
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (status === DownloadStatus.COMPLETED) {
      removeDownload(media.id);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    default: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const getStatusColor = () => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return 'bg-green-500/20 text-green-500 hover:bg-green-500/30';
      case DownloadStatus.DOWNLOADING:
        return 'bg-primary/20 text-primary';
      case DownloadStatus.FAILED:
        return 'bg-red-500/20 text-red-500 hover:bg-red-500/30';
      default:
        return 'bg-white/10 text-white hover:bg-white/20';
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return 'Downloaded (Right-click to remove)';
      case DownloadStatus.DOWNLOADING:
        return `Downloading ${progress}% (Click to cancel)`;
      case DownloadStatus.FAILED:
        return 'Download failed (Click to retry)';
      default:
        return 'Download for offline';
    }
  };

  const renderIcon = () => {
    switch (status) {
      case DownloadStatus.COMPLETED:
        return <Check className={iconSizes[size]} />;
      case DownloadStatus.DOWNLOADING:
        return <Loader2 className={cn(iconSizes[size], 'animate-spin')} />;
      case DownloadStatus.FAILED:
        return <RefreshCw className={iconSizes[size]} />;
      default:
        return <Download className={iconSizes[size]} />;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            className={cn(
              'relative rounded-full flex items-center justify-center transition-colors',
              sizeClasses[size],
              getStatusColor(),
              className
            )}
          >
            {/* Progress ring for downloading state */}
            {status === DownloadStatus.DOWNLOADING && (
              <svg
                className="absolute inset-0 -rotate-90"
                viewBox="0 0 36 36"
              >
                {/* Background circle */}
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-20"
                />
                {/* Progress circle */}
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${progress} 100`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
            )}
            
            {/* Icon */}
            <span className="relative z-10">
              {renderIcon()}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default DownloadButton;
