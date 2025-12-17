import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderPlus,
  Upload,
  Search,
  Trash2,
  File,
  Folder,
  Image,
  Music,
  Video,
  FileText,
  MoreHorizontal,
  Download,
  Eye,
  Grid3x3,
  List,
  RefreshCw,
  Filter,
  Loader2,
  Check,
  X,
  ArrowUp,
  HardDrive,
} from 'lucide-react';
import axios from 'axios';
import { useUIStore } from '../../store';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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

export default function AdminFileManager() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  // State
  const [currentPath, setCurrentPath] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const fileInputRef = useRef(null);

  // Fetch files
  const { data: filesData, isLoading: filesLoading, refetch } = useQuery({
    queryKey: ['file-manager', currentPath, filterType],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/files`, {
        params: { dir: currentPath, type: filterType },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
  });

  // Fetch storage stats
  const { data: statsData } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/files/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
  });

  const files = filesData?.data || [];
  const stats = statsData?.data;

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name) => {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/files/folder`,
        { name, parentDir: currentPath },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      refetch();
      setShowNewFolderDialog(false);
      setNewFolderName('');
      addToast({ message: 'Folder created successfully', type: 'success' });
    },
    onError: (error) => {
      console.error('Create folder failed', error?.response || error);
      addToast({
        message: error.response?.data?.message || 'Failed to create folder',
        type: 'error',
      });
    },
  });

  // Delete files mutation
  const deleteFilesMutation = useMutation({
    mutationFn: async (paths) => {
      const token = localStorage.getItem('accessToken');
      if (paths.length === 1) {
        const response = await axios.delete(`${API_BASE_URL}/api/files`, {
          params: { path: paths[0] },
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
      } else {
        const response = await axios.delete(`${API_BASE_URL}/api/files/batch`, {
          data: { paths },
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
      }
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries(['storage-stats']);
      setShowDeleteDialog(false);
      setSelectedFiles([]);
      addToast({ message: 'Files deleted successfully', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to delete files',
        type: 'error',
      });
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (e) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(uploadedFiles.map(f => ({ name: f.name, progress: 0 })));

    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => formData.append('files', file));
      formData.append('targetDir', currentPath);

      const token = localStorage.getItem('accessToken');
      await axios.post(`${API_BASE_URL}/api/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(uploadedFiles.map(f => ({
            name: f.name,
            progress: percentCompleted
          })));
        }
      });

      refetch();
      queryClient.invalidateQueries(['storage-stats']);
      addToast({ message: `Uploaded ${uploadedFiles.length} file(s)`, type: 'success' });
      setShowUploadDialog(false);
    } catch (error) {
      console.error('Upload failed', error?.response || error);
      addToast({
        message: error.response?.data?.message || 'Failed to upload files',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentPath, refetch, queryClient, addToast]);

  // Handle drag and drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // Simulate file input change
    const dataTransfer = new DataTransfer();
    droppedFiles.forEach(file => dataTransfer.items.add(file));
    
    handleFileUpload({ target: { files: dataTransfer.files } });
  }, [handleFileUpload]);

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.id));
    }
  };

  const handleNavigate = (file) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      setSelectedFiles([]);
    }
  };

  const handleNavigateUp = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
    setSelectedFiles([]);
  };

  const handleDeleteSelected = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    const pathsToDelete = selectedFiles.map(id => {
      const file = files.find(f => f.id === id);
      return file?.path;
    }).filter(Boolean);

    deleteFilesMutation.mutate(pathsToDelete);
  };

  const filteredFiles = searchQuery
    ? files.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  // Breadcrumbs
  const breadcrumbs = currentPath
    ? currentPath.split('/').filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">File Manager</h2>
          <p className="text-muted-foreground">
            Manage media files, folders, and uploads
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewFolderDialog(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Storage Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">Total Files</div>
              </div>
              <div className="text-2xl font-bold mt-2">{stats.totalFiles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">Total Size</div>
              </div>
              <div className="text-2xl font-bold mt-2">
                {formatFileSize(stats.totalSize)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                <div className="text-sm font-medium">Videos</div>
              </div>
              <div className="text-2xl font-bold mt-2">{stats.byType.video.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-purple-500" />
                <div className="text-sm font-medium">Audio</div>
              </div>
              <div className="text-2xl font-bold mt-2">{stats.byType.audio.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                <div className="text-sm font-medium">Subtitles</div>
              </div>
              <div className="text-2xl font-bold mt-2">{stats.byType.subtitle.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-green-500" />
                <div className="text-sm font-medium">Images</div>
              </div>
              <div className="text-2xl font-bold mt-2">{stats.byType.image.count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
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
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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
        {currentPath && (
          <>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleNavigateUp}>
              <ArrowUp className="mr-2 h-4 w-4" />
              Up
            </Button>
          </>
        )}
      </div>

      {/* Selection toolbar */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
          <Checkbox checked={selectedFiles.length === files.length} onCheckedChange={selectAll} />
          <span className="text-sm font-medium">
            {selectedFiles.length} selected
          </span>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Files Grid/List */}
      <div
        className={cn(
          'min-h-[400px] rounded-lg border-2 border-dashed p-4 transition-colors',
          isDragging && 'border-primary bg-primary/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Folder className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Upload files or create a folder to get started'}
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type);
              const isSelected = selectedFiles.includes(file.id);

              return (
                <Card
                  key={file.id}
                  className={cn(
                    'group cursor-pointer hover:border-primary/50 transition-colors',
                    isSelected && 'border-primary bg-primary/5'
                  )}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleFileSelection(file.id);
                    } else if (!file.isDirectory) {
                      toggleFileSelection(file.id);
                    } else {
                      handleNavigate(file);
                    }
                  }}
                  onDoubleClick={() => !file.isDirectory && window.open(API_BASE_URL + file.publicUrl, '_blank')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Icon className={cn(
                        'h-8 w-8',
                        file.type === 'video' && 'text-blue-500',
                        file.type === 'audio' && 'text-purple-500',
                        file.type === 'image' && 'text-green-500',
                        file.type === 'subtitle' && 'text-orange-500',
                        file.type === 'folder' && 'text-yellow-500'
                      )} />
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      {!file.isDirectory && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {file.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type);
              const isSelected = selectedFiles.includes(file.id);

              return (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors',
                    isSelected && 'border-primary bg-primary/5'
                  )}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleFileSelection(file.id);
                    } else if (file.isDirectory) {
                      handleNavigate(file);
                    } else {
                      toggleFileSelection(file.id);
                    }
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleFileSelection(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Icon className={cn(
                    'h-5 w-5',
                    file.type === 'video' && 'text-blue-500',
                    file.type === 'audio' && 'text-purple-500',
                    file.type === 'image' && 'text-green-500',
                    file.type === 'subtitle' && 'text-orange-500',
                    file.type === 'folder' && 'text-yellow-500'
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
                  {!file.isDirectory && (
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(API_BASE_URL + file.publicUrl, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload to the current directory
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to select files or drag and drop
              </p>
            </label>
            {isUploading && (
              <div className="mt-4 space-y-2">
                {uploadProgress.map((file, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{file.name}</span>
                      <span>{file.progress}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUploadDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Folder Name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="My Folder"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createFolderMutation.mutate(newFolderName)}
              disabled={!newFolderName.trim() || createFolderMutation.isLoading}
            >
              {createFolderMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFiles.length} file(s)?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteFilesMutation.isLoading}
            >
              {deleteFilesMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
