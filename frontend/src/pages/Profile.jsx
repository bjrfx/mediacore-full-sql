import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  Play,
  Music,
  TrendingUp,
  Flame,
  Calendar,
  BarChart3,
  LogOut,
  Settings,
  Trophy,
  Headphones,
  Disc,
  RefreshCw,
  Key,
  Shield,
} from 'lucide-react';
import { useAuthStore, usePlayerStore } from '../store';
import useStatsStore from '../store/statsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
import SetPasswordModal from '../components/auth/SetPasswordModal';

// Format time from seconds to readable string
const formatTime = (seconds) => {
  if (!seconds || seconds < 60) return '< 1 min';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Format large numbers
const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subtext, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="relative overflow-hidden">
      <div className={cn('absolute inset-0 opacity-10', gradient)} />
      <CardContent className="pt-6 relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-full', gradient)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Top Track Item
const TopTrackItem = ({ track, rank, onPlay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: rank * 0.05 }}
    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer"
    onClick={() => onPlay(track)}
  >
    <span className="text-lg font-bold text-muted-foreground w-6">
      {rank}
    </span>
    <div className="relative">
      <img
        src={track.thumbnail || '/placeholder-album.jpg'}
        alt={track.title}
        className="w-12 h-12 rounded object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
        <Play className="h-5 w-5 text-white" fill="white" />
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{track.title}</p>
      <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
    </div>
    <div className="text-right">
      <p className="font-semibold text-primary">{track.playCount}</p>
      <p className="text-xs text-muted-foreground">plays</p>
    </div>
  </motion.div>
);

// Top Artist Item
const TopArtistItem = ({ artist, rank }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: rank * 0.05 }}
    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
  >
    <span className="text-lg font-bold text-muted-foreground w-6">
      {rank}
    </span>
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
      <User className="h-6 w-6 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{artist.name}</p>
    </div>
    <div className="text-right">
      <p className="font-semibold text-primary">{artist.playCount}</p>
      <p className="text-xs text-muted-foreground">plays</p>
    </div>
  </motion.div>
);

// Listening Chart (Simple bar visualization)
const ListeningChart = ({ data }) => {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1);
  
  return (
    <div className="flex items-end justify-between gap-2 h-32 px-2">
      {data.map((day, index) => (
        <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
            transition={{ delay: index * 0.05, duration: 0.5 }}
            className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t min-h-[4px]"
            style={{ maxHeight: '100%' }}
          />
          <span className="text-xs text-muted-foreground">{day.displayDate}</span>
        </div>
      ))}
    </div>
  );
};

