import React, { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutDashboard,
  Users,
  Download,
  User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUIStore, useAuthStore, useLibraryStore } from '../../store';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';

const mainNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Your Library', path: '/library' },
  { icon: Users, label: 'Artists', path: '/artists' },
];

const libraryItems = [
  { icon: PlusSquare, label: 'Create Playlist', path: '/playlist/create' },
  { icon: Heart, label: 'Favorites', path: '/liked' },
  { icon: Download, label: 'Downloads', path: '/downloads', requiresAuth: true },
  { icon: Clock, label: 'History', path: '/history' },
];

function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarMobileOpen, closeMobileSidebar } = useUIStore();
  const { isAdminUser, user } = useAuthStore();
  const { playlists } = useLibraryStore();
  const location = useLocation();

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  };

  // Filter library items based on auth
  const filteredLibraryItems = libraryItems.filter(
    (item) => !item.requiresAuth || (item.requiresAuth && user)
  );

  const NavItem = ({ item, collapsed }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.path}
              onClick={closeMobileSidebar}
              className={cn(
                'sidebar-item',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-6 w-6 shrink-0', isActive && 'text-primary')} />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              <p>{item.label}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const SidebarContent = ({ collapsed, isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-6', collapsed && 'justify-center px-2')}>
        <img 
          src="/logo192.svg" 
          alt="MediaCore" 
          className="w-10 h-10 rounded-lg"
        />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold tracking-tight"
            style={{ 
              fontFamily: "'Inter', sans-serif",
              background: 'linear-gradient(135deg, #1DB954 0%, #1ed760 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em'
            }}
          >
            MediaCore
          </motion.span>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={closeMobileSidebar}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="px-2 space-y-1">
        {mainNavItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Divider */}
      <div className="my-4 mx-4 h-px bg-border" />

      {/* Library Section */}
      <nav className="px-2 space-y-1">
        {filteredLibraryItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Admin Link */}
      {isAdminUser && (
        <>
          <div className="my-4 mx-4 h-px bg-border" />
          <nav className="px-2">
            <NavItem
              item={{ icon: LayoutDashboard, label: 'Admin Dashboard', path: '/admin' }}
              collapsed={collapsed}
            />
          </nav>
        </>
      )}

      {/* Playlists */}
      {!collapsed && playlists.length > 0 && (
        <>
          <div className="my-4 mx-4 h-px bg-border" />
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Playlists
            </h3>
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1">
              {playlists.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  onClick={closeMobileSidebar}
                  className={cn(
                    'sidebar-item text-sm',
                    location.pathname === `/playlist/${playlist.id}` && 'active'
                  )}
                >
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
                  <span className="truncate">{playlist.name}</span>
                </NavLink>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Settings at bottom */}
      <div className="mt-auto px-2 py-4 space-y-1">
        <NavItem
          item={{ icon: User, label: 'Profile', path: '/profile' }}
          collapsed={collapsed}
        />
        <NavItem
          item={{ icon: Settings, label: 'Settings', path: '/settings' }}
          collapsed={collapsed}
        />
      </div>

      {/* Collapse button (desktop only) */}
      {!isMobile && (
        <div className="px-2 pb-4">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={() => setSidebarCollapsed(!collapsed)}
            className={cn('w-full', collapsed && 'justify-center')}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        initial={false}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col bg-black h-full border-r border-border"
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileSidebar}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-black z-50 lg:hidden"
            >
              <SidebarContent collapsed={false} isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Memoize to prevent re-renders from player state changes
export default memo(Sidebar);
