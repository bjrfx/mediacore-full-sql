import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore, useUIStore } from './store';

// Layout
import { MainLayout } from './components/layout';

// Auth components
import { LoginModal, ProtectedRoute } from './components/auth';

// Player
import { VideoPlayer } from './components/player';

// PWA
import { InstallPrompt } from './components/pwa';

// Subscription
import { SubscriptionProvider } from './components/subscription';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Library = lazy(() => import('./pages/Library'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));
const Favorites = lazy(() => import('./pages/LikedSongs'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const MediaPlayer = lazy(() => import('./pages/MediaPlayer'));
const ArtistPage = lazy(() => import('./pages/ArtistPage'));
const AlbumPage = lazy(() => import('./pages/AlbumPage'));
const ArtistsPage = lazy(() => import('./pages/ArtistsPage'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Profile = lazy(() => import('./pages/Profile'));

// Public shareable pages
const PublicMediaPage = lazy(() => import('./pages/PublicMediaPage'));
const EmbedPlayer = lazy(() => import('./pages/EmbedPlayer'));


// Admin pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminMedia = lazy(() => import('./pages/admin/AdminMedia'));
const AdminUpload = lazy(() => import('./pages/admin/AdminUpload'));
const AdminFileManager = lazy(() => import('./pages/admin/AdminFileManager'));
const AdminApiKeys = lazy(() => import('./pages/admin/AdminApiKeys'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminClickStream = lazy(() => import('./pages/admin/AdminClickStream'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminArtists = lazy(() => import('./pages/admin/AdminArtists'));
const AdminArtistDetail = lazy(() => import('./pages/admin/AdminArtistDetail'));

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </motion.div>
  </div>
);

// Not found page
const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
    <p className="mt-4 text-xl text-muted-foreground">Page not found</p>
    <a
      href="/"
      className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
    >
      Go Home
    </a>
  </div>
);

// Main app routes
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
          {/* Public shareable routes - no layout wrapper */}
          <Route path="/watch/:id" element={<PublicMediaPage />} />
          <Route path="/listen/:id" element={<PublicMediaPage />} />
          <Route path="/embed/:id" element={<EmbedPlayer />} />

          {/* Main app routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="artists" element={<ArtistsPage />} />
            <Route path="artist/:artistId" element={<ArtistPage />} />
            <Route path="album/:albumId" element={<AlbumPage />} />
            <Route path="playlist/:id" element={<PlaylistDetail />} />
            <Route path="liked" element={<Favorites />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="play/:id" element={<MediaPlayer />} />
          </Route>

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="upload" element={<AdminUpload />} />
            <Route path="file-manager" element={<AdminFileManager />} />
            <Route path="artists" element={<AdminArtists />} />
            <Route path="artists/:artistId" element={<AdminArtistDetail />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="click-stream" element={<AdminClickStream />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
  );
}

// Main App component
function App() {
  const { initAuth } = useAuthStore();
  const { modals, closeModal } = useUIStore();
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Listen for video player trigger
  useEffect(() => {
    const handleShowVideo = () => setShowVideoPlayer(true);
    window.addEventListener('show-video-player', handleShowVideo);
    return () => window.removeEventListener('show-video-player', handleShowVideo);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SubscriptionProvider>
          <div className="min-h-screen bg-background text-foreground">
            <AppRoutes />

            {/* Login Modal */}
            <LoginModal
              open={modals.login}
              onOpenChange={(open) => !open && closeModal('login')}
            />

            {/* Video Player */}
            <AnimatePresence>
              {showVideoPlayer && (
                <VideoPlayer onClose={() => setShowVideoPlayer(false)} />
              )}
            </AnimatePresence>

            {/* PWA Install Prompt */}
            <InstallPrompt />
          </div>
        </SubscriptionProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
