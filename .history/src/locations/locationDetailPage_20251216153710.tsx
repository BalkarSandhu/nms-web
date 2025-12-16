import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocations } from '@/store/locationsSlice';
import { fetchDevices } from '@/store/deviceSlice';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Activity, Server, FileText, Signal, AlertCircle, CheckCircle2, Network, Wifi, WifiOff, Power, Zap } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';
import NetworkHealthCard from './networkHealthCard';
import DeviceStatistics from './Devicestatistics';

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
  return normalized ? 'true' : 'false';
};

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
 
  
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
  
  // Calculate power statistics
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
          timestamp: new Date(device.last_check || device.updated_at).toLocaleString(),
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
      <div className="p-2 text-center">
        <p className="text-m text-gray-500">Location not found</p>
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
    <div className="min-h-screen bg-white p-3">
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/locations')}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-1 flex-1 ml-4">
          <div className={`p-1 rounded-lg ${isLocationOnline ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <Network className={`h-6 w-6 ${isLocationOnline ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{location.name}</h1>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
        
        {/* LEFT COLUMN */}
        <div className="space-y-2">
          
          {/* System Information Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <Server className="h-5 w-5 text-blue-600" />
                System Information
              </CardTitle>
            </CardHeader>
            
          <CardContent className="p-2">
  <div className="space-y-0">

    {/* System Name */}
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex justify-between">
        <span>System Name:</span>
        <span className='font-medium'>{location.name}</span>
      </div>
    </div>

    <div className="border-t border-gray-200"></div>

    {/* Type */}
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex justify-between">
        <span>Type:</span>
        <span className='font-medium'>{locationType?.name}</span>
      </div>
    </div>

    <div className="border-t border-gray-200"></div>

    {/* Area */}
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex justify-between">
        <span>Area:</span>
        <span className='font-medium'>{worker?.name || "N/A"}</span>
      </div>
    </div>

    <div className="border-t border-gray-200"></div>

    {/* Coordinates with MapPin */}
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex justify-between items-center">
        <span>Coordinates:</span>
        <span className="flex items-center gap-1 font-medum">
          {location.latitude && location.longitude
            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
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
        <span className='font-medium'>{formatTimeAgo(location.created_at)}</span>
      </div>
    </div>

    <div className="border-t border-gray-200"></div>

    {/* Last Updated */}
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex justify-between">
        <span>Last Updated:</span>
        <span className='font-medium'>{formatTimeAgo(location.updated_at)}</span>
      </div>
    </div>

  </div>
</CardContent>

          </Card>

          {/* Devices Card */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <Wifi className="h-5 w-5 text-purple-600" />
                Connected Devices
                <span className="ml-auto text-purple-600 font-semibold">{locationDevices.length}</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  <div className="text-emerald-600 text-lg font-bold">{devicesOnline}</div>
                  <div className="text-emerald-700 text-xs mt-1 flex items-center gap-1">
                    <Signal className="h-3 w-3" /> Online
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <div className="text-red-600 text-lg font-bold">{devicesOffline}</div>
                  <div className="text-red-700 text-xs mt-1 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline
                  </div>
                </div>
              </div>

              {locationDevices.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {locationDevices.map(device => {
                    const isOnline = normalizeStatus(device.is_reachable) === true;
                    return (
                      <div key={device.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition">
                        <div className="flex items-start justify-between gap-1">
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
                            {getStatusDisplay(device.is_reachable)}
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

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                      <Activity className="h-5 w-5 text-amber-600" />
                      Device Statistics
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-3 max-h-96 overflow-y-auto">
                    <DeviceStatistics devices={locationDevices} />
                  </CardContent>
                </Card>
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
                  {log.device && <div className="text-xs font-medium mb-1 opacity-75">Device: {log.device}</div>}
                  {log.message}
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
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-m font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Location Map
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0 m-0 h-full">
              <div className="h-full overflow-hidden bg-white">
                {location.latitude && location.longitude ? (
                  <MapViewer
                    // ref={mapViewerRef}
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
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  Device Power Status
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3">
                {locationDevices.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <Power className="h-8 w-8 mx-auto opacity-50 mb-2" />
                    <p className="text-sm">No devices</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Power Statistics */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                        <div className="text-green-600 text-xl font-bold">{devicesWithPower}</div>
                        <div className="text-green-700 text-xs mt-1 flex items-center justify-center gap-1">
                          <Zap className="h-3 w-3" /> Powered
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                        <div className="text-red-600 text-xl font-bold">{devicesWithoutPower}</div>
                        <div className="text-red-700 text-xs mt-1 flex items-center justify-center gap-1">
                          <Power className="h-3 w-3" /> No Power
                        </div>
                      </div>
                    </div>

                    {/* Individual Device Status */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {locationDevices.map(device => (
                        <div 
                          key={device.id} 
                          className={`flex items-center justify-between p-2 rounded-lg border ${
                            device.has_power 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {device.has_power ? (
                              <Zap className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Power className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className={`text-sm font-medium truncate ${
                              device.has_power ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {device.hostname}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            device.has_power 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {device.has_power ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      ))}
                    </div>

                    
                  </div>
                )}
              </CardContent>
            </Card>

            
            <NetworkHealthCard devices={locationDevices} />
          </div>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 gap-2">
            {/* Location Availability Graph */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardHeader >
                <CardTitle className="text-m font-semibold text-gray-900">Location Availability</CardTitle>
              </CardHeader>

              <CardContent className="p-3">
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
              <CardHeader >
                <CardTitle className="text-m font-semibold text-gray-900">Devices Availability</CardTitle>
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
          </div>
        </div>
      </div>
    </div>
  );
}
