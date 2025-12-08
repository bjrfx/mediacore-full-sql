import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

const getStatusColor = (status) => {
  if (status >= 200 && status < 300) return 'bg-green-500';
  if (status >= 300 && status < 400) return 'bg-blue-500';
  if (status >= 400 && status < 500) return 'bg-yellow-500';
  if (status >= 500) return 'bg-red-500';
  return 'bg-gray-500';
};

const getMethodColor = (method) => {
  switch (method) {
    case 'GET': return 'bg-emerald-500/20 text-emerald-400';
    case 'POST': return 'bg-blue-500/20 text-blue-400';
    case 'PUT': return 'bg-amber-500/20 text-amber-400';
    case 'DELETE': return 'bg-red-500/20 text-red-400';
    case 'PATCH': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getDeviceIcon = (deviceType) => {
  switch (deviceType?.toLowerCase()) {
    case 'mobile': return Smartphone;
    case 'tablet': return Tablet;
    case 'bot': return Bot;
    default: return Monitor;
  }
};

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

export default function AdminClickStream() {
  const [page, setPage] = useState(0);
  const limit = 25;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'click-stream', page],
    queryFn: () => adminApi.getClickStream(limit, page * limit),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Click Stream
          </h2>
          <p className="text-muted-foreground">
            Real-time API request log • {total.toLocaleString()} total requests
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Click Stream Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Endpoint</th>
                    <th className="p-4 font-medium">Time</th>
                    <th className="p-4 font-medium">IP</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Browser</th>
                    <th className="p-4 font-medium">Location</th>
                    <th className="p-4 font-medium">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log, index) => {
                    const DeviceIcon = getDeviceIcon(log.deviceType);
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-primary">
                              {log.endpoint}
                            </code>
                          </div>
                          {log.referer && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {log.referer.substring(0, 40)}...
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatTimeAgo(log.timestamp)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.responseTime}ms
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {log.ipAddress}
                          </code>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", getStatusColor(log.statusCode))} />
                            <span className="text-sm font-medium">{log.statusCode}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">{log.browser || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{log.os}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm">{log.city || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{log.country}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={cn("font-mono text-xs", getMethodColor(log.method))}>
                            {log.method}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
