import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Subtitles,
  Search,
  Play,
  RefreshCw,
  Check,
  X,
  Clock,
  Upload,
  Edit2,
  Trash2,
  Music,
  Film,
  FileText,
  Loader2,
} from 'lucide-react';
import { publicApi, adminApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { cn, formatDate, formatDuration } from '../../lib/utils';
import { Textarea } from '../../components/ui/textarea';

const API_URL = import.meta.env.VITE_API_URL || 'https://mediacoreapi-sql.masakalirestrobar.ca';

export default function AdminSubtitles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  // Fetch pending media (no subtitles)
  const { data: pendingMedia, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-subtitles-pending'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/subtitles/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      return data.media || [];
    },
    enabled: activeTab === 'pending'
  });

  // Fetch all media with subtitles
  const { data: mediaWithSubtitles, isLoading: subtitlesLoading } = useQuery({
    queryKey: ['admin-subtitles-completed'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/media?hasSubtitles=true&limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: activeTab === 'completed'
  });

  // Process subtitle mutation
  const processSubtitleMutation = useMutation({
    mutationFn: async (mediaId) => {
      const res = await fetch(`${API_URL}/api/subtitles/${mediaId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return res.json();
    },
    onMutate: (mediaId) => {
      setProcessingIds(prev => new Set([...prev, mediaId]));
    },
    onSuccess: (data, mediaId) => {
      // Poll for completion
      pollSubtitleStatus(mediaId);
    },
    onError: (error, mediaId) => {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
    }
  });

  // Poll subtitle status
  const pollSubtitleStatus = async (mediaId) => {
    const checkStatus = async () => {
      const res = await fetch(`${API_URL}/api/subtitles/${mediaId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      
      if (data.status === 'completed' || data.status === 'failed') {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(mediaId);
          return next;
        });
        queryClient.invalidateQueries(['admin-subtitles-pending']);
        queryClient.invalidateQueries(['admin-subtitles-completed']);
      } else {
        // Check again in 2 seconds
        setTimeout(checkStatus, 2000);
      }
    };
    
    setTimeout(checkStatus, 2000);
  };

  // Delete subtitle mutation
  const deleteSubtitleMutation = useMutation({
    mutationFn: async (mediaId) => {
      const res = await fetch(`${API_URL}/api/subtitles/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-subtitles-pending']);
      queryClient.invalidateQueries(['admin-subtitles-completed']);
    }
  });

  // Batch process mutation
  const batchProcessMutation = useMutation({
    mutationFn: async (mediaIds) => {
      const res = await fetch(`${API_URL}/api/subtitles/admin/batch-process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mediaIds })
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.queued) {
        data.queued.forEach(item => {
          setProcessingIds(prev => new Set([...prev, item.id]));
          pollSubtitleStatus(item.id);
        });
      }
    }
  });

  // Filter media based on search
  const filteredPending = pendingMedia?.filter(m => 
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredCompleted = mediaWithSubtitles?.filter(m =>
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handle process all visible
  const handleProcessAll = () => {
    const ids = filteredPending.slice(0, 10).map(m => m.id);
    batchProcessMutation.mutate(ids);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><X className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Subtitles className="h-6 w-6 text-spotify-green" />
            Subtitle Management
          </h1>
          <p className="text-gray-400 mt-1">
            Generate and manage subtitles/lyrics for audio and video content
          </p>
        </div>
        
        {activeTab === 'pending' && filteredPending.length > 0 && (
          <Button 
            onClick={handleProcessAll}
            disabled={batchProcessMutation.isPending}
            className="bg-spotify-green hover:bg-spotify-green/80"
          >
            {batchProcessMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Process All (Max 10)
          </Button>
        )}
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5">
            <TabsTrigger value="pending" className="data-[state=active]:bg-spotify-green">
              Pending
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-spotify-green">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {pendingMedia?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Processing</p>
                <p className="text-2xl font-bold text-white">
                  {processingIds.size}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {mediaWithSubtitles?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <Check className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Media List */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-0">
          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div className="divide-y divide-white/10">
              {pendingLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : filteredPending.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Subtitles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending media found</p>
                  <p className="text-sm mt-1">All audio/video content has subtitles</p>
                </div>
              ) : (
                filteredPending.map((media) => (
                  <div 
                    key={media.id}
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "h-12 w-12 rounded flex items-center justify-center",
                      media.type === 'audio' ? 'bg-spotify-green/20' : 'bg-blue-500/20'
                    )}>
                      {media.type === 'audio' ? (
                        <Music className="h-6 w-6 text-spotify-green" />
                      ) : (
                        <Film className="h-6 w-6 text-blue-400" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{media.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="capitalize">{media.type}</span>
                        {media.duration && (
                          <span>{formatDuration(media.duration)}</span>
                        )}
                        <span>{formatDate(media.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div>
                      {processingIds.has(media.id) ? (
                        getStatusBadge('processing')
                      ) : (
                        getStatusBadge(media.subtitle_status)
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => processSubtitleMutation.mutate(media.id)}
                        disabled={processingIds.has(media.id)}
                        className="bg-spotify-green hover:bg-spotify-green/80"
                      >
                        {processingIds.has(media.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Process
                          </>
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMedia(media);
                          setImportDialogOpen(true);
                        }}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Import
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Completed Tab */}
          {activeTab === 'completed' && (
            <div className="divide-y divide-white/10">
              {subtitlesLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : filteredCompleted.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No subtitles generated yet</p>
                  <p className="text-sm mt-1">Process some media to see them here</p>
                </div>
              ) : (
                filteredCompleted.map((media) => (
                  <div 
                    key={media.id}
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                  >
                    {/* Icon */}
                    <div className={cn(
                      "h-12 w-12 rounded flex items-center justify-center",
                      media.type === 'audio' ? 'bg-spotify-green/20' : 'bg-blue-500/20'
                    )}>
                      {media.type === 'audio' ? (
                        <Music className="h-6 w-6 text-spotify-green" />
                      ) : (
                        <Film className="h-6 w-6 text-blue-400" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{media.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="capitalize">{media.type}</span>
                        {media.duration && (
                          <span>{formatDuration(media.duration)}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div>
                      {getStatusBadge('completed')}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMedia(media);
                          setEditDialogOpen(true);
                        }}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm('Delete subtitles for this media?')) {
                            deleteSubtitleMutation.mutate(media.id);
                          }
                        }}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ImportSubtitleDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        media={selectedMedia}
        onSuccess={() => {
          queryClient.invalidateQueries(['admin-subtitles-pending']);
          queryClient.invalidateQueries(['admin-subtitles-completed']);
        }}
      />

      {/* Edit Dialog */}
      <EditSubtitleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        media={selectedMedia}
        onSuccess={() => {
          queryClient.invalidateQueries(['admin-subtitles-completed']);
        }}
      />
    </div>
  );
}

// Import Subtitle Dialog
function ImportSubtitleDialog({ open, onOpenChange, media, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://mediacoreapi-sql.masakalirestrobar.ca';

  const handleImport = async () => {
    if (!file || !media) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('subtitle', file);
      
      const res = await fetch(`${API_URL}/api/subtitles/${media.id}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        onSuccess?.();
        onOpenChange(false);
        setFile(null);
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (error) {
      alert('Failed to import subtitles');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-spotify-dark-gray border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Import Subtitles</DialogTitle>
          <DialogDescription>
            Upload an SRT or VTT file for "{media?.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".srt,.vtt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="subtitle-file"
            />
            <label 
              htmlFor="subtitle-file"
              className="cursor-pointer"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              <p className="text-white font-medium">
                {file ? file.name : 'Click to select file'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Supports .srt and .vtt formats
              </p>
            </label>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || isUploading}
            className="bg-spotify-green hover:bg-spotify-green/80"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Subtitle Dialog
function EditSubtitleDialog({ open, onOpenChange, media, onSuccess }) {
  const [subtitles, setSubtitles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [editText, setEditText] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://mediacoreapi-sql.masakalirestrobar.ca';

  // Load subtitles when dialog opens
  React.useEffect(() => {
    if (open && media) {
      loadSubtitles();
    }
  }, [open, media]);

  const loadSubtitles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/subtitles/${media.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSubtitles(data.subtitles || []);
      }
    } catch (error) {
      console.error('Failed to load subtitles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLine = async () => {
    if (editingLine === null) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/subtitles/${media.id}/line/${editingLine}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: editText })
      });
      
      const data = await res.json();
      if (data.success) {
        setSubtitles(data.subtitles);
        setEditingLine(null);
        onSuccess?.();
      }
    } catch (error) {
      alert('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-spotify-dark-gray border-white/10 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Subtitles</DialogTitle>
          <DialogDescription>
            Edit subtitles for "{media?.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : subtitles.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No subtitles found</p>
          ) : (
            subtitles.map((line, index) => (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  editingLine === index 
                    ? "border-spotify-green bg-spotify-green/10" 
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xs text-gray-400 font-mono whitespace-nowrap pt-1">
                    {formatTime(line.startTime)} - {formatTime(line.endTime)}
                  </div>
                  
                  <div className="flex-1">
                    {editingLine === index ? (
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="bg-white/10 border-white/20 text-white min-h-[60px]"
                        autoFocus
                      />
                    ) : (
                      <p className="text-white">{line.text}</p>
                    )}
                  </div>
                  
                  <div>
                    {editingLine === index ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={handleSaveLine}
                          disabled={isSaving}
                          className="bg-spotify-green hover:bg-spotify-green/80"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLine(null)}
                          className="border-white/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingLine(index);
                          setEditText(line.text);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
