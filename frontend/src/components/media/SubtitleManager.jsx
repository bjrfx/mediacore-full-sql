import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Subtitles,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Globe,
  Loader2,
  Plus,
  Star,
} from 'lucide-react';
import { publicApi, adminApi } from '../../services/api';
import { useUIStore } from '../../store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

// Supported languages list
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
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

/**
 * SubtitleManager - Component for managing subtitles/lyrics for a media item
 * Used in AdminMedia or as a standalone dialog
 */
export default function SubtitleManager({
  mediaId,
  mediaTitle,
  isOpen,
  onClose,
}) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  // State for add/edit dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Upload form state
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [subtitleLanguage, setSubtitleLanguage] = useState('en');
  const [subtitleLabel, setSubtitleLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch subtitles for this media
  const { data: subtitlesData, isLoading } = useQuery({
    queryKey: ['subtitles', mediaId],
    queryFn: () => publicApi.getSubtitles(mediaId),
    enabled: !!mediaId && isOpen,
  });

  const subtitles = subtitlesData?.data || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, options }) => adminApi.uploadSubtitle(mediaId, file, options),
    onSuccess: () => {
      queryClient.invalidateQueries(['subtitles', mediaId]);
      resetForm();
      setShowAddDialog(false);
      addToast({ message: 'Subtitle uploaded successfully!', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to upload subtitle',
        type: 'error',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateSubtitle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subtitles', mediaId]);
      setEditingSubtitle(null);
      addToast({ message: 'Subtitle updated successfully!', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to update subtitle',
        type: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteSubtitle(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subtitles', mediaId]);
      setDeleteConfirmId(null);
      addToast({ message: 'Subtitle deleted successfully!', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to delete subtitle',
        type: 'error',
      });
    },
  });

  const resetForm = () => {
    setSubtitleFile(null);
    setSubtitleLanguage('en');
    setSubtitleLabel('');
    setIsDefault(false);
  };

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['srt', 'vtt', 'txt'].includes(ext)) {
        setSubtitleFile(file);
        if (!subtitleLabel) {
          setSubtitleLabel(file.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        addToast({
          message: 'Please upload a .srt, .vtt, or .txt file',
          type: 'error',
        });
      }
    }
  };

  const handleUpload = () => {
    if (!subtitleFile) {
      addToast({ message: 'Please select a file', type: 'error' });
      return;
    }

    uploadMutation.mutate({
      file: subtitleFile,
      options: {
        language: subtitleLanguage,
        label: subtitleLabel || undefined,
        isDefault,
      },
    });
  };

  const handleUpdate = (subtitle) => {
    updateMutation.mutate({
      id: subtitle.id,
      data: {
        language: subtitle.language,
        label: subtitle.label,
        isDefault: subtitle.isDefault,
      },
    });
  };

  const getFormatColor = (format) => {
    switch (format) {
      case 'srt':
        return 'text-[#6366F1]';
      case 'vtt':
        return 'text-[#22C55E]';
      case 'txt':
        return 'text-orange-400';
      default:
        return 'text-[#9CA3AF]';
    }
  };
  
  const getFormatBg = (format) => {
    switch (format) {
      case 'srt':
        return 'rgba(99, 102, 241, 0.15)';
      case 'vtt':
        return 'rgba(34, 197, 94, 0.15)';
      case 'txt':
        return 'rgba(251, 146, 60, 0.15)';
      default:
        return 'rgba(156, 163, 175, 0.15)';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Subtitles className="h-5 w-5" />
            Manage Subtitles / Lyrics
          </DialogTitle>
          <DialogDescription>
            {mediaTitle ? `Managing subtitles for "${mediaTitle}"` : 'Add or edit subtitle tracks'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new subtitle button */}
          <Button
            onClick={() => setShowAddDialog(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subtitle Track
          </Button>

          {/* Subtitles list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : subtitles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subtitles uploaded yet</p>
              <p className="text-sm">Upload SRT, VTT, or TXT files</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subtitles.map((sub) => (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    {editingSubtitle?.id === sub.id ? (
                      // Editing mode
                      <div className="space-y-2">
                        <Input
                          value={editingSubtitle.label}
                          onChange={(e) => setEditingSubtitle({
                            ...editingSubtitle,
                            label: e.target.value,
                          })}
                          placeholder="Label"
                        />
                        <Select
                          value={editingSubtitle.language}
                          onValueChange={(v) => setEditingSubtitle({
                            ...editingSubtitle,
                            language: v,
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`default-${sub.id}`}
                            checked={editingSubtitle.isDefault}
                            onChange={(e) => setEditingSubtitle({
                              ...editingSubtitle,
                              isDefault: e.target.checked,
                            })}
                          />
                          <Label htmlFor={`default-${sub.id}`} className="text-sm">
                            Default track
                          </Label>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{sub.label}</span>
                          {sub.isDefault && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {LANGUAGES.find(l => l.code === sub.language)?.name || sub.language}
                        </div>
                      </div>
                    )}
                  </div>

                  <Badge className={cn('flex-shrink-0', getFormatColor(sub.format))} style={{ background: getFormatBg(sub.format) }}>
                    {sub.format.toUpperCase()}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {editingSubtitle?.id === sub.id ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleUpdate(editingSubtitle)}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingSubtitle(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingSubtitle({ ...sub })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(sub.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Subtitle Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtitle Track</DialogTitle>
            <DialogDescription>
              Upload SRT, VTT, or TXT subtitle file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File input */}
            <div className="space-y-2">
              <Label>Subtitle File</Label>
              <input
                type="file"
                accept=".srt,.vtt,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="add-subtitle-file"
              />
              <label
                htmlFor="add-subtitle-file"
                className={cn(
                  'flex items-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                  subtitleFile
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {subtitleFile ? (
                  <>
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{subtitleFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(subtitleFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setSubtitleFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Click to select file
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={subtitleLanguage} onValueChange={setSubtitleLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label>Display Label</Label>
              <Input
                placeholder="e.g., English, English (CC)"
                value={subtitleLabel}
                onChange={(e) => setSubtitleLabel(e.target.value)}
              />
            </div>

            {/* Default checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <Label htmlFor="is-default" className="text-sm font-normal">
                Set as default subtitle track
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!subtitleFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtitle?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The subtitle file will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
