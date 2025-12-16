import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocations } from '@/store/locationsSlice';
import { fetchDevices } from '@/store/deviceSlice';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Network, Wifi, WifiOff, Power, Zap, Clock, Globe } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';
import NetworkHealthCard from './networkHealthCard';

type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  device?: string;
};

const normalizeStatus = (status: any): boolean | 'false' => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false;
  }
  return status;
};

const getStatusDisplay = (status: any): string => {
  const normalized = normalizeStatus(status);
  return normalized ? 'Online' : 'Offline';
};

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const mapViewerRef = useRef(null);
  
  const locationId = id ? parseInt(id, 10) : null;
  
  const { locations, locationTypes } = useAppSelector(state => state.locations);
  const { devices } = useAppSelector(state => state.devices);
  const { workers } = useAppSelector(state => state.workers);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mapDataPoints, setMapDataPoints] = useState<MapDataPoint[]>([]);
  const [mapConnections, setMapConnections] = useState<MapConnection[]>([]);

  const location = locations.find(loc => loc.id === locationId);
  const locationType = locationTypes.find(lt => lt.id === location?.location_type_id);
  
  const worker_id = (location as any)?.worker_id;
  const worker = worker_id ? workers.find(w => w.id === worker_id) : undefined;
  
  const locationDevices = devices.filter(d => d.location_id === locationId);
  const devicesOnline = locationDevices.filter(d => normalizeStatus(d.is_reachable) === true).length;
  const devicesOffline = locationDevices.filter(d => normalizeStatus(d.is_reachable) === false).length;
  
  const devicesWithPower = locationDevices.filter(d => d.has_power === true).length;
  const devicesWithoutPower = locationDevices.filter(d => d.has_power === false).length;

  useEffect(() => {
    if (!locations.length) {
      dispatch(fetchLocations());
    }
    if (!devices.length) {
      dispatch(fetchDevices());
    }
  }, [dispatch, locations.length, devices.length]);

  useEffect(() => {
    const dataPoints: MapDataPoint[] = locationDevices.map(device => {
      const isOnline = normalizeStatus(device.is_reachable) === true;
      return {
        id: device.id,
        name: device.hostname,
        coordinates: [device.location.longitude || 0, device.location.latitude || 0] as [number, number],
        value: isOnline ? 1 : 0,
        category: isOnline ? 'green' : 'red',
        popupData: {
          indicatorColour: isOnline ? 'green' : 'red',
          headerLeft: { field: 'Device', value: device.hostname },
          headerRight: { field: 'Status', value: getStatusDisplay(device.is_reachable) },
          sideLabel: { field: 'Location', value: location?.name || 'Unknown' },
          data: [
            { field: 'IP Address', value: device.ip, colour: 'white' },
            { field: 'Type', value: device.device_type.name || 'N/A', colour: 'white' },
            { field: 'Last Updated', value: device.updated_at || 'N/A', colour: 'white' },
          ]
        },
        additionalData: {
          'device_id': device.id,
          'ip': device.ip,
          'type': device.device_type.name || 'Unknown',
        }
      };
    });

    setMapDataPoints(dataPoints);
  }, [locationDevices, location?.name]);

  useEffect(() => {
    const connections: MapConnection[] = [];
    
    if (location && location.latitude && location.longitude && locationDevices.length > 0) {
      locationDevices.forEach((device, index) => {
        const isOnline = normalizeStatus(device.is_reachable) === true;
        connections.push({
          id: `connection-${index}`,
          from: 'location-main',
          to: device.id,
          color: isOnline ? '#4CB944' : '#D52941',
          width: isOnline ? 2 : 1,
          label: `${device.hostname}`
        });
      });
    }
    
    setMapConnections(connections);
  }, [locationDevices, location]);

  useEffect(() => {
    if (locationId && location) {
      const generatedLogs: LogEntry[] = [];
      let logId = 1;

      const locationStatusNormalized = normalizeStatus(location.status);
      generatedLogs.push({
        id: logId++,
        timestamp: new Date(location.updated_at || Date.now()).toLocaleString(),
        level: locationStatusNormalized === true ? 'success' : 'error',
        message: `Location status: ${getStatusDisplay(location.status)}`,
      });

      locationDevices.forEach(device => {
        const deviceStatusNormalized = normalizeStatus(device.is_reachable);
        generatedLogs.push({
          id: logId++,
          timestamp: new Date(device.last_ping || device.updated_at).toLocaleString(),
          level: deviceStatusNormalized === true ? 'success' : 'error',
          message: device.status_reason || (deviceStatusNormalized === true ? 'Device online' : 'Device offline'),
          device: device.hostname,
        });
      });

      generatedLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setLogs(generatedLogs);
    }
  }, [locationId, location, locationDevices]);

  if (!location) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-gray-500">Location not found</p>
        <Button onClick={() => navigate('/locations')} className="mt-4">
          Back to Locations
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
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getLogLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-3.5 w-3.5 text-amber-600" />;
      case 'info':
      default:
        return <Activity className="h-3.5 w-3.5 text-blue-600" />;
    }
  };

  const isLocationOnline = normalizeStatus(location.status) === true;
  const uptimePercentage = locationDevices.length > 0 
    ? Math.round((devicesOnline / locationDevices.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 p-6">
      
      {/* Enhanced Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => navigate('/locations')}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm hover:shadow"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shadow-sm ${isLocationOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <Network className={`h-7 w-7 ${isLocationOnline ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{locationType?.name || 'Unknown Type'}</p>
              </div>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm ${
            isLocationOnline 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {isLocationOnline ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {getStatusDisplay(location.status)}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Devices</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{locationDevices.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Online</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{devicesOnline}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Signal className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Offline</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{devicesOffline}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <WifiOff className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uptime</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{uptimePercentage}%</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Sidebar - Location Info */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          
          {/* Location Details */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Globe className="h-5 w-5 text-blue-600" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Area</span>
                <span className="text-sm font-medium text-gray-900">{worker?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Coordinates</span>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  {location.latitude && location.longitude
                    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : "N/A"}
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatTimeAgo(location.created_at)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {formatTimeAgo(location.updated_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Power Status */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                Power Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationDevices.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Power className="h-10 w-10 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">No devices</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-green-600 text-xl font-bold">{devicesWithPower}</div>
                      <div className="text-green-700 text-xs mt-1 flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3" /> Powered
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-red-600 text-xl font-bold">{devicesWithoutPower}</div>
                      <div className="text-red-700 text-xs mt-1 flex items-center justify-center gap-1">
                        <Power className="h-3 w-3" /> No Power
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network Health */}
          <NetworkHealthCard devices={locationDevices} />
        </div>

        {/* Center - Map and Devices */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          
          {/* Map */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur overflow-hidden" style={{ height: '400px' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Network Topology
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-4rem)]">
              {location.latitude && location.longitude ? (
                <MapViewer
                  ref={mapViewerRef}
                  data={mapDataPoints}
                  connections={mapConnections}
                  centerCoordinates={[location.longitude, location.latitude]}
                  zoom={12}
                  showLabels={true}
                  pointSize={16}
                  enableZoom={true}
                  enablePan={true}
                  mapFlavor="dark"
                  autoZoomToDensity={true}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Map coordinates not available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devices List */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-purple-600" />
                  Connected Devices
                </div>
                <span className="text-purple-600 font-semibold text-lg">{locationDevices.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationDevices.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {locationDevices.map(device => {
                    const isOnline = normalizeStatus(device.is_reachable) === true;
                    return (
                      <div key={device.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${device.has_power ? 'bg-green-100' : 'bg-red-100'}`}>
                              {device.has_power ? 
                                <Zap className="h-4 w-4 text-green-600" /> : 
                                <Power className="h-4 w-4 text-red-500" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{device.hostname}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{device.ip}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {isOnline ? <Signal className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {getStatusDisplay(device.is_reachable)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Wifi className="h-12 w-12 mx-auto opacity-50 mb-3" />
                  <p className="text-sm">No devices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Activity & Analytics */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          
          {/* Event Logs */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-amber-600" />
                Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {logs.length > 0 ? logs.slice(0, 8).map(log => (
                  <div key={log.id} className={`border rounded-lg p-2.5 text-xs ${getLogLevelColor(log.level)}`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {getLogLevelIcon(log.level)}
                        <span className="font-mono opacity-75">{log.timestamp.split(',')[1]?.trim() || log.timestamp}</span>
                      </div>
                    </div>
                    {log.device && <div className="font-medium mb-1 opacity-90">Device: {log.device}</div>}
                    <div className="opacity-90">{log.message}</div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="h-10 w-10 mx-auto opacity-50 mb-2" />
                    <p className="text-sm">No events</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Availability Charts Placeholder */}
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">Availability Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="text-center">
                  <Activity className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-xs font-medium">Analytics Ready</p>
                  <p className="text-gray-400 text-xs mt-1">Awaiting data integration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}