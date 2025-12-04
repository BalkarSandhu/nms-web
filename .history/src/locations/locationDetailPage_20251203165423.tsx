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
import { ArrowLeft, MapPin, Activity, Server, FileText } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';

// Log entry type
type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  device?: string;
};

// Helper function to normalize status
const normalizeStatus = (status: any): boolean | 'offline' => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false; // Treat unknown as offline
  }
  return status;
};

// Helper function to get status display
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

  // Build map data from devices
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

  // Build map connections
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

  // Generate logs from location and device data
  useEffect(() => {
    if (locationId && location) {
      const generatedLogs: LogEntry[] = [];
      let logId = 1;

      // Add location status logs
      const locationStatusNormalized = normalizeStatus(location.status);
      generatedLogs.push({
        id: logId++,
        timestamp: new Date(location.updated_at || Date.now()).toLocaleString(),
        level: locationStatusNormalized === true ? 'success' : 'error',
        message: `Location status: ${getStatusDisplay(location.status)}`,
      });

      // Add device status logs
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

      // Sort by timestamp (most recent first)
      generatedLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setLogs(generatedLogs);
    }
  }, [locationId, location, locationDevices]);

  if (!location) {
    return (
      <div className="p-2 text-center">
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
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getLogLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-1">

      {/* Top Bar */}
      <div className="flex items-center gap-1 mb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/locations')}
          className="gap-1 hover:bg-gray-300 border-3 px-4"
        >
          <ArrowLeft className="h-4 w-4 onHover" />
        </Button>

        <h1 className="text-xl font-semibold text-gray-900 bg-gray-200 rounded-[3px] tracking-tight">
          {location.name}
        </h1>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">

        {/* LEFT SIDEBAR - SYSTEM INFO + DEVICES + MAP */}
        <div className="space-y-2">

          {/* System Information */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-lg font-semibold">
                <Server className="h-5 w-5 text-gray-600" />
                System Information
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-gray-700 w-1/3">
                      System Name
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {location.name}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-gray-700">
                      Type
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {locationType?.name || "Unknown"}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-gray-700">
                      Status
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          normalizeStatus(location.status) === true
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {getStatusDisplay(location.status)}
                      </span>
                    </TableCell>
                  </TableRow>

                  {worker && (
                    <TableRow>
                      <TableCell className="font-medium text-gray-700">
                        Area
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {worker.hostname}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Location Coordinates */}
                  <TableRow>
                    <TableCell className="font-medium text-gray-700">
                      Coordinates
                    </TableCell>

                    <TableCell>
                      {location.lat && location.lng ? (
                        <div className="flex items-center gap-1 text-gray-900">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-gray-700">
                      Created
                    </TableCell>
                    <TableCell>{formatTimeAgo(location.created_at)}</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-gray-700">
                      Updated
                    </TableCell>
                    <TableCell>{formatTimeAgo(location.updated_at)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Devices */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-lg font-semibold">
                <Activity className="h-5 w-5 text-gray-600" />
                Devices ({locationDevices.length})
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Online</span>
                  <span className="font-semibold text-green-600">{devicesOnline}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Offline</span>
                  <span className="font-semibold text-red-600">{devicesOffline}</span>
                </div>
              </div>

              {locationDevices.length ? (
                <div className="max-h-[300px] overflow-y-auto thin-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {locationDevices.map((device) => {
                        const isOnline = normalizeStatus(device.status) === true;
                        return (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium text-gray-900">
                              {device.hostname}
                            </TableCell>
                            <TableCell className="text-gray-700">{device.ip}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  isOnline
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {getStatusDisplay(device.status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No devices found
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-lg font-semibold">
                <FileText className="h-5 w-5 text-gray-600" />
                Location Logs
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-1 rounded-md border ${getLogLevelColor(log.level)}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-mono text-gray-600">
                          {log.timestamp}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getLogLevelBadge(
                            log.level
                          )}`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      {log.device && (
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          Device: {log.device}
                        </div>
                      )}
                      <p className="text-sm font-medium">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No logs available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>





        </div>

        {/* RIGHT SIDE - MAP + LOGS + GRAPHS */}
        <div className="lg:col-span-2 space-y-2">

          {/* Location Map */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center  text-lg font-semibold">
                <MapPin className="h-3 w-3 text-gray-600" />
                Location Map
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="h-[350px] overflow-hidden rounded-b-lg">
                <MapViewer
                  ref={mapViewerRef}
                  data={mapDataPoints}
                  connections={mapConnections}
                  centerCoordinates={
                    location.lat && location.lng
                      ? [location.lng, location.lat]
                      : [78.9629, 20.5937]
                  }
                  zoom={12}
                  showLabels={true}
                  pointSize={16}
                  enableZoom={true}
                  enablePan={true}
                  mapFlavor="dark"
                  autoZoomToDensity={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Logs */}
          

          {/* Graphs */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Location Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded border border-gray-300">
                <p className="text-gray-400">Graph placeholder</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Devices Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded border border-gray-300">
                <p className="text-gray-400">Graph placeholder</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}