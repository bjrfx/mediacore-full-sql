import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  User,
  Disc,
  Music,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicApi, adminApi } from '../../services/api';
import { useUIStore, useContentStore } from '../../store';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton } from '../../components/ui/skeleton';
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
import { cn, generateGradient } from '../../lib/utils';

export default function AdminArtists() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { setArtistsCache, setAlbumsCache } = useContentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    genre: '',
    image: '',
    website: '',
  });

  // Fetch artists from API
  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: () => publicApi.getArtists({ limit: 200 }),
    onSuccess: (data) => {
      if (data?.data) {
        setArtistsCache(data.data);
      }
    },
  });

  // Fetch albums for stats
  const { data: albumsData } = useQuery({
    queryKey: ['albums'],
    queryFn: () => publicApi.getAlbums({ limit: 500 }),
    onSuccess: (data) => {
      if (data?.data) {
        setAlbumsCache(data.data);
      }
    },
  });

  const artists = artistsData?.data || [];
  const albums = albumsData?.data || [];

  // Create artist mutation
  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createArtist(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['artists']);
      setShowAddDialog(false);
      setFormData({ name: '', bio: '', genre: '', image: '', website: '' });
      addToast({ message: 'Artist created successfully', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to create artist',
        type: 'error',
      });
    },
  });

  // Update artist mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateArtist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['artists']);
      setShowEditDialog(false);
      setSelectedArtist(null);
      addToast({ message: 'Artist updated successfully', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to update artist',
        type: 'error',
      });
    },
  });

  // Delete artist mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, cascade }) => adminApi.deleteArtist(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries(['artists']);
      queryClient.invalidateQueries(['albums']);
      setShowDeleteDialog(false);
      setSelectedArtist(null);
      addToast({ message: 'Artist deleted successfully', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to delete artist',
        type: 'error',
      });
    },
  });

  const filteredArtists = searchQuery
    ? artists.filter(
        (artist) =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : artists;

  const handleAdd = () => {
    setFormData({ name: '', bio: '', genre: '', image: '', website: '' });
    setShowAddDialog(true);
  };

  const handleEdit = (artist) => {
    setSelectedArtist(artist);
    setFormData({
      name: artist.name,
      bio: artist.bio || '',
      genre: artist.genre || '',
      image: artist.image || '',
      website: artist.website || '',
    });
    setShowEditDialog(true);
  };

  const handleDelete = (artist) => {
    setSelectedArtist(artist);
    setShowDeleteDialog(true);
  };

  const handleSaveNew = () => {
    if (!formData.name.trim()) {
      addToast({ message: 'Artist name is required', type: 'error' });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!formData.name.trim()) {
      addToast({ message: 'Artist name is required', type: 'error' });
      return;
    }
    updateMutation.mutate({ id: selectedArtist.id, data: formData });
  };

  const confirmDelete = () => {
    deleteMutation.mutate({ id: selectedArtist.id, cascade: true });
  };

  const getArtistStats = (artistId) => {
    const artistAlbums = albums.filter((album) => album.artistId === artistId);
    return {
      albumCount: artistAlbums.length,
      trackCount: artistAlbums.reduce((acc, album) => acc + (album.trackCount || 0), 0),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Artists</h2>
          <p className="text-muted-foreground">
            Manage artists and their content
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Artist
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search artists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filteredArtists.length} artists</span>
        <span>•</span>
        <span>{albums.length} albums total</span>
      </div>

      {/* Loading State */}
      {artistsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No artists found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first artist to organize your content'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Artist
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredArtists.map((artist) => {
            const stats = getArtistStats(artist.id);
            return (
              <Card key={artist.id} className="group overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-0">
                  {/* Artist Image */}
                  <Link to={`/admin/artists/${artist.id}`}>
                    <div
                      className={cn(
                        'aspect-square relative overflow-hidden',
                        !artist.image && `bg-gradient-to-br ${generateGradient(artist.id)}`
                      )}
                    >
                      {artist.image ? (
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-20 w-20 text-white/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Overlay Stats */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-white text-sm">
                        <div className="flex items-center gap-1">
                          <Disc className="h-4 w-4" />
                          <span>{stats.albumCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Music className="h-4 w-4" />
                          <span>{stats.trackCount}</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Artist Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link 
                          to={`/admin/artists/${artist.id}`}
                          className="font-semibold truncate block hover:underline"
                        >
                          {artist.name}
                        </Link>
                        {artist.genre && (
                          <Badge variant="secondary" className="mt-1">
                            {artist.genre}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="iconSm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/artists/${artist.id}`}>
                              <User className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(artist)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {artist.website && (
                            <DropdownMenuItem asChild>
                              <a href={artist.website} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(artist)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {artist.bio && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {artist.bio}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Artist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Artist</DialogTitle>
            <DialogDescription>
              Create a new artist to organize your media content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Artist name"
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Input
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="e.g., Spirituality, Jazz, Rock"
              />
            </div>
            <div className="space-y-2">
              <Label>Biography</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description of the artist"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={createMutation.isLoading}>
              {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Artist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Artist Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Artist</DialogTitle>
            <DialogDescription>
              Update artist information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Artist name"
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Input
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="e.g., Spirituality, Jazz, Rock"
              />
            </div>
            <div className="space-y-2">
              <Label>Biography</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description of the artist"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isLoading}>
              {updateMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !deleteMutation.isPending && setShowDeleteDialog(open)}>
        <DialogContent className="relative">
          {/* Loading Overlay */}
          {deleteMutation.isPending && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
                Deleting artist...
              </p>
            </div>
          )}
          <DialogHeader>
            <DialogTitle>Delete Artist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedArtist?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will also remove all albums associated with this artist.
              The media files will not be deleted but will be unassigned.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Artist'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
