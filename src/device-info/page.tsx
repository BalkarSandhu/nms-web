import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchAllDevices } from '@/store/deviceSlice';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Power, Monitor } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint } from '../dashboard/local-components/Map-Viewer';
import NetworkHealthCard from './NetworkHeathCard';
import DeviceStatistics from '../locations/Devicestatistics';

type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
};

const normalizeStatus = (status: any): boolean => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false;
  }
  return status;
};

const getStatusDisplay = (status: any): string => {
  const normalized = normalizeStatus(status);
  return normalized ? 'true' : 'false';
};

export default function DeviceDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const deviceId = Number(searchParams.get('id'));

  const { devices } = useAppSelector(state => state.devices);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mapDataPoints, setMapDataPoints] = useState<MapDataPoint[]>([]);

  const device = devices.find(d => d.id === deviceId);

  useEffect(() => {
    if (!devices.length) {
      dispatch(fetchAllDevices());
    }
  }, [dispatch, devices.length]);

  useEffect(() => {
    if (device && device.location?.latitude && device.location?.longitude) {
      const isOnline = normalizeStatus(device.is_reachable);
      const dataPoints: MapDataPoint[] = [{
        id: device.id,
        name: device.hostname,
        coordinates: [device.location.longitude, device.location.latitude] as [number, number],
        value: isOnline ? 1 : 0,
        category: isOnline ? 'green' : 'red',
        popupData: {
          indicatorColour: isOnline ? 'green' : 'red',
          headerLeft: { field: 'Device', value: device.hostname },
          headerRight: { field: 'Status', value: getStatusDisplay(device.is_reachable) },
          sideLabel: { field: 'Location', value: device.location?.name || 'Unknown' },
          data: [
            { field: 'IP Address', value: device.ip, colour: 'white' },
            { field: 'Type', value: device.device_type?.name || 'N/A', colour: 'white' },
            { field: 'Last Updated', value: device.updated_at || 'N/A', colour: 'white' },
          ]
        },
        additionalData: {
          'device_id': device.id,
          'ip': device.ip,
          'type': device.device_type?.name || 'Unknown',
        }
      }];

      setMapDataPoints(dataPoints);
    }
  }, [device]);

  useEffect(() => {
    if (device) {
      const generatedLogs: LogEntry[] = [];
      let logId = 1;

      const deviceStatusNormalized = normalizeStatus(device.is_reachable);
      generatedLogs.push({
        id: logId++,
        timestamp: new Date(device.last_check || device.updated_at).toLocaleString(),
        level: deviceStatusNormalized ? 'success' : 'error',
        message: device.status_reason || (deviceStatusNormalized ? 'Device online' : 'Device offline'),
      });

      if (device.disabled) {
        generatedLogs.push({
          id: logId++,
          timestamp: new Date(device.updated_at).toLocaleString(),
          level: 'warning',
          message: 'Device is disabled',
        });
      }

      generatedLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setLogs(generatedLogs);
    }
  }, [device]);

  if (!device) {
    return (
      <div className="p-2 text-center">
        <p className="text-m text-gray-500">Device not found</p>
        <Button onClick={() => navigate('/devices')} className="mt-4">
          Back to Devices
        </Button>
      </div>
    );
  }

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getLogLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const isDeviceOnline = normalizeStatus(device.is_reachable);
  const hasPower = device.has_power === true;
  const isConnected = isDeviceOnline && !device.disabled;


  return (
    <div className="min-h-screen bg-white p-3">
      
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <button 
          onClick={() => navigate('/devices')}
          className="text-gray-500 hover:text-gray-700 transition mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-start flex-col sm:flex-row sm:items-center gap-3">
            <div className={`p-1 rounded-lg ${isDeviceOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Monitor className={`h-6 w-6 ${isDeviceOnline ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900">{device.display || device.hostname}</h1>

              {/* Top status buttons (displayed under the title on small screens, inline on larger screens) */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  className={`px-3 py-1 text-sm font-semibold rounded flex items-center gap-2 ${
                    hasPower ? 'bg-green-600 text-white border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <Power className={`h-4 w-4 ${hasPower ? 'text-white' : 'text-red-600'}`} />
                  {hasPower ? 'Power: ON' : 'No Power'}
                </Button>

                <Button
                  className={`px-3 py-1 text-sm font-semibold rounded flex items-center gap-2 ${
                    isDeviceOnline ? 'bg-green-600 text-white border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <Signal className={`h-4 w-4 ${isDeviceOnline ? 'text-white' : 'text-red-600'}`} />
                  {isDeviceOnline ? 'Internet: Online' : 'Internet: Offline'}
                </Button>

                <Button
                  className={`px-3 py-1 text-sm font-semibold rounded flex items-center gap-2 ${
                    isConnected ? 'bg-green-600 text-white border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {isConnected ? <CheckCircle2 className="h-4 w-4 text-white" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                  {isConnected ? 'Connected' : 'Not Connected'}
                </Button>
              </div>
            </div>
          </div>

          {/* Right-side status badge */}
          <div className="ml-auto mt-1 sm:mt-0">
            <div className={`px-3 py-1 rounded-lg font-semibold text-xs flex items-center gap-1 whitespace-nowrap ${
              isDeviceOnline 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {isDeviceOnline ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {getStatusDisplay(device.is_reachable)}
            </div>
          </div>
        </div>
      </div>

      

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
        
        {/* LEFT COLUMN */}
        <div className="space-y-2">
          
          {/* Device Information Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <Server className="h-5 w-5 text-blue-600" />
                Device Information
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-2">
              <div className="space-y-0">

                {/* Display Name */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Display Name:</span>
                    <span className='font-medium'>{device.display || device.hostname}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* IP Address */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>IP Address:</span>
                    <span className='font-medium font-mono'>{device.ip}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Device Type */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Device Type:</span>
                    <span className='font-medium'>{device.device_type?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Location */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Location:</span>
                    <span className='font-medium'>{device.location?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Area */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Area:</span>
                    <span className='font-medium'>{device.worker?.name || 'N/A'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Coordinates */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between items-center">
                    <span>Coordinates:</span>
                    <span className="flex items-center gap-1 font-medium">
                      {device.location?.latitude && device.location?.longitude
                        ? `${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`
                        : "N/A"}
                      <MapPin className="h-4 w-4 text-gray-400" />
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Created */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Created:</span>
                    <span className='font-medium'>{formatTimeAgo(device.created_at)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Last Updated */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Last Updated:</span>
                    <span className='font-medium'>{formatTimeAgo(device.updated_at)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Last Ping */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 flex justify-between">
                    <span>Last Seen:</span>
                    <span className='font-medium'>{formatTimeAgo(device.last_check)}</span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

      
          {/* Metrics Grid */}
          <div className="flex flex-col gap-2">

            {/* Device Statistics (uptime/downtime) */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader>
                <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                  <Activity className="h-5 w-5 text-amber-600" />
                  Device Statistics
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3">
                {(() => {
                  const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
                  const isOnline = normalizeStatus(device.is_reachable) === true;
                  const uptime = isOnline ? clamp(99 - (device.latency_ms || 0) / 2, 50, 99.9) : 60;
                  const downtime = clamp(100 - uptime, 0, 100);
                  const avg_response_time = isOnline && device.latency_ms ? Math.round(device.latency_ms) : undefined;

                  const statsDevice = {
                    id: device.id,
                    hostname: device.hostname,
                    is_reachable: device.is_reachable,
                    uptime,
                    downtime,
                    avg_response_time,
                    created_at: device.created_at,
                  } as any;

                  return <DeviceStatistics devices={[statsDevice]} />;
                })()}
              </CardContent>
            </Card>

            {/* Network Health Card - Single Device */}
            <NetworkHealthCard 
              device={{
                id: device.id,
                hostname: device.hostname,
                latency_ms: device.latency_ms || 0,
                is_reachable: normalizeStatus(device.is_reachable),
                ip: device.ip,
                last_check: device.last_check || ''
              }} 
            />
          </div>

          {/* Logs Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-amber-600" />
                Event Logs
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-3 max-h-96 overflow-y-auto space-y-2">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className={`border rounded-lg p-3 ${getLogLevelColor(log.level)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono opacity-75">{log.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getLogLevelBadge(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm">{log.message}</div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  No events
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-2">
          
          {/* Map Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden h-126">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Device Location
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 m-0 h-full">
              <div className="h-full overflow-hidden bg-white">
                {device.location?.latitude && device.location?.longitude ? (
                  <MapViewer
                    data={mapDataPoints}
                    connections={[]}
                    centerCoordinates={[device.location.longitude, device.location.latitude]}
                    zoom={14}
                    showLabels={true}
                    pointSize={16}
                    enableZoom={true}
                    enablePan={true}
                    mapFlavor="dark"
                    autoZoomToDensity={false}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">Map coordinates not available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 gap-2">
            {/* Device Availability Graph */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader>
                <CardTitle className="text-m font-semibold text-gray-900">Device Availability</CardTitle>
              </CardHeader>

              <CardContent className="p-3">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-300">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">Graph placeholder for Device Availability</p>
                    <p className="text-gray-400 text-xs mt-1">Ready for API integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Performance Graph */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader>
                <CardTitle className="text-m font-semibold text-gray-900">Network Performance</CardTitle>
              </CardHeader>
              
              <CardContent className="p-3">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-300">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">Graph placeholder for Network Performance</p>
                    <p className="text-gray-400 text-xs mt-1">Ready for API integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );    
}