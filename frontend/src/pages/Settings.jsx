import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings as SettingsIcon, Palette, Bell, Shield, Download, Info, Trash2, RefreshCw, Database } from 'lucide-react';
import { publicApi, userApi } from '../services/api';
import { useAuthStore, useUIStore } from '../store';
import useSubscriptionStore from '../store/subscriptionStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { SUBSCRIPTION_TIERS } from '../config/subscription';

export default function Settings() {
  const { user, isAuthenticated } = useAuthStore();
  const { theme, setTheme, addToast } = useUIStore();
  const { tier, setTierFromAuth } = useSubscriptionStore();
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [isRefreshingSubscription, setIsRefreshingSubscription] = useState(false);

  // Fetch app settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => publicApi.getSettings(),
    enabled: true,
  });

  const settings = settingsData?.data || {};

  // Refresh subscription from server
  const handleRefreshSubscription = async () => {
    if (!isAuthenticated) return;
    
    setIsRefreshingSubscription(true);
    try {
      const response = await userApi.getMySubscription();
      console.log('[Settings] Raw API response:', response);
      console.log('[Settings] response.data:', response?.data);
      console.log('[Settings] response.subscriptionTier:', response?.subscriptionTier);
      
      // Try multiple possible response formats
      const newTier = response?.data?.subscriptionTier || 
                      response?.subscriptionTier || 
                      response?.data?.tier ||
                      response?.tier ||
                      response?.data?.subscription?.tier ||
                      SUBSCRIPTION_TIERS.FREE;
      
      console.log('[Settings] Parsed tier:', newTier);
      
      setTierFromAuth(true, newTier);
      addToast({
        message: `Subscription refreshed: ${newTier.replace('_', ' ').toUpperCase()}`,
        type: 'success',
      });
    } catch (error) {
      console.error('[Settings] Failed to refresh subscription:', error);
      console.error('[Settings] Error response:', error.response?.data);
      addToast({
        message: `Failed to refresh subscription: ${error.message}`,
        type: 'error',
      });
    } finally {
      setIsRefreshingSubscription(false);
    }
  };

  // Clear all local data
  const handleClearAllData = () => {
    // Clear all localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    addToast({
      message: 'All local data cleared. Refreshing page...',
      type: 'success',
    });
    
    setShowClearDataDialog(false);
    
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Calculate approximate storage used
  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage.getItem(key)?.length || 0;
      }
    }
    // Convert to KB/MB
    if (total < 1024) {
      return `${total} bytes`;
    } else if (total < 1024 * 1024) {
      return `${(total / 1024).toFixed(2)} KB`;
    } else {
      return `${(total / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  return (
    <div className="min-h-full px-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Customize your experience
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how MediaCore looks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use dark theme for the interface
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Playback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Playback
            </CardTitle>
            <CardDescription>
              Configure playback settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autoplay</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically play similar content when queue ends
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Crossfade</Label>
                <p className="text-sm text-muted-foreground">
                  Smooth transition between tracks
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Downloads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Offline Mode
            </CardTitle>
            <CardDescription>
              Manage offline playback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Offline Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Cache played media for offline access
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Cached data: ~0 MB
              </p>
              <Button variant="outline" size="sm">
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        {isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Display Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.displayName || 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data & Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data & Storage
            </CardTitle>
            <CardDescription>
              Manage your local data and sync settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Refresh Subscription */}
            {isAuthenticated && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Refresh Subscription</Label>
                  <p className="text-sm text-muted-foreground">
                    Sync your subscription status from the server
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Current: <span className="font-medium capitalize">{tier?.replace('_', ' ') || 'Free'}</span>
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshSubscription}
                  disabled={isRefreshingSubscription}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingSubscription ? 'animate-spin' : ''}`} />
                  {isRefreshingSubscription ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            )}
            
            {/* Storage Info */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Local Storage Used</Label>
                <p className="text-sm text-muted-foreground">
                  {getStorageSize()}
                </p>
              </div>
            </div>

            {/* Clear All Data */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-destructive">Clear All Data</Label>
                <p className="text-sm text-muted-foreground">
                  Delete all cached data, preferences, and login session
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowClearDataDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>App Name: {settings.appName || 'MediaCore'}</p>
                <p>Version: {settings.version || '1.0.0'}</p>
                <p className="pt-4">
                  MediaCore - Premium Audio & Video Streaming Platform
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Clear All Local Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Your theme and playback preferences</li>
                <li>Cached subscription data</li>
                <li>Playback history and queue</li>
                <li>Downloaded content references</li>
                <li>Login session (you'll need to sign in again)</li>
              </ul>
              <p className="font-medium pt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
