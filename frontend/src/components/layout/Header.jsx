import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronLeft, ChevronRight, Bell, User, LogOut, Settings, Shield, Download, ExternalLink, Smartphone, MonitorSmartphone } from 'lucide-react';
import { useUIStore, useAuthStore, useSubscriptionStore, usePWAStore } from '../../store';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import SubscriptionBadge from '../subscription/SubscriptionBadge';
import { SUBSCRIPTION_TIERS } from '../../config/subscription';

export default function Header() {
  const navigate = useNavigate();
  const { toggleMobileSidebar, openModal } = useUIStore();
  const { user, isAuthenticated, isAdminUser, logout } = useAuthStore();
  const { tier } = useSubscriptionStore();
  const { canInstall, isInstalled, installApp } = usePWAStore();

  // Check if running in standalone mode (already opened as PWA)
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
  }, []);

  const handleInstallOrOpen = async () => {
    if (isInstalled && !isStandalone) {
      // App is installed but opened in browser - reload to try open in app
      window.location.reload();
    } else if (canInstall) {
      // Trigger install prompt
      await installApp();
    } else if (isIOS) {
      // Show iOS instructions - trigger the InstallPrompt banner
      window.dispatchEvent(new CustomEvent('show-ios-install'));
    }
  };

  // Determine button state and tooltip
  const getPWAButtonInfo = () => {
    if (isStandalone) {
      return null; // Already in app, hide button
    }
    if (isInstalled) {
      return { icon: ExternalLink, tooltip: 'Open in App', showDot: false };
    }
    if (canInstall) {
      return { icon: Download, tooltip: 'Install App', showDot: true };
    }
    // Not installable (incognito, iOS, or not supported) - still show button
    return { icon: MonitorSmartphone, tooltip: isIOS ? 'Add to Home Screen' : 'Get the App', showDot: false };
  };

  const pwaButton = getPWAButtonInfo();

  const handleSignIn = () => {
    openModal('login');
  };

  const handleSignUp = () => {
    // Trigger sign-up mode
    window.dispatchEvent(new Event('show-signup-modal'));
    openModal('login');
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-gradient-to-b from-background/80 to-transparent backdrop-blur-md">
      {/* Left side */}
      <div className="flex items-center gap-2">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileSidebar}
          className="lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Navigation arrows */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-[#161E2E]"
            style={{ backgroundColor: 'rgba(17, 24, 39, 0.8)' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(1)}
            className="rounded-full hover:bg-[#161E2E]"
            style={{ backgroundColor: 'rgba(17, 24, 39, 0.8)' }}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isAuthenticated ? (
          <>
            {/* PWA Install/Open Button */}
            {pwaButton && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full relative"
                      onClick={handleInstallOrOpen}
                    >
                      <pwaButton.icon className="h-5 w-5" />
                      {/* Install indicator dot */}
                      {pwaButton.showDot && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{pwaButton.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center gap-2 rounded-full pr-4 hover:bg-[#161E2E]"
                  style={{ backgroundColor: 'rgba(17, 24, 39, 0.8)' }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                    <AvatarFallback>
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block font-medium text-sm">
                    {user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  {isAdminUser && (
                    <Shield className="h-4 w-4 text-primary ml-1" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-2">
                    <span>{user?.displayName || 'User'}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {user?.email}
                    </span>
                    {/* Subscription Badge */}
                    {tier && tier !== SUBSCRIPTION_TIERS.GUEST && (
                      <SubscriptionBadge tier={tier} size="sm" />
                    )}
                    {isAdminUser && (
                      <span className="text-xs text-primary font-medium">
                        Admin Account
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {isAdminUser && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSignUp}>
              Sign up
            </Button>
            <Button variant="spotify" onClick={handleSignIn}>
              Log in
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
