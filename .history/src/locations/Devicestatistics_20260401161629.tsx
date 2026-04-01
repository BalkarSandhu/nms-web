import { useEffect, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, Signal, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authenticatedFetch } from '@/lib/auth';

type Device = {
  id: number;
  hostname: string;
  is_reachable: any;
  has_power?: boolean;
  last_ping?: string;
  created_at?: string;
  updated_at?: string;
  uptime?: number;
  downtime?: number;
  avg_response_time?: number;
};

type UptimeData = {
  avg_jitter_ms: number;
  avg_latency_ms: number;
  avg_packet_loss_percent: number;
  device_id: number;
  longest_downtime_seconds: number;
  max_latency_ms: number;
  offline_checks: number;
  online_checks: number;
  period_end: string;
  period_start: string;
  power_cut_count: number;
  power_restored_count: number;
  total_checks: number;
  uptime_pct: number;
};

type DeviceStatisticsProps = {
  devices?: Device[];
  deviceId?: number;
};

const normalizeStatus = (status: any): boolean => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false;
  }
  return status;
};

export default function DeviceStatistics({ devices = [], deviceId }: DeviceStatisticsProps) {
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const [uptimeLoading, setUptimeLoading] = useState(!!deviceId);
  const [uptimeError, setUptimeError] = useState<string | null>(null);
  const [uptimeRange, setUptimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Fetch uptime data if deviceId is provided
  useEffect(() => {
    if (!deviceId) return;

    setUptimeLoading(true);
    setUptimeError(null);

    const baseUrl = `${import.meta.env.VITE_NMS_HOST}/devices/${deviceId}/uptime`;
    const params = new URLSearchParams();
    params.append('range', uptimeRange);

    authenticatedFetch(`${baseUrl}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Uptime API error ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json && typeof json === 'object' && 'uptime_pct' in json) {
          setUptimeData(json);
        } else {
          setUptimeError('Uptime response format is invalid');
        }
      })
      .catch((err) => {
        setUptimeError(err.message || 'Failed to fetch uptime');
      })
      .finally(() => setUptimeLoading(false));
  }, [deviceId, uptimeRange]);

  // Single device mode (with API fetching)
  if (deviceId && !devices.length) {
    return (
      <div className={`border rounded-lg p-3 transition-all hover:shadow-xl border-slate-700 bg-slate-900 text-slate-100`}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Device Statistics</h3>
          
          {/* Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={uptimeRange === '24h' ? 'default' : 'outline'}
              onClick={() => setUptimeRange('24h')}
              className="text-xs"
            >24 hours</Button>
            <Button
              size="sm"
              variant={uptimeRange === '7d' ? 'default' : 'outline'}
              onClick={() => setUptimeRange('7d')}
              className="text-xs"
            >1 week</Button>
            <Button
              size="sm"
              variant={uptimeRange === '30d' ? 'default' : 'outline'}
              onClick={() => setUptimeRange('30d')}
              className="text-xs"
            >1 month</Button>
          </div>
        </div>

        {uptimeLoading ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-gray-500 text-sm">Loading statistics...</p>
          </div>
        ) : uptimeError ? (
          <div className="flex items-center gap-2 py-4 px-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            {uptimeError}
          </div>
        ) : uptimeData ? (
          <div className="space-y-3">
            {/* Uptime & Downtime Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-gray-600 font-medium">Uptime</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {uptimeData.uptime_pct.toFixed(1)}%
                </div>
              </div>

              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-600 font-medium">Downtime</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {(100 - uptimeData.uptime_pct).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    uptimeData.uptime_pct >= 95 ? 'bg-green-500' :
                    uptimeData.uptime_pct >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, uptimeData.uptime_pct))}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>

            {/* Checks Stats */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white rounded p-2 border border-gray-200">
                <span className="text-xs text-gray-600">Online Checks</span>
                <p className="font-semibold text-blue-600">{uptimeData.online_checks}</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <span className="text-xs text-gray-600">Offline Checks</span>
                <p className="font-semibold text-red-600">{uptimeData.offline_checks}</p>
              </div>
            </div>

            {/* Latency & Jitter */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white rounded p-2 border border-gray-200">
                <span className="text-xs text-gray-600">Avg Latency</span>
                <p className="font-semibold text-amber-600">{uptimeData.avg_latency_ms.toFixed(2)}ms</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <span className="text-xs text-gray-600">Max Latency</span>
                <p className="font-semibold text-purple-600">{uptimeData.max_latency_ms.toFixed(2)}ms</p>
              </div>
            </div>

            {/* Jitter & Packet Loss */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white rounded p-2 border border-gray-200">
                <span className="text-xs text-gray-600">Avg Jitter</span>
                <p className="font-semibold text-orange-600">{uptimeData.avg_jitter_ms.toFixed(2)}ms</p>
              </div>
              <div className="bg-white rounded p-2 border border-gray-200">
                <span className="text-xs text-gray-600">Packet Loss</span>
                <p className="font-semibold text-pink-600">{uptimeData.avg_packet_loss_percent.toFixed(2)}%</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
              <div className="flex justify-between">
                <span>Total Checks:</span>
                <span className="font-semibold text-gray-900">{uptimeData.total_checks}</span>
              </div>
              <div className="flex justify-between">
                <span>Power Cuts:</span>
                <span className="font-semibold text-gray-900">{uptimeData.power_cut_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Longest Downtime:</span>
                <span className="font-semibold text-gray-900">
                  {Math.floor(uptimeData.longest_downtime_seconds / 3600)}h {Math.floor((uptimeData.longest_downtime_seconds % 3600) / 60)}m
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <Activity className="h-8 w-8 mx-auto opacity-50 mb-2" />
            <p className="text-sm">No statistics available</p>
          </div>
        )}
      </div>
    );
  }

  // Multiple devices mode (original implementation)
  const getUptimeColor = (uptime: number): string => {
    if (uptime >= 95) return 'text-green-600';
    if (uptime >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUptimeBackgroundColor = (uptime: number): string => {
    if (uptime >= 95) return 'bg-green-50 border-green-200';
    if (uptime >= 80) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const calculateDaysSinceCreation = (createdAt?: string): number => {
    if (!createdAt) return 0;
    const createdDate = new Date(createdAt);
    return Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Activity className="h-12 w-12 mx-auto opacity-50 mb-2" />
        <p className="text-sm">No device statistics available</p>
        <p className="text-xs mt-1">Connect devices to view statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {devices.map(device => {
        const isCurrentlyOnline = normalizeStatus(device.is_reachable);
        const uptime = device.uptime ?? 0;
        const downtime = device.downtime ?? 0;
        const avgResponseTime = device.avg_response_time;
        const daysSinceCreation = calculateDaysSinceCreation(device.created_at);
        
        return (
          <div 
            key={device.id} 
            className={`border rounded-lg p-3 transition-all hover:shadow-sm ${getUptimeBackgroundColor(uptime)}`}
          >
            {/* Device Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isCurrentlyOnline ? (
                  <Signal className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {device.hostname}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Monitored for {daysSinceCreation} day{daysSinceCreation !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                isCurrentlyOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isCurrentlyOnline ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Uptime */}
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className={`h-3 w-3 ${getUptimeColor(uptime)}`} />
                  <span className="text-xs text-gray-600 font-medium">Uptime</span>
                </div>
                <div className={`text-lg font-bold ${getUptimeColor(uptime)}`}>
                  {uptime.toFixed(2)}%
                </div>
              </div>

              {/* Downtime */}
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-600 font-medium">Downtime</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {downtime.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Response Time */}
            {avgResponseTime !== undefined && (
              <div className="mt-2 bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-gray-600 font-medium">Avg Response Time</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {avgResponseTime.toFixed(0)}ms
                  </span>
                </div>
              </div>
            )}

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    uptime >= 95 ? 'bg-green-500' :
                    uptime >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, uptime))}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}