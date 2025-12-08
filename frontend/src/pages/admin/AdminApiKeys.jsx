import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  EyeOff,
  MoreHorizontal,
  CheckCircle,
  Shield,
  Clock,
  Activity,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useUIStore } from '../../store';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatDate, formatNumber } from '../../lib/utils';

export default function AdminApiKeys() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    accessType: 'read_only',
    expiresInDays: 365,
  });
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch API keys
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: async () => {
      console.log('[AdminApiKeys] Fetching API keys...');
      const result = await adminApi.getApiKeys();
      console.log('[AdminApiKeys] Result:', result);
      return result;
    },
    retry: 1,
  });

  // Generate key mutation
  const generateMutation = useMutation({
    mutationFn: ({ name, accessType, expiresInDays }) =>
      adminApi.generateApiKey(name, accessType, { expiresInDays }),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['admin', 'api-keys']);
      setNewKeyData(response.data);
      setShowCreateDialog(false);
      setShowNewKeyDialog(true);
      setNewKeyForm({ name: '', accessType: 'read_only', expiresInDays: 365 });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to generate API key',
        type: 'error',
      });
    },
  });

  // Delete key mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }) => adminApi.deleteApiKey(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'api-keys']);
      addToast({ message: 'API key deleted', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to delete API key',
        type: 'error',
      });
    },
  });

  const apiKeys = data?.data || [];

  const handleCopyKey = async (key) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      addToast({ message: 'Copied to clipboard', type: 'success' });
    } catch (error) {
      addToast({ message: 'Failed to copy', type: 'error' });
    }
  };

  const handleCreateKey = () => {
    if (!newKeyForm.name.trim()) {
      addToast({ message: 'Please enter a name for the API key', type: 'error' });
      return;
    }
    generateMutation.mutate(newKeyForm);
  };

  const handleDeleteKey = (key, hardDelete = false) => {
    if (
      window.confirm(
        `${hardDelete ? 'Permanently delete' : 'Deactivate'} API key "${key.name}"?`
      )
    ) {
      deleteMutation.mutate({ id: key.id, hardDelete });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground">
            Manage API keys for public access
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Key className="h-4 w-4" />
              <span className="text-sm">Total Keys</span>
            </div>
            <p className="text-2xl font-bold">{apiKeys.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Active</span>
            </div>
            <p className="text-2xl font-bold text-green-500">
              {apiKeys.filter((k) => k.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Total Usage</span>
            </div>
            <p className="text-2xl font-bold">
              {formatNumber(apiKeys.reduce((acc, k) => acc + (k.usageCount || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Full Access</span>
            </div>
            <p className="text-2xl font-bold">
              {apiKeys.filter((k) => k.accessType === 'full_access').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-2">Failed to load API keys.</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error.response?.data?.message || error.message || 'Unknown error'}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first API key to enable public access
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{key.name}</h3>
                        <Badge
                          variant={key.isActive ? 'success' : 'secondary'}
                        >
                          {key.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge
                          variant={
                            key.accessType === 'full_access'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {key.accessType === 'full_access'
                            ? 'Full Access'
                            : 'Read Only'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-1 rounded">
                          {key.keyPreview}
                        </span>
                        <span>
                          <Activity className="inline h-3 w-3 mr-1" />
                          {formatNumber(key.usageCount || 0)} requests
                        </span>
                        {key.lastUsedAt && (
                          <span>
                            <Clock className="inline h-3 w-3 mr-1" />
                            Last used {formatDate(key.lastUsedAt)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Permissions: {key.permissions?.join(', ') || 'None'}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleDeleteKey(key, false)
                          }
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteKey(key, true)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create key dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for public access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Mobile App Production"
                value={newKeyForm.name}
                onChange={(e) =>
                  setNewKeyForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Access Type</Label>
              <Select
                value={newKeyForm.accessType}
                onValueChange={(value) =>
                  setNewKeyForm((prev) => ({ ...prev, accessType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read_only">
                    Read Only (read:media, read:settings)
                  </SelectItem>
                  <SelectItem value="full_access">
                    Full Access (all permissions)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expires In</Label>
              <Select
                value={String(newKeyForm.expiresInDays)}
                onValueChange={(value) =>
                  setNewKeyForm((prev) => ({
                    ...prev,
                    expiresInDays: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New key created dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">
              {newKeyData?.key}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => handleCopyKey(newKeyData?.key)}
              className="w-full"
            >
              {copiedKey === newKeyData?.key ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
