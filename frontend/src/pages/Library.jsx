import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ListMusic,
  Heart,
  Clock,
  Plus,
  MoreHorizontal,
  Play,
  Trash2,
  Edit,
} from 'lucide-react';
import { useLibraryStore, usePlayerStore } from '../store';
import { MediaList } from '../components/media';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { cn, generateGradient } from '../lib/utils';

export default function Library() {
  const navigate = useNavigate();
  const { playlists, favorites, createPlaylist, deletePlaylist, updatePlaylist } = useLibraryStore();
  const { history, playTrack } = usePlayerStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const playlist = createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim());
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateDialog(false);
      navigate(`/playlist/${playlist.id}`);
    }
  };

  const handleEditPlaylist = () => {
    if (editingPlaylist && newPlaylistName.trim()) {
      updatePlaylist(editingPlaylist.id, {
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim(),
      });
      setEditingPlaylist(null);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowEditDialog(false);
    }
  };

  const handleDeletePlaylist = (playlist) => {
    if (window.confirm(`Delete playlist "${playlist.name}"?`)) {
      deletePlaylist(playlist.id);
    }
  };

  const openEditDialog = (playlist) => {
    setEditingPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDescription(playlist.description || '');
    setShowEditDialog(true);
  };

  const PlaylistCard = ({ playlist }) => {
    const trackCount = playlist.tracks?.length || 0;
    
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => navigate(`/playlist/${playlist.id}`)}
        className="group relative p-4 rounded-lg bg-card hover:bg-secondary cursor-pointer transition-colors"
      >
        {/* Cover */}
        <div
          className={cn(
            'aspect-square rounded-md mb-4 overflow-hidden',
            !playlist.coverImage && `bg-gradient-to-br ${generateGradient(playlist.id)}`
          )}
        >
          {playlist.coverImage ? (
            <img
              src={playlist.coverImage}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ListMusic className="w-12 h-12 text-white/50" />
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="spotify"
              size="icon"
              className="h-12 w-12 rounded-full shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                if (playlist.tracks?.length > 0) {
                  playTrack(playlist.tracks[0], playlist.tracks);
                }
              }}
            >
              <Play className="h-6 w-6 ml-0.5" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{playlist.name}</h3>
            <p className="text-sm text-muted-foreground">
              {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(playlist);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlaylist(playlist);
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-full px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Library</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Playlist
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="playlists">
        <TabsList className="bg-transparent gap-2 mb-6">
          <TabsTrigger
            value="playlists"
            className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black bg-secondary"
          >
            <ListMusic className="h-4 w-4 mr-2" />
            Playlists
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black bg-secondary"
          >
            <Heart className="h-4 w-4 mr-2" />
            Favorites
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black bg-secondary"
          >
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Playlists tab */}
        <TabsContent value="playlists">
          {playlists.length === 0 ? (
            <div className="text-center py-12">
              <ListMusic className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first playlist to organize your favorite media
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Liked tab */}
        <TabsContent value="liked">
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No liked content yet</h3>
              <p className="text-muted-foreground">
                Content you like will appear here
              </p>
            </div>
          ) : (
            <MediaList media={favorites} showIndex />
          )}
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No listening history</h3>
              <p className="text-muted-foreground">
                Your recently played content will appear here
              </p>
            </div>
          ) : (
            <MediaList media={history} showDate />
          )}
        </TabsContent>
      </Tabs>

      {/* Create playlist dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription>
              Give your playlist a name and optional description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="My Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylist();
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="Add a description..."
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit playlist dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Add a description..."
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPlaylist} disabled={!newPlaylistName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
