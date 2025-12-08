import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Film,
  Music,
  Search,
  Trash2,
  Edit,
  MoreHorizontal,
  Grid,
  List,
  Play,
  Eye,
} from 'lucide-react';
import { publicApi, adminApi } from '../../services/api';
import { useUIStore } from '../../store';
import { Card, CardContent } from '../../components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { cn, formatDate, formatFileSize, generateGradient } from '../../lib/utils';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

// Simple table components
const SimpleTable = ({ children, className }) => (
  <div className={cn('w-full overflow-auto', className)}>
    <table className="w-full caption-bottom text-sm">{children}</table>
  </div>
);

const SimpleTableHeader = ({ children }) => <thead>{children}</thead>;
const SimpleTableBody = ({ children }) => <tbody>{children}</tbody>;
const SimpleTableRow = ({ children, className }) => (
  <tr className={cn('border-b transition-colors hover:bg-muted/50', className)}>{children}</tr>
);
const SimpleTableHead = ({ children, className }) => (
  <th className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)}>{children}</th>
);
const SimpleTableCell = ({ children, className }) => (
  <td className={cn('p-4 align-middle', className)}>{children}</td>
);

export default function AdminMedia() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [editingMedia, setEditingMedia] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', subtitle: '' });

  // Fetch media - always fetch all, then filter client-side
  // Backend may have issues with type filter parameter
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-media'],
    queryFn: () => publicApi.getMedia({ limit: 500 }),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateMedia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['media']);
      setShowEditDialog(false);
      setEditingMedia(null);
      addToast({ message: 'Media updated successfully', type: 'success' });
    },
    onError: (error) => {
      addToast({ message: error.message || 'Failed to update media', type: 'error' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteFile }) => adminApi.deleteMedia(id, deleteFile),
    onSuccess: () => {
      queryClient.invalidateQueries(['media']);
      setShowDeleteDialog(false);
      setMediaToDelete(null);
      addToast({ message: 'Media deleted successfully', type: 'success' });
    },
    onError: (error) => {
      addToast({ message: error.message || 'Failed to delete media', type: 'error' });
    },
  });

  const allMedia = data?.data || [];
  
  // Apply type filter client-side
  const typeFilteredMedia = filter === 'all' 
    ? allMedia 
    : allMedia.filter(item => item.type === filter);
  
  // Then apply search filter
  const filteredMedia = searchQuery
    ? typeFilteredMedia.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : typeFilteredMedia;

  const handleEdit = (media) => {
    setEditingMedia(media);
    setEditForm({ title: media.title, subtitle: media.subtitle || '' });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingMedia) {
      updateMutation.mutate({
        id: editingMedia.id,
        data: editForm,
      });
    }
  };

  const handleDelete = (media) => {
    setMediaToDelete(media);
    setShowDeleteDialog(true);
  };

  const confirmDelete = (deleteFile = true) => {
    if (mediaToDelete) {
      deleteMutation.mutate({
        id: mediaToDelete.id,
        deleteFile,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Media Library</h2>
          <p className="text-muted-foreground">
            Manage your uploaded media files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filteredMedia.length} items shown</span>
        <span>•</span>
        <span>{allMedia.filter((m) => m.type === 'video').length} videos total</span>
        <span>•</span>
        <span>{allMedia.filter((m) => m.type === 'audio').length} audio total</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          Failed to load media. Please try again.
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No media found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Upload your first media file'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <Card>
          <SimpleTable>
            <SimpleTableHeader>
              <SimpleTableRow>
                <SimpleTableHead>Media</SimpleTableHead>
                <SimpleTableHead>Type</SimpleTableHead>
                <SimpleTableHead className="hidden md:table-cell">Size</SimpleTableHead>
                <SimpleTableHead className="hidden md:table-cell">Date</SimpleTableHead>
                <SimpleTableHead className="text-right">Actions</SimpleTableHead>
              </SimpleTableRow>
            </SimpleTableHeader>
            <SimpleTableBody>
              {filteredMedia.map((media) => (
                <SimpleTableRow key={media.id}>
                  <SimpleTableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded shrink-0',
                          `bg-gradient-to-br ${generateGradient(media.id)}`
                        )}
                      >
                        {media.thumbnail && (
                          <img
                            src={media.thumbnail}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{media.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {media.subtitle || 'No description'}
                        </p>
                      </div>
                    </div>
                  </SimpleTableCell>
                  <SimpleTableCell>
                    <Badge
                      variant={media.type === 'video' ? 'default' : 'secondary'}
                    >
                      {media.type === 'video' ? (
                        <Film className="h-3 w-3 mr-1" />
                      ) : (
                        <Music className="h-3 w-3 mr-1" />
                      )}
                      {media.type}
                    </Badge>
                  </SimpleTableCell>
                  <SimpleTableCell className="hidden md:table-cell">
                    {formatFileSize(media.fileSize)}
                  </SimpleTableCell>
                  <SimpleTableCell className="hidden md:table-cell">
                    {formatDate(media.createdAt)}
                  </SimpleTableCell>
                  <SimpleTableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="iconSm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => window.open(media.fileUrl, '_blank')}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(media)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(media)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SimpleTableCell>
                </SimpleTableRow>
              ))}
            </SimpleTableBody>
          </SimpleTable>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((media) => (
            <Card key={media.id} className="group overflow-hidden">
              <div
                className={cn(
                  'aspect-square relative',
                  `bg-gradient-to-br ${generateGradient(media.id)}`
                )}
              >
                {media.thumbnail && (
                  <img
                    src={media.thumbnail}
                    alt={media.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => window.open(media.fileUrl, '_blank')}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleEdit(media)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(media)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Badge
                  className="absolute top-2 left-2"
                  variant={media.type === 'video' ? 'default' : 'secondary'}
                >
                  {media.type}
                </Badge>
              </div>
              <CardContent className="p-3">
                <p className="font-medium truncate">{media.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(media.fileSize)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update the media metadata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.subtitle}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{mediaToDelete?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. You can choose to keep the file on
              the server or delete it completely.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => confirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Keep File
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete(true)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
