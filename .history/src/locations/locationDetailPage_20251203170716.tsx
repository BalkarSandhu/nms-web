import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Network, Wifi, WifiOff, Gauge, TrendingUp } from 'lucide-react';

// Mock data for demonstration
const mockLocation = {
  id: 1,
  name: 'Benedith coal dump- 2',
  status: 'offline',
  location_type_id: 1,
  worker_id: 1,
  lat: 23.762993,
  lng: 86.203841,
  created_at: '2024-11-03T10:00:00',
  updated_at: '2024-11-15T16:25:15'
};

const mockLocationType = {
  id: 1,
  name: 'Weighbridge'
};

const mockWorker = {
  id: 1,
  hostname: 'Block2'
};

const mockDevices = [
  {
    id: 1,
    hostname: '172.16.36.45',
    ip: '172.16.36.45',
    status: 'online',
    device_type: { name: 'Access Point' },
    updated_at: '2024-11-15T17:01:00'
  },
  {
    id: 2,
    hostname: '172.16.36.46',
    ip: '172.16.36.46',
    status: 'online',
    device_type: { name: 'Switch' },
    updated_at: '2024-11-15T17:01:00'
  }
];

const mockLogs = [
  { id: 1, timestamp: '2024-11-15 16:25:15', level: 'error', message: 'Location status: Offline', device: null },
  { id: 2, timestamp: '2024-11-12 17:03:41', level: 'success', message: 'Device online', device: '172.16.36.45' },
  { id: 3, timestamp: '2024-11-12 17:03:41', level: 'success', message: 'Device online', device: '172.16.36.46' }
];

export default function LocationDetailPage() {
  const [logs, setLogs] = useState(mockLogs);
  const [devices, setDevices] = useState(mockDevices);

  const location = mockLocation;
  const locationType = mockLocationType;
  const worker = mockWorker;
  const devicesOnline = devices.filter(d => d.status === 'online').length;
  const devicesOffline = devices.filter(d => d.status === 'offline').length;

  const getStatusDisplay = (status) => status === 'online' ? 'Online' : 'Offline';
  const isLocationOnline = location.status === 'online';

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getLogLevelColor = (level) => {
    const colors = {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      error: 'bg-red-50 border-red-200 text-red-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      info: 'bg-blue-50 border-blue-200 text-blue-700'
    };
    return colors[level] || colors.info;
  };

  const getLogLevelBadge = (level) => {
    const badges = {
      success: 'bg-emerald-100 text-emerald-700',
      error: 'bg-red-100 text-red-700',
      warning: 'bg-amber-100 text-amber-700',
      info: 'bg-blue-100 text-blue-700'
    };
    return badges[level] || badges.info;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      
      {/* Header */}
      <div className="mb-8">
        <button className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6 group">
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition" />
          <span>Back to Locations</span>
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isLocationOnline ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <Network className={`h-8 w-8 ${isLocationOnline ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{location.name}</h1>
              <p className="text-slate-400 text-sm mt-1">Network Location</p>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${
            isLocationOnline 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {isLocationOnline ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {getStatusDisplay(location.status)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* System Information Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
            <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <Server className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">System Information</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-sm">System Name</span>
                  <span className="text-white font-medium text-right max-w-xs">{location.name}</span>
                </div>
                <div className="w-full h-px bg-slate-700/50"></div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-sm">Type</span>
                  <span className="text-white font-medium">{locationType?.name}</span>
                </div>
                <div className="w-full h-px bg-slate-700/50"></div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-sm">Area</span>
                  <span className="text-white font-medium">{worker?.hostname}</span>
                </div>
                <div className="w-full h-px bg-slate-700/50"></div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-sm">Coordinates</span>
                  <div className="flex items-center gap-2 text-white font-mono text-sm">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    <span>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-700/50"></div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-sm">Created</span>
                  <span className="text-white font-medium">{formatTimeAgo(location.created_at)}</span>
                </div>
                <div className="w-full h-px bg-slate-700/50"></div>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-sm">Last Updated</span>
                <span className="text-white font-medium">{formatTimeAgo(location.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Devices Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
            <div className="bg-gradient-to-r from-purple-600/20 to-purple-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <Wifi className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Connected Devices</h2>
              <span className="ml-auto text-purple-300 font-semibold">{devices.length}</span>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="text-emerald-400 text-2xl font-bold">{devicesOnline}</div>
                  <div className="text-emerald-300 text-xs mt-1 flex items-center gap-1">
                    <Signal className="h-3 w-3" /> Online
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="text-red-400 text-2xl font-bold">{devicesOffline}</div>
                  <div className="text-red-300 text-xs mt-1 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {devices.map(device => (
                  <div key={device.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 hover:bg-slate-700/50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{device.hostname}</div>
                        <div className="text-slate-400 text-xs font-mono mt-1">{device.ip}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                        device.status === 'online' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {device.status === 'online' ? <Signal className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {getStatusDisplay(device.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
            <div className="bg-gradient-to-r from-amber-600/20 to-amber-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Event Logs</h2>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className={`border rounded-lg p-3 ${getLogLevelColor(log.level)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono opacity-75">{log.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getLogLevelBadge(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                  {log.device && <div className="text-xs font-medium mb-1 opacity-75">Device: {log.device}</div>}
                  <p className="text-sm">{log.message}</p>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-400">No events</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Map Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition h-96">
            <div className="bg-gradient-to-r from-cyan-600/20 to-cyan-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Location Map</h2>
            </div>
            
            <div className="h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_25%,rgba(68,68,68,.2)_50%,transparent_50%,transparent_75%,rgba(68,68,68,.2)_75%,rgba(68,68,68,.2))] bg-[length:40px_40px]"></div>
              </div>
              <div className="text-center z-10">
                <MapPin className="h-12 w-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400">Map View - Integration Ready</p>
                <p className="text-slate-500 text-sm mt-1">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
              </div>
            </div>
          </div>

          {/* Network Metrics Grid */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Device Performance */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
              <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Availability</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400">{Math.round((devicesOnline / devices.length) * 100)}%</div>
                    <p className="text-slate-400 text-sm mt-2">Last 24 Hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Health */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
              <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                <Gauge className="h-5 w-5 text-orange-400" />
                <h2 className="text-lg font-semibold text-white">Network Health</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-400">98.5%</div>
                    <p className="text-slate-400 text-sm mt-2">Signal Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition">
            <div className="bg-gradient-to-r from-indigo-600/20 to-indigo-500/20 px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <Activity className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Performance Metrics</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider">Uptime</div>
                  <div className="text-2xl font-bold text-white mt-2">99.2%</div>
                </div>
                <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider">Latency</div>
                  <div className="text-2xl font-bold text-white mt-2">12ms</div>
                </div>
                <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider">Bandwidth</div>
                  <div className="text-2xl font-bold text-white mt-2">94%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}