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
  Monitor,
  Smartphone,
  Chrome,
  ArrowUpRight,
  Users,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatNumber, cn } from '../../lib/utils';
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

const COLORS = ['#1DB954', '#1ed760', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
const DONUT_COLORS = ['#1DB954', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Stat card with trend indicator
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, isLoading }) => (
  <Card>
    <CardContent className="p-4">
      {isLoading ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// Progress bar for lists
const ProgressBar = ({ value, max, color = 'bg-primary' }) => (
  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
    <div 
      className={cn("h-full rounded-full transition-all", color)}
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
);

// List item with progress
const ListItem = ({ label, value, max, color }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="text-sm min-w-[120px] truncate">{label}</span>
    <ProgressBar value={value} max={max} color={color} />
    <span className="text-sm font-medium text-muted-foreground min-w-[50px] text-right">
      {formatNumber(value)}
    </span>
  </div>
);

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30');
  const days = parseInt(timeRange);

  // Fetch all analytics data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'geographic', days],
    queryFn: () => adminApi.getGeographicStats(days),
  });

  const { data: deviceData, isLoading: deviceLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'devices', days],
    queryFn: () => adminApi.getDeviceStats(days),
  });

  const { data: referrerData, isLoading: referrerLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'referrers', days],
    queryFn: () => adminApi.getReferrerStats(days),
  });

  const { data: hourlyData, isLoading: hourlyLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'hourly'],
    queryFn: () => adminApi.getHourlyStats(),
  });

  const { data: apiKeysData } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: () => adminApi.getApiKeys(),
  });

  const dashboard = dashboardData?.data || {};
  const overview = dashboard.overview || {};
  const charts = dashboard.charts || {};
  const geo = geoData?.data || {};
  const devices = deviceData?.data || {};
  const referrers = referrerData?.data || [];
  const hourly = hourlyData?.data || [];
  const apiKeys = apiKeysData?.data || [];

  const totalRequests = overview.totalRequests || apiKeys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
  const maxCountry = Math.max(...(geo.topCountries?.map(c => c.requests) || [1]));
  const maxCity = Math.max(...(geo.topCities?.map(c => c.requests) || [1]));
  const maxBrowser = Math.max(...(devices.topBrowsers?.map(b => b.requests) || [1]));
  const maxOS = Math.max(...(devices.topOS?.map(o => o.requests) || [1]));
  const maxReferrer = Math.max(...(referrers.map(r => r.requests) || [1]));

  const isLoading = dashboardLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Domain Statistics
          </h2>
          <p className="text-muted-foreground">
            Metrics evolution over time
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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Requests"
          value={formatNumber(totalRequests)}
          subtitle={`vs last ${days} days`}
          icon={Activity}
          color="bg-blue-500/10 text-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Keys"
          value={overview.activeApiKeys || apiKeys.length}
          icon={Zap}
          color="bg-green-500/10 text-green-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Success Rate"
          value={`${overview.successRate || 100}%`}
          icon={CheckCircle}
          color="bg-emerald-500/10 text-emerald-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Media"
          value={overview.totalMedia || 0}
          icon={Monitor}
          color="bg-purple-500/10 text-purple-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Users"
          value={overview.totalUsers || 0}
          icon={Users}
          color="bg-orange-500/10 text-orange-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Today's Requests"
          value={formatNumber(hourly.reduce((acc, h) => acc + h.requests, 0))}
          icon={TrendingUp}
          color="bg-cyan-500/10 text-cyan-500"
          isLoading={hourlyLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Endpoints</CardTitle>
              <Select defaultValue="endpoints">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="endpoints">Top endpoints</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-64" />
            ) : charts.topEndpoints?.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={charts.topEndpoints.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="requests"
                      nameKey="endpoint"
                    >
                      {charts.topEndpoints.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      <tspan x="50%" dy="-0.5em" className="fill-foreground text-xl font-bold">
                        {formatNumber(charts.topEndpoints.reduce((acc, e) => acc + e.requests, 0))}
                      </tspan>
                      <tspan x="50%" dy="1.5em" className="fill-muted-foreground text-xs">
                        Requests
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {charts.topEndpoints.slice(0, 5).map((ep, i) => (
                    <div key={ep.endpoint} className="flex items-center gap-2 text-sm">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="truncate flex-1">{ep.endpoint}</span>
                      <span className="font-medium">{formatNumber(ep.requests)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyLoading ? (
              <Skeleton className="h-64" />
            ) : hourly.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#888" 
                    fontSize={10}
                    interval={3}
                  />
                  <YAxis stroke="#888" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#1DB954"
                    fill="#1DB954"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data for today yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geographic & Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Countries */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Top Countries
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {geoLoading ? (
              <Skeleton className="h-48" />
            ) : geo.topCountries?.length > 0 ? (
              <div className="space-y-1">
                {geo.topCountries.slice(0, 6).map((country, i) => (
                  <ListItem 
                    key={country.country} 
                    label={country.country} 
                    value={country.requests} 
                    max={maxCountry}
                    color={`bg-primary/80`}
                  />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No geographic data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Cities</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {geoLoading ? (
              <Skeleton className="h-48" />
            ) : geo.topCities?.length > 0 ? (
              <div className="space-y-1">
                {geo.topCities.slice(0, 6).map((city) => (
                  <ListItem 
                    key={city.city} 
                    label={city.city} 
                    value={city.requests} 
                    max={maxCity}
                    color="bg-blue-500"
                  />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No geographic data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Referrers</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {referrerLoading ? (
              <Skeleton className="h-48" />
            ) : referrers.length > 0 ? (
              <div className="space-y-1">
                {referrers.slice(0, 6).map((ref) => (
                  <ListItem 
                    key={ref.referrer} 
                    label={ref.referrer} 
                    value={ref.requests} 
                    max={maxReferrer}
                    color="bg-amber-500"
                  />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No referrer data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Browsers */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Chrome className="h-4 w-4" />
                Top Browsers
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {deviceLoading ? (
              <Skeleton className="h-48" />
            ) : devices.topBrowsers?.length > 0 ? (
              <div className="space-y-1">
                {devices.topBrowsers.slice(0, 6).map((browser) => (
                  <ListItem 
                    key={browser.browser} 
                    label={browser.browser} 
                    value={browser.requests} 
                    max={maxBrowser}
                    color="bg-purple-500"
                  />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No browser data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top OS */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Top Operating Systems
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {deviceLoading ? (
              <Skeleton className="h-48" />
            ) : devices.topOS?.length > 0 ? (
              <div className="space-y-1">
                {devices.topOS.slice(0, 6).map((os) => (
                  <ListItem 
                    key={os.os} 
                    label={os.os} 
                    value={os.requests} 
                    max={maxOS}
                    color="bg-cyan-500"
                  />
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No OS data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Types */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Device Types
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {deviceLoading ? (
              <Skeleton className="h-48" />
            ) : devices.deviceTypes?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={devices.deviceTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="requests"
                    nameKey="deviceType"
                    label={({ deviceType, percent }) => `${deviceType} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {devices.deviceTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
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
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No device data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
