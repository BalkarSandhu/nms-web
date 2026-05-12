import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocations } from '@/store/locationsSlice';
import { fetchDevices } from '@/store/deviceSlice';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, MapPin, Activity, Server, FileText, Signal,
  AlertCircle, CheckCircle2, Network, Wifi, WifiOff, Power, Zap,
} from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';
import NetworkHealthCard from './networkHealthCard';
import DeviceStatistics from './Devicestatistics';
import LocationTelemetry from './LocationTelemetry';

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

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const locationId = id ? parseInt(id, 10) : null;

  const { locations = [], locationTypes = [] } = useAppSelector(state => state.locations);
  const { devices = [] } = useAppSelector(state => state.devices);
  const { workers = [] } = useAppSelector(state => state.workers);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mapDataPoints, setMapDataPoints] = useState<MapDataPoint[]>([]);
  const [mapConnections, setMapConnections] = useState<MapConnection[]>([]);

  const location = locationId && Array.isArray(locations) ? locations.find(loc => loc.id === locationId) : null;
  const locationType = location && Array.isArray(locationTypes) ? locationTypes.find(lt => lt.id === location.location_type_id) : null;

  const worker_id = location ? (location as any)?.worker_id : null;
  const worker = worker_id && Array.isArray(workers) ? workers.find(w => w.id === worker_id || w.id === String(worker_id)) : null;

  const locationDevices = locationId && Array.isArray(devices) ? devices.filter(d => d.location_id === locationId) : [];
  const devicesOnline = locationDevices.filter(d => normalizeStatus(d.is_reachable) === true).length;
  const devicesOffline = locationDevices.filter(d => normalizeStatus(d.is_reachable) === false).length;

  const devicesWithPower = locationDevices.filter(d => d.has_power === true).length;
  const devicesWithoutPower = locationDevices.filter(d => d.has_power === false).length;

  useEffect(() => {
    if (!locations || locations.length === 0) dispatch(fetchLocations());
    if (!devices || devices.length === 0) dispatch(fetchDevices());
  }, [dispatch, locations.length, devices.length]);

  useEffect(() => {
    if (!location) return;

    const dataPoints: MapDataPoint[] = locationDevices.map(device => {
      const isOnline = normalizeStatus(device.is_reachable) === true;
      return {
        id: device.id,
        name: device.hostname,
        coordinates: [device.location?.longitude || 0, device.location?.latitude || 0] as [number, number],
        value: isOnline ? 1 : 0,
        category: isOnline ? 'green' : 'red',
        popupData: {
          indicatorColour: isOnline ? 'green' : 'red',
          headerLeft: { field: 'Device', value: device.hostname },
          headerRight: { field: 'Status', value: getStatusDisplay(device.is_reachable) },
          sideLabel: { field: 'Location', value: location?.name || 'Unknown' },
          data: [
            { field: 'IP Address', value: device.ip, colour: 'white' },
            { field: 'Type', value: device.device_type?.name || 'N/A', colour: 'white' },
            { field: 'Last Updated', value: formatTimeAgo(device.updated_at) || 'N/A', colour: 'white' },
          ],
        },
        additionalData: {
          device_id: device.id,
          ip: device.ip,
          type: device.device_type?.name || 'Unknown',
        },
      };
    });

    if (location && location.latitude && location.longitude) {
      const locationPoint: MapDataPoint = {
        id: 'location-main',
        name: location.name || 'Location',
        coordinates: [location.longitude || 0, location.latitude || 0],
        value: 1,
        category: normalizeStatus(location.status) === true ? 'green' : 'azul',
        popupData: {
          indicatorColour: normalizeStatus(location.status) === true ? 'green' : 'white',
          headerLeft: { field: 'Location', value: location.name || 'Location' },
          headerRight: { field: 'Status', value: getStatusDisplay(location.status) },
          sideLabel: { field: 'Devices', value: String(locationDevices.length) },
          data: [],
        },
        additionalData: { location_id: location.id },
      };
      setMapDataPoints([locationPoint, ...dataPoints]);
    } else {
      setMapDataPoints(dataPoints);
    }
  }, [locationDevices, location]);

  useEffect(() => {
    if (!location) return;
    const connections: MapConnection[] = [];
    if (location && location.latitude && location.longitude && locationDevices.length > 0) {
      locationDevices.forEach((device, index) => {
        const isOnline = normalizeStatus(device.is_reachable) === true;
        connections.push({
          id: `connection-${index}`,
          from: 'location-main',
          to: device.id,
          color: isOnline ? '#22c55e' : '#ef4444',
          width: isOnline ? 2 : 1,
          label: `${device.hostname}`,
        });
      });
    }
    setMapConnections(connections);
  }, [locationDevices, location]);

  useEffect(() => {
    if (!location || !locationId) return;
    const generatedLogs: LogEntry[] = [];
    let logId = 1;

    const locationStatusNormalized = normalizeStatus(location.status);
    generatedLogs.push({
      id: logId++,
      timestamp: new Date(formatTimeAgo(location.updated_at) || Date.now()).toLocaleString(),
      level: locationStatusNormalized === true ? 'success' : 'error',
      message: `Location status: ${getStatusDisplay(location.status)}`,
    });

    locationDevices.forEach(device => {
      const deviceStatusNormalized = normalizeStatus(device.is_reachable);
      generatedLogs.push({
        id: logId++,
        timestamp: new Date(formatTimeAgo(device.updated_at) || Date.now()).toLocaleString(),
        level: deviceStatusNormalized === true ? 'success' : 'error',
        message: device.status_reason || (deviceStatusNormalized === true ? 'Device online' : 'Device offline'),
        device: device.hostname,
      });
    });

    generatedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(generatedLogs);
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

  // Log helpers — matched to device-info style (dark, semi-translucent)
  const getLogLevelWrapper = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300';
      case 'error':   return 'bg-red-900/30 border-red-700/40 text-red-300';
      case 'warning': return 'bg-amber-900/30 border-amber-700/40 text-amber-300';
      case 'info':
      default:        return 'bg-cyan-900/30 border-cyan-700/40 text-cyan-300';
    }
  };
  const getLogLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-emerald-500/15 text-emerald-300';
      case 'error':   return 'bg-red-500/15 text-red-300';
      case 'warning': return 'bg-amber-500/15 text-amber-300';
      case 'info':
      default:        return 'bg-cyan-500/15 text-cyan-300';
    }
  };

  const isLocationOnline = normalizeStatus(location.status) === true;

  return (
    <div className="min-h-screen bg-gray-900 p-6">

      {/* Header — mirrors Device Details */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/locations')}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLocationOnline ? 'bg-green-900' : 'bg-red-900'}`}>
              <Network className={`h-6 w-6 ${isLocationOnline ? 'text-green-400' : 'text-red-400'}`} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">{location.name}</h1>
              <p className="text-sm text-gray-400">Location Details</p>
            </div>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Online: {devicesOnline}
          </div>

          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${
            devicesOffline > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            <AlertCircle className="h-4 w-4" />
            Offline: {devicesOffline}
          </div>

          <div className={`px-3 py-1 rounded-full font-medium text-sm flex items-center gap-2 ${
            isLocationOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            <Signal className="h-4 w-4" />
            {isLocationOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* System Information Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Server className="h-5 w-5 text-cyan-400" />
                System Information
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">System Name</span>
                  <span className="text-sm font-semibold">{location.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Type</span>
                  <span className="text-sm font-semibold">{locationType?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Area</span>
                  <span className="text-sm font-semibold">{worker?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Coordinates</span>
                  <span className="text-sm font-semibold flex items-center gap-1">
                    {location.latitude && location.longitude
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : "N/A"}
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm font-semibold">{formatTimeAgo(location.created_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Updated</span>
                  <span className="text-sm font-semibold">{formatTimeAgo(location.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Devices Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Wifi className="h-5 w-5 text-violet-300" />
                Connected Devices
                <span className="ml-auto text-violet-300 font-semibold">{locationDevices.length}</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-emerald-500/10 border border-emerald-600/30 rounded-lg p-2">
                  <div className="text-emerald-300 text-lg font-bold">{devicesOnline}</div>
                  <div className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                    <Signal className="h-3 w-3" /> Online
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-600/30 rounded-lg p-2">
                  <div className="text-red-300 text-lg font-bold">{devicesOffline}</div>
                  <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline
                  </div>
                </div>
              </div>

              {locationDevices.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {locationDevices.map(device => {
                    const isOnline = normalizeStatus(device.is_reachable) === true;
                    return (
                      <div
                        key={device.id}
                        className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 hover:bg-slate-900 transition"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-100 font-medium text-sm truncate">{device.hostname}</div>
                            <div className="text-slate-400 text-xs font-mono mt-1">{device.ip}</div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
                            isOnline
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-red-500/15 text-red-300'
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
                <div className="text-center py-8 text-slate-400">
                  <Wifi className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  No devices found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Statistics Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <Activity className="h-5 w-5 text-emerald-300" />
                Device Statistics
              </CardTitle>
            </CardHeader>

            <CardContent className="max-h-96 overflow-y-auto">
              {locationDevices.length > 0 ? (
                <DeviceStatistics devices={locationDevices} />
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Activity className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  No devices to display
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Logs Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <FileText className="h-5 w-5 text-amber-300" />
                Event Logs
              </CardTitle>
            </CardHeader>

            <CardContent className="max-h-96 overflow-y-auto space-y-2">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className={`border rounded-lg p-3 ${getLogLevelWrapper(log.level)}`}>
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
                <div className="text-center py-8 text-slate-400">
                  <FileText className="h-8 w-8 mx-auto opacity-50 mb-2" />
                  No events
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* Map Card */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100 overflow-hidden h-116">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <MapPin className="h-5 w-5 text-cyan-400" />
                Location Map
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 m-0 h-full">
              <div className="h-full overflow-hidden">
                {location.latitude && location.longitude ? (
                  <MapViewer
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
                  <div className="h-full flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto text-slate-500 mb-3" />
                      <p className="text-slate-400">Map coordinates not available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Power Status */}
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Zap className="h-5 w-5 text-amber-300" />
                  Device Power Status
                </CardTitle>
              </CardHeader>

              <CardContent>
                {locationDevices.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">
                    <Power className="h-8 w-8 mx-auto opacity-50 mb-2" />
                    <p className="text-sm">No devices</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-emerald-500/10 border border-emerald-600/30 rounded-lg p-2 text-center">
                        <div className="text-emerald-300 text-xl font-bold">{devicesWithPower}</div>
                        <div className="text-emerald-400 text-xs mt-1 flex items-center justify-center gap-1">
                          <Zap className="h-3 w-3" /> Powered
                        </div>
                      </div>
                      <div className="bg-red-500/10 border border-red-600/30 rounded-lg p-2 text-center">
                        <div className="text-red-300 text-xl font-bold">{devicesWithoutPower}</div>
                        <div className="text-red-400 text-xs mt-1 flex items-center justify-center gap-1">
                          <Power className="h-3 w-3" /> No Power
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {locationDevices.map(device => (
                        <div
                          key={device.id}
                          className={`flex items-center justify-between p-2 rounded-lg border ${
                            device.has_power
                              ? 'bg-emerald-500/10 border-emerald-600/30'
                              : 'bg-red-500/10 border-red-600/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {device.has_power
                              ? <Zap   className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                              : <Power className="h-4 w-4 text-red-300 flex-shrink-0" />}
                            <span className={`text-sm font-medium truncate ${
                              device.has_power ? 'text-emerald-300' : 'text-red-300'
                            }`}>
                              {device.hostname}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            device.has_power
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-red-500/15 text-red-300'
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

            {/* Network Health */}
            {locationDevices.length > 0 ? (
              <NetworkHealthCard devices={locationDevices} />
            ) : (
              <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-white">Network Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-400">
                    <Network className="h-8 w-8 mx-auto opacity-50 mb-2" />
                    No devices to analyze
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Live aggregated telemetry — availability, latency, jitter, packet loss, per-device uptime */}
          <LocationTelemetry
            devices={locationDevices.map(d => ({ id: d.id, hostname: d.hostname }))}
          />
        </div>
      </div>
    </div>
  );
}
