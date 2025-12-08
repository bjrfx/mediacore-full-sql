import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Clock,
  Mail,
  MoreVertical,
  UserCheck,
  UserX,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Crown,
  User,
  Star,
  Building2,
  Sparkles,
  CreditCard,
  Circle,
  Wifi,
  Globe,
  MapPin,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useUIStore } from '../../store';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatDate, cn } from '../../lib/utils';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  SUBSCRIPTION_TIERS,
  TIER_DISPLAY_NAMES,
  TIER_COLORS,
} from '../../config/subscription';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToChangeRole, setUserToChangeRole] = useState(null);
  const [userToChangeSubscription, setUserToChangeSubscription] = useState(null);
  const [selectedSubscriptionTier, setSelectedSubscriptionTier] = useState(null);

  // Fetch users
  const {
    data: usersData,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
    retry: 1,
  });

  // Fetch online users (fails silently if endpoint not available)
  const {
    data: onlineUsersData,
    isLoading: isLoadingOnline,
    refetch: refetchOnline,
  } = useQuery({
    queryKey: ['admin', 'users', 'online'],
    queryFn: async () => {
      try {
        return await adminApi.getOnlineUsers();
      } catch (error) {
        // Silently fail if endpoint not available (404)
        console.debug('[Online Users] Endpoint not available:', error.message);
        return { data: { count: 0, users: [] } };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on failure
  });

  const users = usersData?.data?.users || usersData?.data || [];
  const onlineUsers = onlineUsersData?.data?.users || onlineUsersData?.users || [];
  const onlineCount = onlineUsersData?.data?.count || onlineUsersData?.count || onlineUsers.length;
  const onlineUserIds = new Set(onlineUsers.map(u => u.uid));

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ uid, role }) => adminApi.updateUserRole(uid, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['admin', 'users']);
      setShowRoleDialog(false);
      setUserToChangeRole(null);
      addToast({
        message: `User role updated to ${variables.role}`,
        type: 'success',
      });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to update user role',
        type: 'error',
      });
    },
  });

  // Update user status mutation (enable/disable)
  const updateStatusMutation = useMutation({
    mutationFn: ({ uid, disabled }) => adminApi.updateUserStatus(uid, disabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['admin', 'users']);
      addToast({
        message: `User ${variables.disabled ? 'disabled' : 'enabled'} successfully`,
        type: 'success',
      });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to update user status',
        type: 'error',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (uid) => adminApi.deleteUser(uid),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users']);
      setShowDeleteDialog(false);
      setUserToDelete(null);
      addToast({
        message: 'User deleted successfully',
        type: 'success',
      });
    },
    onError: (error) => {
      addToast({
        message: error.response?.data?.message || 'Failed to delete user',
        type: 'error',
      });
    },
  });

  // Update user subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ uid, subscriptionTier }) => {
      console.log('[Admin] Updating subscription:', { uid, subscriptionTier });
      return adminApi.updateUserSubscription(uid, subscriptionTier);
    },
    onSuccess: (response, variables) => {
      console.log('[Admin] Subscription updated successfully:', response);
      queryClient.invalidateQueries(['admin', 'users']);
      setShowSubscriptionDialog(false);
      setUserToChangeSubscription(null);
      setSelectedSubscriptionTier(null);
      addToast({
        message: `Subscription updated to ${TIER_DISPLAY_NAMES[variables.subscriptionTier]}`,
        type: 'success',
      });
    },
    onError: (error) => {
      console.error('[Admin] Subscription update failed:', error);
      addToast({
        message: error.response?.data?.message || error.message || 'Failed to update subscription. Make sure the backend API endpoint exists.',
        type: 'error',
      });
    },
  });

  // Filter users based on search
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.uid?.toLowerCase().includes(query)
    );
  });

  // Count admins
  const adminCount = users.filter((u) => u.role === 'admin' || u.customClaims?.admin).length;

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleChangeRole = (user) => {
    setUserToChangeRole(user);
    setShowRoleDialog(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleChangeSubscription = (user) => {
    setUserToChangeSubscription(user);
    setSelectedSubscriptionTier(user.subscriptionTier || SUBSCRIPTION_TIERS.FREE);
    setShowSubscriptionDialog(true);
  };

  const confirmRoleChange = (newRole) => {
    if (userToChangeRole) {
      updateRoleMutation.mutate({ uid: userToChangeRole.uid, role: newRole });
    }
  };

  const confirmSubscriptionChange = () => {
    console.log('[Admin] confirmSubscriptionChange called:', {
      user: userToChangeSubscription,
      tier: selectedSubscriptionTier,
    });
    if (userToChangeSubscription && selectedSubscriptionTier) {
      updateSubscriptionMutation.mutate({
        uid: userToChangeSubscription.uid,
        subscriptionTier: selectedSubscriptionTier,
      });
    } else {
      console.warn('[Admin] Missing user or tier:', {
        hasUser: !!userToChangeSubscription,
        hasTier: !!selectedSubscriptionTier,
      });
    }
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.uid);
    }
  };

  const toggleUserStatus = (user) => {
    updateStatusMutation.mutate({ uid: user.uid, disabled: !user.disabled });
  };

  const isUserAdmin = (user) => {
    return user.role === 'admin' || user.customClaims?.admin;
  };

  const getUserSubscriptionTier = (user) => {
    return user.subscriptionTier || user.customClaims?.subscriptionTier || SUBSCRIPTION_TIERS.FREE;
  };

  const getSubscriptionIcon = (tier) => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.ENTERPRISE:
        return <Building2 className="h-4 w-4" />;
      case SUBSCRIPTION_TIERS.PREMIUM_PLUS:
        return <Crown className="h-4 w-4" />;
      case SUBSCRIPTION_TIERS.PREMIUM:
        return <Star className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getSubscriptionBadge = (tier) => {
    const colorClass = TIER_COLORS[tier] || TIER_COLORS[SUBSCRIPTION_TIERS.FREE];
    return (
      <Badge className={cn('gap-1', colorClass)}>
        {getSubscriptionIcon(tier)}
        {TIER_DISPLAY_NAMES[tier] || 'Free'}
      </Badge>
    );
  };

  const getInitials = (name, email) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
  };

  // Get user session info from online users data
  const getUserSessionInfo = (uid) => {
    const onlineUser = onlineUsers.find(u => u.uid === uid);
    return onlineUser || null;
  };

  // Parse user agent to get device/browser info
  const parseUserAgent = (userAgent) => {
    if (!userAgent) return { device: 'Unknown', browser: 'Unknown' };
    
    let device = 'Desktop';
    let browser = 'Unknown';
    
    // Detect device
    if (/iPhone/i.test(userAgent)) device = 'iPhone';
    else if (/iPad/i.test(userAgent)) device = 'iPad';
    else if (/Android/i.test(userAgent)) {
      device = /Mobile/i.test(userAgent) ? 'Android Phone' : 'Android Tablet';
    }
    else if (/Macintosh/i.test(userAgent)) device = 'Mac';
    else if (/Windows/i.test(userAgent)) device = 'Windows PC';
    else if (/Linux/i.test(userAgent)) device = 'Linux';
    
    // Detect browser
    if (/Edg/i.test(userAgent)) browser = 'Edge';
    else if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Opera|OPR/i.test(userAgent)) browser = 'Opera';
    
    return { device, browser };
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">
            View and manage Firebase authenticated users
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load users</h3>
            <p className="text-muted-foreground mb-4">
              {error.response?.data?.message || error.message || 'An error occurred'}
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">
            View and manage Firebase authenticated users
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          {
            title: 'Online Now',
            value: onlineCount,
            icon: Wifi,
            color: 'text-green-500',
            pulse: true,
          },
          {
            title: 'Total Users',
            value: users.length,
            icon: Users,
            color: 'text-blue-500',
          },
          {
            title: 'Admins',
            value: adminCount,
            icon: Crown,
            color: 'text-yellow-500',
          },
          {
            title: 'Verified',
            value: users.filter((u) => u.emailVerified).length,
            icon: UserCheck,
            color: 'text-green-500',
          },
          {
            title: 'Unverified',
            value: users.filter((u) => !u.emailVerified).length,
            icon: UserX,
            color: 'text-orange-500',
          },
          {
            title: 'Disabled',
            value: users.filter((u) => u.disabled).length,
            icon: Shield,
            color: 'text-red-500',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <Skeleton className="h-16" />
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className={cn('h-4 w-4', stat.color, stat.pulse && 'animate-pulse')} />
                      <span className="text-sm text-muted-foreground">
                        {stat.title}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Online Users Panel */}
      {onlineUsers.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="relative">
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full" />
                </div>
                <span>Online Users</span>
                <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-500">
                  {onlineCount}
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchOnline()}
                disabled={isLoadingOnline}
              >
                <RefreshCw className={cn('h-4 w-4', isLoadingOnline && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {onlineUsers.map((user) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-background rounded-full pl-1 pr-3 py-1 border shadow-sm"
                >
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.photoURL} alt={user.displayName} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </span>
                    {user.lastSeen && (
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Active {getTimeAgo(user.lastSeen)}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'No users found matching your search'
                    : 'No users registered yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>
                          {getInitials(user.displayName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      {onlineUserIds.has(user.uid) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {user.displayName || 'Unknown'}
                        </p>
                        {isUserAdmin(user) && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                      {getSubscriptionBadge(getUserSubscriptionTier(user))}
                      {isUserAdmin(user) ? (
                        <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                      {user.emailVerified ? (
                        <Badge variant="success" className="text-xs">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Unverified
                        </Badge>
                      )}
                      {user.disabled && (
                        <Badge variant="destructive" className="text-xs">
                          Disabled
                        </Badge>
                      )}
                    </div>

                    <div className="hidden lg:flex flex-col items-end text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(user.metadata?.lastSignInTime)}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <User className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Subscription</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleChangeSubscription(user)}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Change Subscription
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Star className="h-4 w-4 mr-2" />
                            Quick Set Tier
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() =>
                                updateSubscriptionMutation.mutate({
                                  uid: user.uid,
                                  subscriptionTier: SUBSCRIPTION_TIERS.FREE,
                                })
                              }
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Free
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateSubscriptionMutation.mutate({
                                  uid: user.uid,
                                  subscriptionTier: SUBSCRIPTION_TIERS.PREMIUM,
                                })
                              }
                            >
                              <Star className="h-4 w-4 mr-2 text-purple-500" />
                              Premium
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateSubscriptionMutation.mutate({
                                  uid: user.uid,
                                  subscriptionTier: SUBSCRIPTION_TIERS.PREMIUM_PLUS,
                                })
                              }
                            >
                              <Crown className="h-4 w-4 mr-2 text-amber-500" />
                              Premium Plus
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateSubscriptionMutation.mutate({
                                  uid: user.uid,
                                  subscriptionTier: SUBSCRIPTION_TIERS.ENTERPRISE,
                                })
                              }
                            >
                              <Building2 className="h-4 w-4 mr-2 text-emerald-500" />
                              Enterprise
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Role & Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                          {isUserAdmin(user) ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Make Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                          {user.disabled ? (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Enable User
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Disable User
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(user.uid)}
                        >
                          Copy UID
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(user.email)}
                        >
                          Copy Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* User details dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about this user
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User avatar and name */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={selectedUser.photoURL}
                    alt={selectedUser.displayName}
                  />
                  <AvatarFallback className="text-xl">
                    {getInitials(
                      selectedUser.displayName,
                      selectedUser.email
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      {selectedUser.displayName || 'Unknown'}
                    </p>
                    {isUserAdmin(selectedUser) && (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {isUserAdmin(selectedUser) ? (
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                    {selectedUser.emailVerified ? (
                      <Badge variant="success" className="text-xs">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Unverified
                      </Badge>
                    )}
                    {selectedUser.disabled && (
                      <Badge variant="destructive" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* User info grid */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Email
                  </label>
                  <p className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {selectedUser.email}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    UID
                  </label>
                  <p className="mt-1 font-mono text-sm break-all">
                    {selectedUser.uid}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Role
                  </label>
                  <p className="mt-1">
                    {isUserAdmin(selectedUser) ? 'Administrator' : 'Regular User'}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Subscription
                  </label>
                  <div className="mt-1">
                    {getSubscriptionBadge(getUserSubscriptionTier(selectedUser))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Created
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedUser.metadata?.creationTime || 
                        selectedUser.createdAt || 
                        selectedUser.creationTime
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Last Sign In
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedUser.metadata?.lastSignInTime || 
                        selectedUser.lastSignInTime || 
                        selectedUser.lastLoginAt
                      )}
                    </p>
                  </div>
                </div>

                {selectedUser.providerData && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Sign-in Providers
                    </label>
                    <div className="flex gap-2 mt-2">
                      {selectedUser.providerData.map((provider) => (
                        <Badge
                          key={provider.providerId}
                          variant="secondary"
                        >
                          {provider.providerId.replace('.com', '')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Info - Online status, IP, Location, Device */}
                {(() => {
                  const sessionInfo = getUserSessionInfo(selectedUser.uid);
                  const isOnline = onlineUserIds.has(selectedUser.uid);
                  const deviceInfo = sessionInfo?.userAgent ? parseUserAgent(sessionInfo.userAgent) : null;
                  
                  return (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Status
                        </label>
                        {isOnline ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30 gap-1">
                            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <span className="h-2 w-2 bg-gray-400 rounded-full" />
                            Offline
                          </Badge>
                        )}
                      </div>
                      
                      {sessionInfo ? (
                        <>
                          <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wide">
                              IP Address
                            </label>
                            <p className="flex items-center gap-2 mt-1 font-mono text-sm">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              {sessionInfo.ipAddress || 'Unknown'}
                            </p>
                          </div>
                          
                          {sessionInfo.location && (
                            <div>
                              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                Location
                              </label>
                              <p className="flex items-center gap-2 mt-1 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {sessionInfo.location}
                              </p>
                            </div>
                          )}
                          
                          {deviceInfo && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                  Device
                                </label>
                                <p className="flex items-center gap-2 mt-1 text-sm">
                                  {deviceInfo.device.includes('Phone') || deviceInfo.device.includes('iPhone') ? (
                                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Monitor className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  {deviceInfo.device}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                  Browser
                                </label>
                                <p className="flex items-center gap-2 mt-1 text-sm">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  {deviceInfo.browser}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-wide">
                              Last Active
                            </label>
                            <p className="flex items-center gap-2 mt-1 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {getTimeAgo(sessionInfo.lastSeen)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No recent session data available
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleChangeSubscription(selectedUser)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleChangeRole(selectedUser)}
                >
                  {isUserAdmin(selectedUser) ? 'Remove Admin' : 'Make Admin'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    toggleUserStatus(selectedUser);
                    setShowUserDialog(false);
                  }}
                >
                  {selectedUser.disabled ? 'Enable' : 'Disable'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change role confirmation dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToChangeRole && isUserAdmin(userToChangeRole)
                ? 'Remove Admin Privileges'
                : 'Grant Admin Privileges'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToChangeRole && isUserAdmin(userToChangeRole)
                ? `Are you sure you want to remove admin privileges from ${userToChangeRole?.displayName || userToChangeRole?.email}? They will no longer be able to access the admin dashboard.`
                : `Are you sure you want to make ${userToChangeRole?.displayName || userToChangeRole?.email} an admin? They will have full access to the admin dashboard and all management features.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmRoleChange(
                  userToChangeRole && isUserAdmin(userToChangeRole) ? 'user' : 'admin'
                )
              }
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete user confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {userToDelete?.displayName || userToDelete?.email}
              </span>
              ? This action cannot be undone and will permanently remove the user
              from Firebase Authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change subscription dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Change Subscription
            </DialogTitle>
            <DialogDescription>
              Update the subscription tier for{' '}
              <span className="font-semibold">
                {userToChangeSubscription?.displayName || userToChangeSubscription?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Current Subscription
              </label>
              {userToChangeSubscription && getSubscriptionBadge(getUserSubscriptionTier(userToChangeSubscription))}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                New Subscription Tier
              </label>
              <Select
                value={selectedSubscriptionTier}
                onValueChange={setSelectedSubscriptionTier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SUBSCRIPTION_TIERS.FREE}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Free
                    </div>
                  </SelectItem>
                  <SelectItem value={SUBSCRIPTION_TIERS.PREMIUM}>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-500" />
                      Premium (₹49/month)
                    </div>
                  </SelectItem>
                  <SelectItem value={SUBSCRIPTION_TIERS.PREMIUM_PLUS}>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      Premium Plus (₹99/month)
                    </div>
                  </SelectItem>
                  <SelectItem value={SUBSCRIPTION_TIERS.ENTERPRISE}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                      Enterprise
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tier description */}
            {selectedSubscriptionTier && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                {selectedSubscriptionTier === SUBSCRIPTION_TIERS.FREE && (
                  <p>10 minutes per session, English only, resets every 2 hours</p>
                )}
                {selectedSubscriptionTier === SUBSCRIPTION_TIERS.PREMIUM && (
                  <p>5 hours daily, all languages, offline downloads</p>
                )}
                {selectedSubscriptionTier === SUBSCRIPTION_TIERS.PREMIUM_PLUS && (
                  <p>Unlimited playback, all languages, priority support</p>
                )}
                {selectedSubscriptionTier === SUBSCRIPTION_TIERS.ENTERPRISE && (
                  <p>Unlimited access, API access, custom billing</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowSubscriptionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={confirmSubscriptionChange}
              disabled={!selectedSubscriptionTier || updateSubscriptionMutation.isPending}
            >
              {updateSubscriptionMutation.isPending ? 'Updating...' : 'Update Subscription'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
