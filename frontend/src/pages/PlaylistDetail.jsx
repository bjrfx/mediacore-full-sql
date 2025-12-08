import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, MoreHorizontal, ListMusic, Trash2, Edit, Plus } from 'lucide-react';
import { useLibraryStore, usePlayerStore } from '../store';
import { MediaList } from '../components/media';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { generateGradient, formatDate } from '../lib/utils';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, deletePlaylist } = useLibraryStore();
  const { playTrack } = usePlayerStore();

  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <ListMusic className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Playlist not found</h2>
        <p className="text-muted-foreground mb-4">
          This playlist may have been deleted or doesn't exist
        </p>
        <Button onClick={() => navigate('/library')}>
          Back to Library
        </Button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleShuffle = () => {
    if (playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete playlist "${playlist.name}"?`)) {
      deletePlaylist(playlist.id);
      navigate('/library');
    }
  };

  const totalDuration = playlist.tracks.reduce(
    (acc, track) => acc + (track.duration || 0),
    0
  );

  return (
    <div className="min-h-full">
      {/* Header with gradient */}
      <div
        className={`relative px-6 pt-16 pb-8 bg-gradient-to-b ${generateGradient(playlist.id)} to-transparent`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Playlist cover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-48 h-48 md:w-56 md:h-56 rounded-lg shadow-2xl shrink-0 overflow-hidden ${!playlist.coverImage ? `bg-gradient-to-br ${generateGradient(playlist.id)}` : ''}`}
          >
            {playlist.coverImage ? (
              <img
                src={playlist.coverImage}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic className="w-20 h-20 text-white/50" />
              </div>
            )}
          </motion.div>

          {/* Playlist info */}
          <div className="flex-1">
            <span className="text-sm font-medium">Playlist</span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mt-2 mb-4"
            >
              {playlist.name}
            </motion.h1>
            {playlist.description && (
              <p className="text-muted-foreground mb-2">{playlist.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{playlist.tracks.length} tracks</span>
              {totalDuration > 0 && (
                <>
                  <span>•</span>
                  <span>{Math.floor(totalDuration / 60)} min</span>
                </>
              )}
              <span>•</span>
              <span>Created {formatDate(playlist.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="px-6 py-4 flex items-center gap-4">
        <Button
          variant="spotify"
          size="lg"
          className="rounded-full"
          onClick={handlePlayAll}
          disabled={playlist.tracks.length === 0}
        >
          <Play className="h-6 w-6 mr-2" />
          Play
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleShuffle}
          disabled={playlist.tracks.length === 0}
        >
          <Shuffle className="h-6 w-6" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tracks */}
      <div className="px-6 pb-8">
        {playlist.tracks.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              This playlist is empty
            </h3>
            <p className="text-muted-foreground mb-4">
              Add content to get started
            </p>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Find content
            </Button>
          </div>
        ) : (
          <MediaList
            media={playlist.tracks}
            showIndex
            showDragHandle
          />
        )}
      </div>
    </div>
  );
}