export default function Profile() {
  const { user, isAuthenticated, isAdminUser, logout } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const {
    stats,
    isLoading,
    fetchStats,
    getStatsSummary,
    getTopTracks,
    getTopArtists,
    getWeeklyActivity,
    resetStats,
  } = useStatsStore();

  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);

  // Fetch stats on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, fetchStats]);

  // Get computed stats data
  const statsSummary = useMemo(() => getStatsSummary(), [stats, getStatsSummary]);
  const topTracks = useMemo(() => getTopTracks(5), [stats, getTopTracks]);
  const topArtists = useMemo(() => getTopArtists(5), [stats, getTopArtists]);
  const weeklyListening = useMemo(() => getWeeklyActivity(), [stats, getWeeklyActivity]);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleClearStats = async () => {
    if (window.confirm('Are you sure you want to clear all listening statistics? This cannot be undone.')) {
      await resetStats();
    }
  };

  const handleRefreshStats = () => {
    fetchStats();
  };

  const handlePlayTrack = (track) => {
    if (track && track.id) {
      playTrack({
        id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        type: track.type,
      });
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-full px-6 py-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to MediaCore</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Sign in to track your listening history, view your stats, and get personalized recommendations.
          </p>
          <Button
            size="lg"
            onClick={() => window.dispatchEvent(new Event('show-login-modal'))}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-4 pb-32">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 h-48 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20 rounded-xl -z-10" />
        
        <div className="pt-8 px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
              <AvatarImage src={user?.photoURL} alt={user?.displayName} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-purple-600 text-white">
                {getInitials(user?.displayName || user?.email)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left pb-4">
              <h1 className="text-3xl font-bold">
                {user?.displayName || 'Music Lover'}
              </h1>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                {isAdminUser && (
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                    Admin
                  </span>
                )}
                <span className="px-2 py-1 text-[#EDE9FE] text-xs rounded-full font-medium flex items-center gap-1" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                  <Flame className="h-3 w-3" />
                  {statsSummary.currentStreak} day streak
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 pb-4">
              <Button variant="outline" size="sm" onClick={handleRefreshStats} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Your Stats
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            label="Total Listening"
            value={statsSummary.totalHours > 0 ? `${statsSummary.totalHours}h` : `${statsSummary.totalMinutes}m`}
            subtext={`${formatTime(statsSummary.totalListeningTime)} of music`}
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatCard
            icon={Play}
            label="Total Plays"
            value={formatNumber(statsSummary.totalPlays)}
            subtext="tracks played"
            gradient="bg-gradient-to-br from-green-500 to-emerald-500"
            delay={0.1}
          />
          <StatCard
            icon={Music}
            label="Unique Tracks"
            value={formatNumber(statsSummary.uniqueTracks)}
            subtext="different songs"
            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
            delay={0.2}
          />
          <StatCard
            icon={Headphones}
            label="Artists"
            value={formatNumber(statsSummary.uniqueArtists)}
            subtext="unique artists"
            gradient="bg-gradient-to-br from-orange-500 to-red-500"
            delay={0.3}
          />
        </div>
      </section>

      {/* Streaks and Achievements */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Listening Streaks
              </CardTitle>
              <CardDescription>Keep the music playing!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-4xl font-bold text-orange-500">{statsSummary.currentStreak}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="w-px bg-border" />
                <div>
                  <p className="text-4xl font-bold text-yellow-500">{statsSummary.longestStreak}</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                This Week
              </CardTitle>
              <CardDescription>Your listening activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ListeningChart data={weeklyListening} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Top Content Section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Tracks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Tracks
              </CardTitle>
              <CardDescription>Your most played tracks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <Skeleton className="w-6 h-6 rounded" />
                      <Skeleton className="w-12 h-12 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topTracks.length > 0 ? (
                <div className="space-y-1">
                  {topTracks.map((track, index) => (
                    <TopTrackItem
                      key={track.mediaId || index}
                      track={{
                        id: track.mediaId,
                        title: track.title,
                        artist: track.artist || track.artistName,
                        thumbnail: track.thumbnail,
                        playCount: track.playCount,
                      }}
                      rank={index + 1}
                      onPlay={handlePlayTrack}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Disc className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No plays yet</p>
                  <p className="text-sm">Start listening to see your top tracks</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Artists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top Artists
              </CardTitle>
              <CardDescription>Artists you love the most</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <Skeleton className="w-6 h-6 rounded" />
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : topArtists.length > 0 ? (
                <div className="space-y-1">
                  {topArtists.map((artist, index) => (
                    <TopArtistItem
                      key={artist.artistId || artist.name || index}
                      artist={artist}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No artists yet</p>
                  <p className="text-sm">Explore and listen to discover artists</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-4">
        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Account Security
            </CardTitle>
            <CardDescription>Manage your authentication methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Password Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.hasPassword !== false 
                        ? 'You can sign in with email and password'
                        : 'Set a password to enable email/password sign-in'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={user?.hasPassword !== false ? "outline" : "default"}
                  size="sm"
                  onClick={() => setShowSetPasswordModal(true)}
                >
                  {user?.hasPassword !== false ? 'Change Password' : 'Set Password'}
                </Button>
              </div>

              {user?.photoURL && (
                <div className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Google Sign-In</p>
                      <p className="text-sm text-muted-foreground">
                        Your account is linked with Google
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/10 text-green-600 text-xs rounded-full font-medium">
                    Connected
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Manage your listening data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" asChild>
                <Link to="/history">
                  <Clock className="h-4 w-4 mr-2" />
                  View History
                </Link>
              </Button>
              <Button variant="destructive" onClick={handleClearStats}>
                Clear All Stats
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Set Password Modal */}
      <SetPasswordModal
        open={showSetPasswordModal}
        onOpenChange={setShowSetPasswordModal}
      />
    </div>
  );
}
