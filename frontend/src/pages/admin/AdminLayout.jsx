import React from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Upload,
  Key,
  BarChart3,
  Settings,
  Film,
  ArrowLeft,
  Users,
  Music,
} from 'lucide-react';
import { useAuthStore } from '../../store';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: Film, label: 'Media', path: '/admin/media' },
  { icon: Music, label: 'Artists', path: '/admin/artists' },
  { icon: Upload, label: 'Upload', path: '/admin/upload' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Key, label: 'API Keys', path: '/admin/api-keys' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function AdminLayout() {
  const location = useLocation();
  const { isAdminUser, isAuthenticated, isLoading } = useAuthStore();

  // Check admin access
  if (!isLoading && (!isAuthenticated || !isAdminUser)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-full">
      {/* Admin header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <NavLink to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </NavLink>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                MediaCore Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-1 px-6 pb-2 overflow-x-auto no-scrollbar">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Admin content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-6"
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
