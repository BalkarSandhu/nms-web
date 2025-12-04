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
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Network, Wifi, WifiOff } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';

type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  device?: string;
};

const normalizeStatus = (status: any): boolean | 'offline' => {
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
  const devicesOnline = locationDevices.filter(d => normalizeStatus(d.status) === true).length;
  const devicesOffline = locationDevices.filter(d => normalizeStatus(d.status) === false).length;

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
      const isOnline = normalizeStatus(device.status) === true;
      return {
        id: device.id,
        name: device.hostname,
        coordinates: [device.location.lng || 0, device.location.lat || 0] as [number, number],
        value: isOnline ? 1 : 0,
        category: isOnline ? 'green' : 'red',
        popupData: {
          indicatorColour: isOnline ? 'green' : 'red',
          headerLeft: { field: 'Device', value: device.hostname },
          headerRight: { field: 'Status', value: getStatusDisplay(device.status) },
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
    
    if (location && location.lat && location.lng && locationDevices.length > 0) {
      locationDevices.forEach((device, index) => {
        const isOnline = normalizeStatus(device.status) === true;
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
        const deviceStatusNormalized = normalizeStatus(device.status);
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

  const isLocationOnline = normalizeStatus(location.status) === true;

  return (
    <div className="min-h-screen bg-white p-6">
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/locations')}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-1 flex-1 ml-4">
          <div className={`p-2 rounded-lg ${isLocationOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <Network className={`h-6 w-6 ${isLocationOnline ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{location.name}</h1>
          </div>
          
          <div className={`ml-auto px-3 py-1 rounded-lg font-semibold text-xs flex items-center gap-1 whitespace-nowrap ${
            isLocationOnline 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
              : 'bg-red-100 text-red-700 border border-red-300'
          }`}>
            {isLocationOnline ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {getStatusDisplay(location.status)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        
        {/* LEFT COLUMN */}
        <div className="space-y-1">
          
          {/* System Information Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader className={cn("bg-gradient-to-r from-blue-50 to-blue-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
              <CardTitle className="flex items-center gap-1 text-lg font-semibold text-gray-900">
                <Server className="h-5 w-5 text-blue-600" />
                System Information
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">System Name</div>
                  <div className="font-medium text-gray-900">{location.name}</div>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Type</div>
                  <div className="font-medium text-gray-900">{locationType?.name || "Unknown"}</div>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Area</div>
                  <div className="font-medium text-gray-900">{worker?.hostname || "N/A"}</div>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Coordinates</div>
                  <div className="flex items-center gap-2 font-mono text-sm text-gray-900">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {location.lat && location.lng ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'N/A'}
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="font-medium text-gray-900">{formatTimeAgo(location.created_at)}</div>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="space-y-1">
                  <div className="text-sm text-gray-600">Last Updated</div>
                  <div className="font-medium text-gray-900">{formatTimeAgo(location.updated_at)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devices Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader className={cn("bg-gradient-to-r from-purple-50 to-purple-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
              <CardTitle className="flex items-center gap-1 text-lg font-semibold text-gray-900">
                <Wifi className="h-5 w-5 text-purple-600" />
                Connected Devices
                <span className="ml-auto text-purple-600 font-semibold">{locationDevices.length}</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="text-emerald-600 text-xl font-bold">{devicesOnline}</div>
                  <div className="text-emerald-700 text-xs mt-1 flex items-center gap-1">
                    <Signal className="h-3 w-3" /> Online
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-600 text-2xl font-bold">{devicesOffline}</div>
                  <div className="text-red-700 text-xs mt-1 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline
                  </div>
                </div>
              </div>

              {locationDevices.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {locationDevices.map(device => {
                    const isOnline = normalizeStatus(device.status) === true;
                    return (
                      <div key={device.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900 font-medium text-sm truncate">{device.hostname}</div>
                            <div className="text-gray-500 text-xs font-mono mt-1">{device.ip}</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {isOnline ? <Signal className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {getStatusDisplay(device.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wifi className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  No devices found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader className={cn("bg-gradient-to-r from-amber-50 to-amber-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-amber-600" />
                Event Logs
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 max-h-96 overflow-y-auto space-y-1">
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
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  No events
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-1">
          
          {/* Map Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden h-96">
            <CardHeader className={cn("bg-gradient-to-r from-cyan-50 to-cyan-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Location Map
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0 m-0 h-full">
              <div className="h-full overflow-hidden bg-white">
                {location.lat && location.lng ? (
                  <MapViewer
                    ref={mapViewerRef}
                    data={mapDataPoints}
                    connections={mapConnections}
                    centerCoordinates={[location.lng, location.lat]}
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
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
              <CardHeader className={cn("bg-gradient-to-r from-green-50 to-green-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
                <CardTitle className="text-sm font-semibold text-gray-900">Availability</CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {locationDevices.length > 0 ? Math.round((devicesOnline / locationDevices.length) * 100) : 0}%
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Last 24 Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader className={cn("bg-gradient-to-r from-orange-50 to-orange-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
                <CardTitle className="text-sm font-semibold text-gray-900">Network Health</CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">---</div>
                    <p className="text-gray-500 text-xs mt-1">Signal Quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 gap-4">
            {/* Location Availability Graph */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader className={cn("bg-gradient-to-r from-blue-50 to-blue-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
                <CardTitle className="text-lg font-semibold text-gray-900">Location Availability</CardTitle>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-300">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">Graph placeholder for Location Availability</p>
                    <p className="text-gray-400 text-xs mt-1">Ready for API integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Devices Availability Graph */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader className={cn("bg-gradient-to-r from-purple-50 to-purple-50 border-b border-gray-200 -mt-6 -mx-6 pt-4 px-6 pb-0")}>
                <CardTitle className="text-lg font-semibold text-gray-900">Devices Availability</CardTitle>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-300">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">Graph placeholder for Device Availability</p>
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