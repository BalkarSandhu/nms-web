{
  `id`: `location-detail-layout`,
  `type`: `application/vnd.ant.react`,
  `title`: `Location Detail Page - Refined Layout`,
  `command`: `create`,
  `content`: `import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from \"@/components/ui/card\";
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Network, Wifi, WifiOff, Power, Zap } from 'lucide-react';

// Mock data for demonstration
const mockLocation = {
  id: 1,
  name: \"Central Office\",
  status: true,
  latitude: 40.7128,
  longitude: -74.0060,
  location_type_id: 1,
  worker_id: 1,
  created_at: \"2024-01-15T10:30:00Z\",
  updated_at: \"2024-12-15T08:45:00Z\"
};

const mockDevices = [
  { id: 1, hostname: \"router-01\", ip: \"192.168.1.1\", is_reachable: true, has_power: true, device_type: { name: \"Router\" } },
  { id: 2, hostname: \"switch-02\", ip: \"192.168.1.2\", is_reachable: true, has_power: true, device_type: { name: \"Switch\" } },
  { id: 3, hostname: \"ap-03\", ip: \"192.168.1.3\", is_reachable: false, has_power: false, device_type: { name: \"Access Point\" } },
  { id: 4, hostname: \"server-04\", ip: \"192.168.1.4\", is_reachable: true, has_power: true, device_type: { name: \"Server\" } },
];

const mockLogs = [
  { id: 1, timestamp: \"2024-12-15 08:45:23\", level: \"success\", message: \"Device online\", device: \"router-01\" },
  { id: 2, timestamp: \"2024-12-15 08:30:15\", level: \"error\", message: \"Connection timeout\", device: \"ap-03\" },
  { id: 3, timestamp: \"2024-12-15 08:15:42\", level: \"success\", message: \"Device online\", device: \"switch-02\" },
];

export default function LocationDetailPage() {
  const location = mockLocation;
  const locationDevices = mockDevices;
  const logs = mockLogs;

  const devicesOnline = locationDevices.filter(d => d.is_reachable === true).length;
  const devicesOffline = locationDevices.filter(d => d.is_reachable === false).length;
  const devicesWithPower = locationDevices.filter(d => d.has_power === true).length;
  const devicesWithoutPower = locationDevices.filter(d => d.has_power === false).length;

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'error': return 'bg-red-50 border-red-200 text-red-700';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getLogLevelBadge = (level) => {
    switch (level) {
      case 'success': return 'bg-emerald-100 text-emerald-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const isLocationOnline = location.status === true;

  return (
    <div className=\"min-h-screen bg-gray-50 p-4\">
      
      {/* Header */}
      <div className=\"mb-6 flex items-center gap-4\">
        <button className=\"text-gray-500 hover:text-gray-700 transition\">
          <ArrowLeft className=\"h-5 w-5\" />
        </button>
        
        <div className=\"flex items-center gap-3 flex-1\">
          <div className={`p-2 rounded-lg ${isLocationOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <Network className={`h-6 w-6 ${isLocationOnline ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h1 className=\"text-2xl font-bold text-gray-900\">{location.name}</h1>
            <p className=\"text-sm text-gray-500\">Location Details</p>
          </div>
          
          <div className={`ml-auto px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${
            isLocationOnline 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
              : 'bg-red-100 text-red-700 border border-red-300'
          }`}>
            {isLocationOnline ? <CheckCircle2 className=\"h-4 w-4\" /> : <AlertCircle className=\"h-4 w-4\" />}
            {isLocationOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className=\"grid grid-cols-1 xl:grid-cols-3 gap-4\">
        
        {/* LEFT COLUMN */}
        <div className=\"space-y-4\">
          
          {/* System Information Card */}
          <Card className=\"border border-gray-200 shadow-sm\">
            <CardHeader className=\"pb-3\">
              <CardTitle className=\"flex items-center gap-2 text-base font-semibold text-gray-900\">
                <Server className=\"h-5 w-5 text-blue-600\" />
                System Information
              </CardTitle>
            </CardHeader>
            
            <CardContent className=\"pt-0\">
              <div className=\"space-y-3\">
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100\">
                  <span className=\"text-sm text-gray-600\">System Name</span>
                  <span className=\"text-sm font-medium text-gray-900\">{location.name}</span>
                </div>
                
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100\">
                  <span className=\"text-sm text-gray-600\">Type</span>
                  <span className=\"text-sm font-medium text-gray-900\">Main Office</span>
                </div>
                
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100\">
                  <span className=\"text-sm text-gray-600\">Area</span>
                  <span className=\"text-sm font-medium text-gray-900\">North District</span>
                </div>
                
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100\">
                  <span className=\"text-sm text-gray-600\">Coordinates</span>
                  <span className=\"text-sm font-medium text-gray-900 flex items-center gap-1\">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    <MapPin className=\"h-3.5 w-3.5 text-gray-400\" />
                  </span>
                </div>
                
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100\">
                  <span className=\"text-sm text-gray-600\">Created</span>
                  <span className=\"text-sm font-medium text-gray-900\">{formatTimeAgo(location.created_at)}</span>
                </div>
                
                <div className=\"flex justify-between items-center py-2\">
                  <span className=\"text-sm text-gray-600\">Last Updated</span>
                  <span className=\"text-sm font-medium text-gray-900\">{formatTimeAgo(location.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Devices Card */}
          <Card className=\"border border-gray-200 shadow-sm\">
            <CardHeader className=\"pb-3\">
              <CardTitle className=\"flex items-center gap-2 text-base font-semibold text-gray-900\">
                <Wifi className=\"h-5 w-5 text-purple-600\" />
                Connected Devices
                <span className=\"ml-auto text-purple-600 font-semibold text-lg\">{locationDevices.length}</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className=\"pt-0\">
              <div className=\"grid grid-cols-2 gap-3 mb-4\">
                <div className=\"bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center\">
                  <div className=\"text-emerald-600 text-2xl font-bold\">{devicesOnline}</div>
                  <div className=\"text-emerald-700 text-xs mt-1 flex items-center justify-center gap-1\">
                    <Signal className=\"h-3 w-3\" /> Online
                  </div>
                </div>
                <div className=\"bg-red-50 border border-red-200 rounded-lg p-3 text-center\">
                  <div className=\"text-red-600 text-2xl font-bold\">{devicesOffline}</div>
                  <div className=\"text-red-700 text-xs mt-1 flex items-center justify-center gap-1\">
                    <WifiOff className=\"h-3 w-3\" /> Offline
                  </div>
                </div>
              </div>

              <div className=\"space-y-2 max-h-64 overflow-y-auto\">
                {locationDevices.map(device => (
                  <div key={device.id} className=\"bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition\">
                    <div className=\"flex items-center justify-between gap-2\">
                      <div className=\"flex-1 min-w-0\">
                        <div className=\"text-sm font-medium text-gray-900 truncate\">{device.hostname}</div>
                        <div className=\"text-xs text-gray-500 font-mono mt-0.5\">{device.ip}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                        device.is_reachable 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {device.is_reachable ? <Signal className=\"h-3 w-3\" /> : <WifiOff className=\"h-3 w-3\" />}
                        {device.is_reachable ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Power Status Card */}
          <Card className=\"border border-gray-200 shadow-sm\">
            <CardHeader className=\"pb-3\">
              <CardTitle className=\"flex items-center gap-2 text-base font-semibold text-gray-900\">
                <Zap className=\"h-5 w-5 text-amber-600\" />
                Device Power Status
              </CardTitle>
            </CardHeader>

            <CardContent className=\"pt-0\">
              <div className=\"grid grid-cols-2 gap-3 mb-4\">
                <div className=\"bg-green-50 border border-green-200 rounded-lg p-3 text-center\">
                  <div className=\"text-green-600 text-2xl font-bold\">{devicesWithPower}</div>
                  <div className=\"text-green-700 text-xs mt-1 flex items-center justify-center gap-1\">
                    <Zap className=\"h-3 w-3\" /> Powered
                  </div>
                </div>
                <div className=\"bg-red-50 border border-red-200 rounded-lg p-3 text-center\">
                  <div className=\"text-red-600 text-2xl font-bold\">{devicesWithoutPower}</div>
                  <div className=\"text-red-700 text-xs mt-1 flex items-center justify-center gap-1\">
                    <Power className=\"h-3 w-3\" /> No Power
                  </div>
                </div>
              </div>

              <div className=\"space-y-2 max-h-48 overflow-y-auto\">
                {locationDevices.map(device => (
                  <div 
                    key={device.id} 
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      device.has_power 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className=\"flex items-center gap-2 flex-1 min-w-0\">
                      {device.has_power ? (
                        <Zap className=\"h-4 w-4 text-green-600 flex-shrink-0\" />
                      ) : (
                        <Power className=\"h-4 w-4 text-red-500 flex-shrink-0\" />
                      )}
                      <span className={`text-sm font-medium truncate ${
                        device.has_power ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {device.hostname}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                      device.has_power 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {device.has_power ? 'ON' : 'OFF'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Logs Card */}
          <Card className=\"border border-gray-200 shadow-sm\">
            <CardHeader className=\"pb-3\">
              <CardTitle className=\"flex items-center gap-2 text-base font-semibold text-gray-900\">
                <FileText className=\"h-5 w-5 text-amber-600\" />
                Event Logs
              </CardTitle>
            </CardHeader>
            
            <CardContent className=\"pt-0 max-h-96 overflow-y-auto\">
              <div className=\"space-y-2\">
                {logs.map(log => (
                  <div key={log.id} className={`border rounded-lg p-3 ${getLogLevelColor(log.level)}`}>
                    <div className=\"flex items-start justify-between gap-2 mb-1\">
                      <span className=\"text-xs font-mono opacity-75\">{log.timestamp}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getLogLevelBadge(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    {log.device && <div className=\"text-xs font-medium mb-1 opacity-75\">Device: {log.device}</div>}
                    <div className=\"text-sm\">{log.message}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
        </div>

        {/* RIGHT COLUMN */}
        <div className=\"xl:col-span-2 space-y-4\">
          
          {/* Map Card */}
          <Card className=\"border border-gray-200 shadow-sm\">
            <CardHeader className=\"pb-3\">
              <CardTitle className=\"flex items-center gap-2 text-base font-semibold text-gray-900\">
                <MapPin className=\"h-5 w-5 text-cyan-600\" />
                Location Map
              </CardTitle>
            </CardHeader>
            
            <CardContent className=\"pt-0\">
              <div className=\"h-96 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200\">
                <div className=\"text-center\">
                  <MapPin className=\"h-12 w-12 mx-auto text-gray-400 mb-3\" />
                  <p className=\"text-gray-500 font-medium\">Map View</p>
                  <p className=\"text-gray-400 text-sm mt-1\">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Graphs Section */}
          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-4\">
            
            {/* Location Availability Graph */}
            <Card className=\"border border-gray-200 shadow-sm\">
              <CardHeader className=\"pb-3\">
                <CardTitle className=\"text-base font-semibold text-gray-900\">Location Availability</CardTitle>
              </CardHeader>

              <CardContent className=\"pt-0\">
                <div className=\"h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200\">
                  <div className=\"text-center\">
                    <Activity className=\"h-10 w-10 mx-auto text-gray-400 mb-2\" />
                    <p className=\"text-gray-500 text-sm font-medium\">Availability Graph</p>
                    <p className=\"text-gray-400 text-xs mt-1\">Ready for integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Devices Availability Graph */}
            <Card className=\"border border-gray-200 shadow-sm\">
              <CardHeader className=\"pb-3\">
                <CardTitle className=\"text-base font-semibold text-gray-900\">Devices Availability</CardTitle>
              </CardHeader>
              
              <CardContent className=\"pt-0\">
                <div className=\"h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200\">
                  <div className=\"text-center\">
                    <Activity className=\"h-10 w-10 mx-auto text-gray-400 mb-2\" />
                    <p className=\"text-gray-500 text-sm font-medium\">Device Graph</p>
                    <p className=\"text-gray-400 text-xs mt-1\">Ready for integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}`
}