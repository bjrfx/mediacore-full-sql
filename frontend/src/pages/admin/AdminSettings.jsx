import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  Moon,
  Sun,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
  { name: 'Spotify Green', value: '#1DB954' },
  { name: 'YouTube Red', value: '#FF0000' },
  { name: 'Apple Blue', value: '#007AFF' },
  { name: 'SoundCloud Orange', value: '#FF5500' },
  { name: 'Tidal Cyan', value: '#00FFFF' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gold', value: '#F59E0B' },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [savedMessage, setSavedMessage] = useState('');
  const [formData, setFormData] = useState({
    appName: '',
    primaryColor: '#1DB954',
    darkMode: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminApi.getSettings(),
    onSuccess: (response) => {
      const settings = response.data?.settings || {};
      setFormData({
        appName: settings.appName || 'MediaCore',
        primaryColor: settings.primaryColor || '#1DB954',
        darkMode: settings.darkMode !== false,
      });
    },
  });

  const settings = settingsData?.data?.settings || {};

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: (data) => adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'settings']);
      setSavedMessage('Settings saved successfully!');
      setHasChanges(false);
      setTimeout(() => setSavedMessage(''), 3000);
    },
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      appName: settings.appName || 'MediaCore',
      primaryColor: settings.primaryColor || '#1DB954',
      darkMode: settings.darkMode !== false,
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Configure your MediaCore application
        </p>
      </div>

      {/* Success message */}
      {savedMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500"
        >
          <Check className="h-5 w-5" />
          {savedMessage}
        </motion.div>
      )}

      {/* Error message */}
      {updateMutation.isError && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <AlertCircle className="h-5 w-5" />
          Failed to save settings. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* App Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-muted-foreground" />
              Application Name
            </CardTitle>
            <CardDescription>
              The name displayed throughout your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                value={formData.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                placeholder="MediaCore"
                className="max-w-sm"
              />
            )}
          </CardContent>
        </Card>

        {/* Theme Color */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              Primary Color
            </CardTitle>
            <CardDescription>
              Choose your brand's primary color for accents and highlights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                {/* Color presets */}
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleChange('primaryColor', color.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                        formData.primaryColor === color.value
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-muted'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-background"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom color input */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Label htmlFor="customColor">Custom:</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="customColor"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        handleChange('primaryColor', e.target.value)
                      }
                      className="w-10 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) =>
                        handleChange('primaryColor', e.target.value)
                      }
                      className="w-28 font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Preview</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      style={{ backgroundColor: formData.primaryColor }}
                      className="text-white hover:opacity-90"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Primary Button
                    </Button>
                    <span
                      className="font-semibold"
                      style={{ color: formData.primaryColor }}
                    >
                      Accent Text
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dark Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-muted-foreground" />
              Appearance
            </CardTitle>
            <CardDescription>
              Configure the default appearance settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {formData.darkMode ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Enable dark mode as the default theme
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.darkMode}
                  onCheckedChange={(checked) => handleChange('darkMode', checked)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            disabled={!hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          {hasChanges && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
