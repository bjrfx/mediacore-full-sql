import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatNumber } from '../../lib/utils';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#1DB954', '#1ed760', '#535353', '#b3b3b3', '#191414'];

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30');

  // Fetch analytics summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'summary', timeRange],
    queryFn: () => adminApi.getAnalyticsSummary(parseInt(timeRange)),
  });

  // Fetch realtime stats
  const { data: realtimeData, isLoading: realtimeLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'realtime'],
    queryFn: () => adminApi.getRealTimeStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch dashboard for comprehensive data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
  });

  // Fetch API keys for usage fallback
  const { data: apiKeysData } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: () => adminApi.getApiKeys(),
  });

  const summary = summaryData?.data || {};
  const realtime = realtimeData?.data || {};
  const dashboard = dashboardData?.data || {};
  const charts = dashboard.charts || {};
  const apiKeys = apiKeysData?.data || [];

  // Fallback: Calculate total requests from API key usage if analytics is empty
  const totalRequestsFromKeys = apiKeys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
  const hasFallbackData = totalRequestsFromKeys > 0 && !summary.totalRequests;

  const isLoading = summaryLoading || realtimeLoading || dashboardLoading;

  // Method distribution data for pie chart
  const methodData = charts.methodDistribution
    ? Object.entries(charts.methodDistribution).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">
            Monitor API usage and performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notice when using fallback data */}
      {hasFallbackData && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-yellow-500">
              ⚠️ Detailed analytics not available. Showing aggregate data from API key usage.
              Enable request logging on the backend for full analytics.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Real-time stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Real-time (Last 24 hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realtimeLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {hasFallbackData ? '—' : formatNumber(realtime.requestsLast24h || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Requests</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {hasFallbackData ? '—' : `${realtime.avgResponseTime?.toFixed(0) || 0}ms`}
                </p>
                <p className="text-sm text-muted-foreground">Avg Response</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">
                  {hasFallbackData ? '~100%' : `${realtime.successRate?.toFixed(1) || 0}%`}
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {hasFallbackData ? '—' : (realtime.uniqueVisitors || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Unique IPs</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Requests',
            value: formatNumber(summary.totalRequests || totalRequestsFromKeys || 0),
            icon: Activity,
            color: 'text-blue-500',
          },
          {
            title: 'Successful',
            value: formatNumber(summary.successfulRequests || (hasFallbackData ? totalRequestsFromKeys : 0)),
            icon: CheckCircle,
            color: 'text-green-500',
          },
          {
            title: 'Failed',
            value: formatNumber(summary.failedRequests || 0),
            icon: XCircle,
            color: 'text-red-500',
          },
          {
            title: 'Avg Response',
            value: `${summary.avgResponseTime?.toFixed(0) || 0}ms`,
            icon: Clock,
            color: 'text-orange-500',
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
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests over time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Requests Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : charts.dailyRequests?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={charts.dailyRequests}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en', {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                  />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#1DB954"
                    fill="#1DB954"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Top Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : charts.topEndpoints?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.topEndpoints.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="endpoint"
                    stroke="#888"
                    fontSize={10}
                    tickFormatter={(value) =>
                      value.length > 12 ? value.slice(0, 12) + '...' : value
                    }
                  />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#1DB954" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Method distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Request Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {methodData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status codes breakdown */}
      {summary.statusCodeBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Status Code Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(summary.statusCodeBreakdown).map(
                ([code, count]) => (
                  <div key={code} className="flex items-center gap-2">
                    <Badge
                      variant={
                        code.startsWith('2')
                          ? 'success'
                          : code.startsWith('4')
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {code}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatNumber(count)}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
