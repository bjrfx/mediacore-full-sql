import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  File,
  Folder,
  Image,
  Music,
  Video,
  FileText,
  Check,
  Loader2,
  Filter,
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

// File type icons
const getFileIcon = (type) => {
  switch (type) {
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'image':
      return Image;
    case 'subtitle':
      return FileText;
    case 'folder':
      return Folder;
    default:
      return File;
  }
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * File Picker Modal Component
 * 
 * A reusable modal for selecting files from the file manager
 * 
 * @param {boolean} open - Whether the modal is open
 * @param {function} onOpenChange - Callback when modal open state changes
 * @param {function} onSelect - Callback when files are selected (receives array of file objects)
 * @param {boolean} multiSelect - Whether multiple files can be selected
 * @param {string[]} allowedTypes - Array of allowed file types (e.g., ['video', 'audio'])
 * @param {string} title - Modal title
 * @param {string} description - Modal description
 */
export function FilePickerModal({
  open,
  onOpenChange,
  onSelect,
  multiSelect = true,
  allowedTypes = null,
  title = 'Select Files',
  description = 'Choose files from your file manager',
}) {
  const [currentPath, setCurrentPath] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Fetch files
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['file-picker', currentPath, filterType],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/files`, {
        params: { dir: currentPath, type: filterType },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: open,
  });

  const files = filesData?.data || [];

  // Filter files based on allowed types
  const filteredFiles = files.filter(file => {
    // Always show folders
    if (file.isDirectory) return true;
    
    // Apply allowed types filter
    if (allowedTypes && allowedTypes.length > 0) {
      return allowedTypes.includes(file.type);
    }
    
    return true;
  }).filter(file => {
    // Apply search query
    if (searchQuery) {
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const toggleFileSelection = (file) => {
    // Allow selecting HLS folders (or folders when looking for HLS content)
    const canSelectFolder = file.isDirectory && 
      (file.type === 'hls' || filterType === 'hls' || 
       (allowedTypes && allowedTypes.includes('hls')));
    
    if (file.isDirectory && !canSelectFolder) {
      // Navigate into non-HLS folders
      setCurrentPath(file.path);
      return;
    }

    // Select files or HLS folders
    if (multiSelect) {
      setSelectedFiles(prev => {
        const exists = prev.find(f => f.id === file.id);
        if (exists) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
    } else {
      setSelectedFiles([file]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedFiles);
    setSelectedFiles([]);
    setCurrentPath('');
    setSearchQuery('');
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setCurrentPath('');
    setSearchQuery('');
    onOpenChange(false);
  };

  // Breadcrumbs
  const breadcrumbs = currentPath
    ? currentPath.split('/').filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="subtitle">Subtitles</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="hls">HLS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPath('')}
            className={cn(!currentPath && 'font-semibold')}
          >
            Root
          </Button>
          {breadcrumbs.map((part, index) => (
            <React.Fragment key={index}>
              <span className="text-muted-foreground">/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPath(breadcrumbs.slice(0, index + 1).join('/'))}
                className={cn(index === breadcrumbs.length - 1 && 'font-semibold')}
              >
                {part}
              </Button>
            </React.Fragment>
          ))}
        </div>

        {/* Selection count */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </span>
          </div>
        )}

        {/* Files Grid */}
        <div className="border rounded-lg max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Folder className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No files found' : 'This folder is empty'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.type);
                const isSelected = selectedFiles.find(f => f.id === file.id);
                const canSelectFolder = file.isDirectory && 
                  (file.type === 'hls' || filterType === 'hls' || 
                   (allowedTypes && allowedTypes.includes('hls')));

                return (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors',
                      isSelected && 'border-primary bg-primary/5'
                    )}
                    onClick={() => toggleFileSelection(file)}
                  >
                    {(!file.isDirectory || canSelectFolder) && (
                      <Checkbox
                        checked={!!isSelected}
                        onCheckedChange={() => toggleFileSelection(file)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <Icon className={cn(
                      'h-5 w-5',
                      file.type === 'video' && 'text-blue-500',
                      file.type === 'audio' && 'text-purple-500',
                      file.type === 'image' && 'text-green-500',
                      file.type === 'subtitle' && 'text-orange-500',
                      file.type === 'folder' && 'text-yellow-500',
                      file.type === 'hls' && 'text-cyan-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.isDirectory ? `${file.itemCount || 0} items` : formatFileSize(file.size)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {file.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedFiles.length === 0}>
            Select {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
