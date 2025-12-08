import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Film,
  Music,
  X,
  CheckCircle,
  AlertCircle,
  FileVideo,
  FileAudio,
  Plus,
  User,
  Loader2,
  Languages,
  Globe,
  Trash2,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  Check,
  PlusCircle,
} from 'lucide-react';
import { publicApi, adminApi } from '../../services/api';
import { useUIStore } from '../../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { cn, formatFileSize } from '../../lib/utils';

// Supported languages list
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

export default function AdminUpload() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  
  // Tab state for switching between single and multi-language upload
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'multi'
  
  // Single upload state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState('video');
  const [language, setLanguage] = useState('en');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Multi-language upload state
  const [multiFiles, setMultiFiles] = useState([]); // [{file, language, progress, status}]
  const [multiTitle, setMultiTitle] = useState('');
  const [multiSubtitle, setMultiSubtitle] = useState('');
  const [multiType, setMultiType] = useState('video');
  const [contentGroupId, setContentGroupId] = useState(null);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  
  // Recently uploaded files
  const [recentUploads, setRecentUploads] = useState([]);
  const [showRecentUploads, setShowRecentUploads] = useState(true);
  
  // Artist/Album selection
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [showNewArtistDialog, setShowNewArtistDialog] = useState(false);
  const [showNewAlbumDialog, setShowNewAlbumDialog] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');

  // Link existing content dialog
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingFile, setLinkingFile] = useState(null);
  const [selectedContentGroup, setSelectedContentGroup] = useState('');

  // Fetch artists from API
  const { data: artistsData } = useQuery({
    queryKey: ['artists'],
    queryFn: () => publicApi.getArtists({ limit: 200 }),
  });

  // Fetch albums for selected artist
  const { data: albumsData } = useQuery({
    queryKey: ['artist-albums', selectedArtistId],
    queryFn: () => publicApi.getArtistAlbums(selectedArtistId),
    enabled: !!selectedArtistId,
  });

  // Fetch all media for content groups (for linking)
  const { data: mediaData } = useQuery({
    queryKey: ['media', 'all'],
    queryFn: () => publicApi.getMedia({ limit: 200 }),
  });

  const artists = artistsData?.data || [];
  const artistAlbums = albumsData?.data || [];
  const allMedia = mediaData?.data || [];

  // Get unique content groups from media
  const contentGroups = useMemo(() => {
    const groups = {};
    allMedia.forEach(item => {
      if (item.contentGroupId) {
        if (!groups[item.contentGroupId]) {
          groups[item.contentGroupId] = {
            id: item.contentGroupId,
            title: item.title,
            languages: [],
            items: [],
          };
        }
        groups[item.contentGroupId].languages.push(item.language || 'en');
        groups[item.contentGroupId].items.push(item);
      }
    });
    return Object.values(groups);
  }, [allMedia]);

  // Create artist mutation
  const createArtistMutation = useMutation({
    mutationFn: (data) => adminApi.createArtist(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['artists']);
      setSelectedArtistId(response.data.id);
      setNewArtistName('');
      setShowNewArtistDialog(false);
      addToast({ message: 'Artist created', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to create artist',
        type: 'error',
      });
    },
  });

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: (data) => adminApi.createAlbum(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['artist-albums', selectedArtistId]);
      setSelectedAlbumId(response.data.id);
      setNewAlbumTitle('');
      setShowNewAlbumDialog(false);
      addToast({ message: 'Album created', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to create album',
        type: 'error',
      });
    },
  });

  // Upload mutation - now includes language support
  const uploadMutation = useMutation({
    mutationFn: ({ file, title, subtitle, type, artistId, albumId, language, contentGroupId }) =>
      adminApi.uploadMedia(file, title, subtitle, type, setUploadProgress, artistId || null, albumId || null, language, contentGroupId),
    onSuccess: async (data) => {
      queryClient.invalidateQueries(['media']);
      queryClient.invalidateQueries(['admin-media']);
      queryClient.invalidateQueries(['artist-media', selectedArtistId]);
      
      // If album is selected, also add media to album with track number
      const mediaId = data?.data?.id;
      if (mediaId && selectedAlbumId) {
        try {
          const albumMediaResponse = await publicApi.getAlbumMedia(selectedAlbumId);
          const currentTracks = albumMediaResponse?.data || [];
          const nextTrackNumber = currentTracks.length + 1;
          
          await adminApi.addMediaToAlbum(selectedAlbumId, mediaId, nextTrackNumber);
          queryClient.invalidateQueries(['album-media', selectedAlbumId]);
        } catch (error) {
          console.error('Failed to add media to album:', error);
        }
      }

      // Add to recent uploads
      const langInfo = LANGUAGES.find(l => l.code === language) || { name: language };
      setRecentUploads(prev => [{
        id: mediaId,
        title: title,
        type: type,
        language: language,
        languageName: langInfo.name,
        contentGroupId: data?.data?.contentGroupId || contentGroupId,
        uploadedAt: new Date().toISOString(),
      }, ...prev].slice(0, 10));
      
      resetForm();
      addToast({ message: 'Media uploaded successfully!', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Upload failed',
        type: 'error',
      });
    },
  });

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setSubtitle('');
    setType('video');
    setLanguage('en');
    setUploadProgress(0);
    setSelectedArtistId('');
    setSelectedAlbumId('');
    setContentGroupId(null);
  };

  const resetMultiForm = () => {
    setMultiFiles([]);
    setMultiTitle('');
    setMultiSubtitle('');
    setMultiType('video');
    setContentGroupId(null);
    setSelectedArtistId('');
    setSelectedAlbumId('');
  };
  
  const handleCreateArtist = () => {
    if (!newArtistName.trim()) return;
    createArtistMutation.mutate({ name: newArtistName.trim() });
  };
  
  const handleCreateAlbum = () => {
    if (!newAlbumTitle.trim() || !selectedArtistId) return;
    createAlbumMutation.mutate({ 
      title: newAlbumTitle.trim(), 
      artistId: selectedArtistId 
    });
  };

  // Handle file drop for single upload
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files[0] || e.target?.files[0];
    if (droppedFile) {
      const fileType = droppedFile.type;
      if (fileType.startsWith('video/') || fileType.startsWith('audio/')) {
        setFile(droppedFile);
        setType(fileType.startsWith('video/') ? 'video' : 'audio');
        if (!title) {
          const name = droppedFile.name.replace(/\.[^/.]+$/, '');
          setTitle(name);
        }
      } else {
        addToast({
          message: 'Please upload a video (MP4) or audio (MP3) file',
          type: 'error',
        });
      }
    }
  }, [title, addToast]);

  // Handle file drop for multi-language upload
  const handleMultiFileDrop = useCallback((e, targetLanguage = null) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files || e.target?.files;
    if (droppedFiles?.length > 0) {
      const newFiles = [];
      Array.from(droppedFiles).forEach((file, index) => {
        const fileType = file.type;
        if (fileType.startsWith('video/') || fileType.startsWith('audio/')) {
          // Determine language - use target if specified, otherwise try to detect or use default
          let fileLang = targetLanguage;
          if (!fileLang) {
            // Try to detect language from filename (e.g., "video_hindi.mp4", "audio-te.mp3")
            const fileName = file.name.toLowerCase();
            const detectedLang = LANGUAGES.find(l => 
              fileName.includes(`_${l.code}`) || 
              fileName.includes(`-${l.code}`) ||
              fileName.includes(`(${l.code})`) ||
              fileName.includes(l.name.toLowerCase())
            );
            fileLang = detectedLang?.code || 'en';
          }
          
          newFiles.push({
            id: `${Date.now()}-${index}`,
            file,
            language: fileLang,
            progress: 0,
            status: 'pending', // pending, uploading, success, error
          });
          
          if (!multiType && index === 0) {
            setMultiType(fileType.startsWith('video/') ? 'video' : 'audio');
          }
          if (!multiTitle && index === 0) {
            const name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-](en|hi|te|ta|kn|ml|mr|bn|gu|pa|ur|es|fr|de|ja|ko|zh|ar|pt|ru)$/i, '');
            setMultiTitle(name);
          }
        }
      });
      
      setMultiFiles(prev => [...prev, ...newFiles]);
    }
  }, [multiTitle, multiType]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Update language for a file in multi-upload
  const updateFileLanguage = (fileId, newLanguage) => {
    setMultiFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, language: newLanguage } : f
    ));
  };

  // Remove file from multi-upload
  const removeMultiFile = (fileId) => {
    setMultiFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Add new language version
  const handleAddLanguageVersion = (e) => {
    e.preventDefault();
    const file = e.target?.files?.[0];
    if (file) {
      const availableLangs = LANGUAGES.filter(l => 
        !multiFiles.some(f => f.language === l.code)
      );
      handleMultiFileDrop(e, availableLangs[0]?.code || 'en');
    }
    setShowAddLanguage(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      addToast({ message: 'Please select a file and enter a title', type: 'error' });
      return;
    }
    uploadMutation.mutate({ 
      file, 
      title: title.trim(), 
      subtitle: subtitle.trim(), 
      type,
      language,
      artistId: selectedArtistId || null,
      albumId: selectedAlbumId || null,
      contentGroupId: contentGroupId || null,
    });
  };

  // Upload all files in multi-language mode
  const handleMultiUpload = async () => {
    if (multiFiles.length === 0 || !multiTitle.trim()) {
      addToast({ message: 'Please add files and enter a title', type: 'error' });
      return;
    }

    // Generate a content group ID if not linking to existing
    const groupId = contentGroupId || `cg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Upload files sequentially
    for (let i = 0; i < multiFiles.length; i++) {
      const fileItem = multiFiles[i];
      
      // Update status to uploading
      setMultiFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading' } : f
      ));

      try {
        await adminApi.uploadMedia(
          fileItem.file,
          multiTitle.trim(),
          multiSubtitle.trim(),
          multiType,
          (progress) => {
            setMultiFiles(prev => prev.map(f => 
              f.id === fileItem.id ? { ...f, progress } : f
            ));
          },
          selectedArtistId || null,
          selectedAlbumId || null,
          fileItem.language,
          groupId
        );
        
        // Update status to success
        setMultiFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
        ));

        // Add to recent uploads
        const langInfo = LANGUAGES.find(l => l.code === fileItem.language) || { name: fileItem.language };
        setRecentUploads(prev => [{
          id: `${groupId}-${fileItem.language}`,
          title: multiTitle.trim(),
          type: multiType,
          language: fileItem.language,
          languageName: langInfo.name,
          contentGroupId: groupId,
          uploadedAt: new Date().toISOString(),
        }, ...prev].slice(0, 10));

      } catch (error) {
        // Update status to error
        setMultiFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error' } : f
        ));
        addToast({
          message: `Failed to upload ${fileItem.language} version: ${error.response?.data?.message || error.message}`,
          type: 'error',
        });
      }
    }

    queryClient.invalidateQueries(['media']);
    queryClient.invalidateQueries(['admin-media']);
    addToast({ message: 'Multi-language upload completed!', type: 'success' });
  };

  // Link file to existing content group
  const handleLinkToGroup = (file) => {
    setLinkingFile(file);
    setShowLinkDialog(true);
  };

  const confirmLinkToGroup = () => {
    if (linkingFile && selectedContentGroup) {
      setContentGroupId(selectedContentGroup);
      addToast({ message: 'Content will be linked to existing group', type: 'success' });
    }
    setShowLinkDialog(false);
    setLinkingFile(null);
    setSelectedContentGroup('');
  };

  const selectedArtist = artists.find((a) => a.id === selectedArtistId);
  const selectedAlbum = artistAlbums.find((a) => a.id === selectedAlbumId);

  // Get used languages in multi-upload
  const usedLanguages = multiFiles.map(f => f.language);
  const availableLanguages = LANGUAGES.filter(l => !usedLanguages.includes(l.code));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Upload Media
          </h2>
          <p className="text-muted-foreground">
            Upload video or audio files with multi-language support
          </p>
        </div>
      </div>

      {/* Upload Mode Tabs */}
      <Tabs value={uploadMode} onValueChange={setUploadMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Single Upload
          </TabsTrigger>
          <TabsTrigger value="multi" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Multi-Language Upload
          </TabsTrigger>
        </TabsList>

        {/* Single Upload Tab */}
        <TabsContent value="single" className="space-y-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drop zone */}
            <Card>
              <CardContent className="p-6">
                <div
                  onDrop={handleFileDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50',
                    file && 'border-primary bg-primary/5'
                  )}
                >
                  <input
                    type="file"
                    accept="video/mp4,audio/mp3,audio/mpeg,audio/m4a,audio/x-m4a,audio/mp4"
                    onChange={handleFileDrop}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <AnimatePresence mode="wait">
                      {file ? (
                        <motion.div
                          key="file-selected"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="space-y-4"
                        >
                          <div className="inline-flex p-4 rounded-full bg-primary/20">
                            {type === 'video' ? (
                              <FileVideo className="h-8 w-8 text-primary" />
                            ) : (
                              <FileAudio className="h-8 w-8 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              setFile(null);
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="drop-zone"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="space-y-4"
                        >
                          <div className="inline-flex p-4 rounded-full bg-muted">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">
                              Drag and drop your file here
                            </p>
                            <p className="text-sm text-muted-foreground">
                              or click to browse
                            </p>
                          </div>
                          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Film className="h-4 w-4" />
                              MP4 Videos
                            </span>
                            <span className="flex items-center gap-1">
                              <Music className="h-4 w-4" />
                              MP3 Audio
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Maximum file size: 500MB
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Media details */}
            <Card>
              <CardHeader>
                <CardTitle>Media Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter media title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language *</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {lang.name} ({lang.nativeName})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Description</Label>
                  <Textarea
                    id="subtitle"
                    placeholder="Enter a description (optional)"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Media Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <span className="flex items-center gap-2">
                          <Film className="h-4 w-4" />
                          Video
                        </span>
                      </SelectItem>
                      <SelectItem value="audio">
                        <span className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          Audio
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Link to existing content group */}
                {contentGroups.length > 0 && (
                  <div className="space-y-2">
                    <Label>Link to Existing Content (for language versions)</Label>
                    <Select value={contentGroupId || "new"} onValueChange={(v) => setContentGroupId(v === "new" ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Create new content or link to existing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">
                          <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            New Content (no link)
                          </span>
                        </SelectItem>
                        {contentGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <span className="flex items-center gap-2">
                              <Link2 className="h-4 w-4" />
                              {group.title} ({group.languages.join(', ')})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {contentGroupId && (
                      <p className="text-xs text-muted-foreground">
                        This upload will be linked as a language variant of the selected content.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Artist & Album Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Artist & Album (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Artist</Label>
                  <div className="flex gap-2">
                    <Select value={selectedArtistId || "none"} onValueChange={(value) => {
                      setSelectedArtistId(value === "none" ? "" : value);
                      setSelectedAlbumId('');
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select an artist" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No artist</SelectItem>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewArtistDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedArtistId && (
                  <div className="space-y-2">
                    <Label>Album</Label>
                    <div className="flex gap-2">
                      <Select value={selectedAlbumId || "none"} onValueChange={(value) => setSelectedAlbumId(value === "none" ? "" : value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select an album" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No album (singles)</SelectItem>
                          {artistAlbums.map((album) => (
                            <SelectItem key={album.id} value={album.id}>
                              {album.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowNewAlbumDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedArtistId && (
                  <p className="text-xs text-muted-foreground">
                    This media will be assigned to{' '}
                    <strong>{selectedArtist?.name}</strong>
                    {selectedAlbumId && (
                      <>
                        {' '}in album{' '}
                        <strong>{selectedAlbum?.title}</strong>
                      </>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upload progress */}
            {uploadMutation.isPending && (
              <Card>
                <CardContent className="py-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!file || !title.trim() || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Media
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Multi-Language Upload Tab */}
        <TabsContent value="multi" className="space-y-6 mt-6">
          {/* Drop zone for multiple files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Upload Multiple Language Versions
              </CardTitle>
              <CardDescription>
                Upload the same content in different languages. Files will be grouped together automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDrop={handleMultiFileDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <input
                  type="file"
                  accept="video/mp4,audio/mp3,audio/mpeg,audio/m4a,audio/x-m4a,audio/mp4"
                  onChange={(e) => handleMultiFileDrop(e)}
                  className="hidden"
                  id="multi-file-upload"
                  multiple
                />
                <label htmlFor="multi-file-upload" className="cursor-pointer">
                  <div className="space-y-2">
                    <div className="inline-flex p-3 rounded-full bg-muted">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drop files here or click to browse</p>
                      <p className="text-sm text-muted-foreground">
                        You can upload multiple files at once
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Uploaded files list */}
              {multiFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Language Versions ({multiFiles.length})</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('add-language-file').click()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                    <input
                      type="file"
                      accept="video/mp4,audio/mp3,audio/mpeg,audio/m4a,audio/x-m4a,audio/mp4"
                      onChange={handleAddLanguageVersion}
                      className="hidden"
                      id="add-language-file"
                    />
                  </div>

                  <div className="space-y-2">
                    {multiFiles.map((fileItem) => {
                      const langInfo = LANGUAGES.find(l => l.code === fileItem.language);
                      return (
                        <motion.div
                          key={fileItem.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border',
                            fileItem.status === 'success' && 'border-green-500/50 bg-green-500/10',
                            fileItem.status === 'error' && 'border-red-500/50 bg-red-500/10',
                            fileItem.status === 'uploading' && 'border-primary/50 bg-primary/10'
                          )}
                        >
                          <div className="p-2 rounded bg-muted">
                            {fileItem.file.type.startsWith('video/') ? (
                              <FileVideo className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <FileAudio className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(fileItem.file.size)}
                            </p>
                            {fileItem.status === 'uploading' && (
                              <Progress value={fileItem.progress} className="h-1 mt-1" />
                            )}
                          </div>
                          <Select 
                            value={fileItem.language} 
                            onValueChange={(v) => updateFileLanguage(fileItem.id, v)}
                            disabled={fileItem.status === 'uploading' || fileItem.status === 'success'}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem 
                                  key={lang.code} 
                                  value={lang.code}
                                  disabled={usedLanguages.includes(lang.code) && lang.code !== fileItem.language}
                                >
                                  {lang.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant={
                            fileItem.status === 'success' ? 'default' :
                            fileItem.status === 'error' ? 'destructive' :
                            fileItem.status === 'uploading' ? 'secondary' : 'outline'
                          }>
                            {fileItem.status === 'success' && <Check className="h-3 w-3 mr-1" />}
                            {fileItem.status === 'uploading' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {fileItem.status}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMultiFile(fileItem.id)}
                            disabled={fileItem.status === 'uploading'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Details for Multi-upload */}
          {multiFiles.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Content Details</CardTitle>
                  <CardDescription>
                    These details will apply to all language versions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="multi-title">Title *</Label>
                    <Input
                      id="multi-title"
                      placeholder="Enter content title"
                      value={multiTitle}
                      onChange={(e) => setMultiTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="multi-subtitle">Description</Label>
                    <Textarea
                      id="multi-subtitle"
                      placeholder="Enter a description (optional)"
                      value={multiSubtitle}
                      onChange={(e) => setMultiSubtitle(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Media Type</Label>
                    <Select value={multiType} onValueChange={setMultiType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">
                          <span className="flex items-center gap-2">
                            <Film className="h-4 w-4" />
                            Video
                          </span>
                        </SelectItem>
                        <SelectItem value="audio">
                          <span className="flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            Audio
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Artist & Album for Multi-upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Artist & Album (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Artist</Label>
                    <div className="flex gap-2">
                      <Select value={selectedArtistId || "none"} onValueChange={(value) => {
                        setSelectedArtistId(value === "none" ? "" : value);
                        setSelectedAlbumId('');
                      }}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select an artist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No artist</SelectItem>
                          {artists.map((artist) => (
                            <SelectItem key={artist.id} value={artist.id}>
                              {artist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowNewArtistDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedArtistId && (
                    <div className="space-y-2">
                      <Label>Album</Label>
                      <div className="flex gap-2">
                        <Select value={selectedAlbumId || "none"} onValueChange={(value) => setSelectedAlbumId(value === "none" ? "" : value)}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select an album" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No album (singles)</SelectItem>
                            {artistAlbums.map((album) => (
                              <SelectItem key={album.id} value={album.id}>
                                {album.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowNewAlbumDialog(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload All button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetMultiForm}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={multiFiles.length === 0 || !multiTitle.trim() || multiFiles.some(f => f.status === 'uploading')}
                  onClick={handleMultiUpload}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All ({multiFiles.length} files)
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Uploads Section */}
      {recentUploads.length > 0 && (
        <Collapsible open={showRecentUploads} onOpenChange={setShowRecentUploads}>
          <Card>
            <CardHeader className="py-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Recent Uploads ({recentUploads.length})
                  </CardTitle>
                  {showRecentUploads ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {recentUploads.map((upload, index) => (
                    <div
                      key={`${upload.id}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="p-1.5 rounded bg-muted">
                        {upload.type === 'video' ? (
                          <Film className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Music className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.uploadedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {upload.languageName}
                      </Badge>
                      {upload.contentGroupId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          Grouped
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Status messages */}
      <AnimatePresence>
        {uploadMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-green-500 bg-green-500/10 p-4 rounded-lg"
          >
            <CheckCircle className="h-5 w-5" />
            <span>Upload successful!</span>
          </motion.div>
        )}

        {uploadMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-lg"
          >
            <AlertCircle className="h-5 w-5" />
            <span>
              {uploadMutation.error?.response?.data?.message || 'Upload failed'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Artist Dialog */}
      <Dialog open={showNewArtistDialog} onOpenChange={setShowNewArtistDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Artist</DialogTitle>
            <DialogDescription>
              Add a new artist to organize your content
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Artist Name</Label>
            <Input
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              placeholder="e.g., Eckhart Tolle"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewArtistDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateArtist} 
              disabled={!newArtistName.trim() || createArtistMutation.isLoading}
            >
              {createArtistMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Artist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Album Dialog */}
      <Dialog open={showNewAlbumDialog} onOpenChange={setShowNewAlbumDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Album</DialogTitle>
            <DialogDescription>
              Add a new album for {selectedArtist?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Album Title</Label>
            <Input
              value={newAlbumTitle}
              onChange={(e) => setNewAlbumTitle(e.target.value)}
              placeholder="e.g., The Power of Now"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewAlbumDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAlbum} 
              disabled={!newAlbumTitle.trim() || createAlbumMutation.isLoading}
            >
              {createAlbumMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Content Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Existing Content</DialogTitle>
            <DialogDescription>
              Choose an existing content to add this as a language variant
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Content</Label>
              <Select value={selectedContentGroup} onValueChange={setSelectedContentGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content to link" />
                </SelectTrigger>
                <SelectContent>
                  {contentGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <span>{group.title}</span>
                        <span className="text-muted-foreground text-xs">
                          ({group.languages.join(', ')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLinkToGroup} disabled={!selectedContentGroup}>
              <Link2 className="mr-2 h-4 w-4" />
              Link Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
