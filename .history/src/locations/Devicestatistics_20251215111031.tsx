import React from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, Signal, WifiOff } from 'lucide-react';

type Device = {
  id: number;
  hostname: string;
  is_reachable: any;
  has_power?: boolean;
  last_ping?: string;
  created_at?: string;
  updated_at?: string;
};

type DeviceStatisticsProps = {
  devices: Device[];
};

const normalizeStatus = (status: any): boolean => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false;
  }
  return status;
};

export default function DeviceStatistics({ devices }: DeviceStatisticsProps) {
  // Calculate mock statistics - replace with actual API data when available
  const calculateDeviceStats = (device: Device) => {
    const isCurrentlyOnline = normalizeStatus(device.is_reachable);
    
    // Mock calculation - in production, fetch from your API endpoint
    // These values simulate realistic uptime/downtime percentages
    const baseUptime = isCurrentlyOnline ? 85 + Math.random() * 10 : 60 + Math.random() * 20;
    const uptime = Math.min(99.9, Math.max(0, baseUptime));
    const downtime = 100 - uptime;
    
    // Calculate monitoring period
    const createdDate = device.created_at ? new Date(device.created_at) : new Date();
    const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      uptime: uptime.toFixed(2),
      downtime: downtime.toFixed(2),
      daysSinceCreation: daysSinceCreation || 1,
      avgResponseTime: isCurrentlyOnline ? (50 + Math.random() * 100).toFixed(0) : 'N/A',
    };
  };

  const getUptimeColor = (uptime: string): string => {
    const uptimeNum = parseFloat(uptime);
    if (uptimeNum >= 95) return 'text-green-600';
    if (uptimeNum >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUptimeBackgroundColor = (uptime: string): string => {
    const uptimeNum = parseFloat(uptime);
    if (uptimeNum >= 95) return 'bg-green-50 border-green-200';
    if (uptimeNum >= 80) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
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
        const stats = calculateDeviceStats(device);
        const isCurrentlyOnline = normalizeStatus(device.is_reachable);
        
        return (
          <div 
            key={device.id} 
            className={`border rounded-lg p-3 transition-all hover:shadow-sm ${getUptimeBackgroundColor(stats.uptime)}`}
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
                    Monitored for {stats.daysSinceCreation} day{stats.daysSinceCreation !== 1 ? 's' : ''}
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
                  <TrendingUp className={`h-3 w-3 ${getUptimeColor(stats.uptime)}`} />
                  <span className="text-xs text-gray-600 font-medium">Uptime</span>
                </div>
                <div className={`text-lg font-bold ${getUptimeColor(stats.uptime)}`}>
                  {stats.uptime}%
                </div>
              </div>

              {/* Downtime */}
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-gray-600 font-medium">Downtime</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {stats.downtime}%
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="mt-2 bg-white rounded-lg p-2 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-gray-600 font-medium">Avg Response Time</span>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {stats.avgResponseTime}{stats.avgResponseTime !== 'N/A' ? 'ms' : ''}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    parseFloat(stats.uptime) >= 95 ? 'bg-green-500' :
                    parseFloat(stats.uptime) >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.uptime}%` }}
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

      {/* Note about data */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> Statistics shown are calculated values. Connect to your API endpoint to display real uptime/downtime data based on historical monitoring records.
        </p>
      </div>
    </div>
  );
}