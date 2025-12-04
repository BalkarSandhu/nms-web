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
import { ArrowLeft, MapPin, Activity, Clock, Server, X } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const mapViewerRef = useRef(null);
  
  const locationId = id ? parseInt(id, 10) : null;
  
  const { locations, locationTypes } = useAppSelector(state => state.locations);
  const { devices } = useAppSelector(state => state.devices);
  const { workers } = useAppSelector(state => state.workers);
  
  const [recentEvents, setRecentEvents] = useState<Array<{
    timestamp: string;
    message: string;
  }>>([]);

  const [mapDataPoints, setMapDataPoints] = useState<MapDataPoint[]>([]);
  const [mapConnections, setMapConnections] = useState<MapConnection[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);

  const location = locations.find(loc => loc.id === locationId);
  const locationType = locationTypes.find(lt => lt.id === location?.location_type_id);
  
  const worker_id = (location as any)?.worker_id;
  const worker = worker_id ? workers.find(w => w.id === worker_id) : undefined;
  
  const locationDevices = devices.filter(d => d.location_id === locationId);
  const devicesOnline = locationDevices.filter(d => d.status === true).length;
  const devicesOffline = locationDevices.filter(d => d.status === false).length;

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
    const dataPoints: MapDataPoint[] = locationDevices.map(device => ({
      id: device.id,
      name: device.hostname,
      coordinates: [device.location.lng || 0, device.location.lat || 0] as [number, number],
      value: device.status ? 1 : 0,
      category: device.status ? 'green' : 'red',
      popupData: {
        indicatorColour: device.status ? 'green' : 'red',
        headerLeft: { field: 'Device', value: device.hostname },
        headerRight: { field: 'Status', value: device.status ? 'Online' : 'Offline' },
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
    }));

    setMapDataPoints(dataPoints);
  }, [locationDevices, location?.name]);

  // Build map connections
  useEffect(() => {
    const connections: MapConnection[] = [];
    
    if (location && location.lat && location.lng && locationDevices.length > 0) {
      locationDevices.forEach((device, index) => {
        connections.push({
          id: `connection-${index}`,
          from: 'location-main',
          to: device.id,
          color: device.status ? '#4CB944' : '#D52941',
          width: device.status ? 2 : 1,
          label: `${device.hostname}`
        });
      });
    }
    
    setMapConnections(connections);
  }, [locationDevices, location]);

  useEffect(() => {
    if (locationId) {
      const mockEvents = [
        { timestamp: '2025-11-25 11:06:05', message: 'Device status changed to Down from icmp check.' },
      ];
      setRecentEvents(mockEvents);
    }
  }, [locationId]);

  if (!location) {
    return (
      <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
        <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4">Location not found</p>
            <Button onClick={() => navigate('/locations')}>
              Back to Locations
            </Button>
          </div>
        </div>
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

  return (
    <div className="flex flex-col gap-2 w-full h-full p-4 bg-(--contrast)">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/locations')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold text-(--text-primary)">
          {location.name}
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex w-full h-full gap-2 overflow-hidden">
        {/* LEFT SIDEBAR - SYSTEM INFO + DEVICES */}
        <div className="flex flex-col gap-2 w-1/3 overflow-y-auto">
          {/* System Information */}
          <Card className="border-(--border)">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-(--text-secondary) w-2/5">
                      System Name
                    </TableCell>
                    <TableCell className="text-(--text-primary)">
                      {location.name}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-(--text-secondary)">
                      Type
                    </TableCell>
                    <TableCell className="text-(--text-primary)">
                      {locationType?.name || "Unknown"}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-(--text-secondary)">
                      Status
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          location.status === "online"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {location.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </TableCell>
                  </TableRow>

                  {worker && (
                    <TableRow>
                      <TableCell className="font-medium text-(--text-secondary)">
                        Area
                      </TableCell>
                      <TableCell className="text-(--text-primary)">
                        {worker.hostname}
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow>
                    <TableCell className="font-medium text-(--text-secondary)">
                      Coordinates
                    </TableCell>
                    <TableCell>
                      {location.lat && location.lng ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1 text-(--text-primary)">
                            <MapPin className="h-4 w-4 text-(--text-secondary)" />
                            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-fit"
                            onClick={() => setShowMapModal(true)}
                          >
                            View on Map
                          </Button>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-(--text-secondary)">
                      Created
                    </TableCell>
                    <TableCell className="text-(--text-primary)">
                      {formatTimeAgo(location.created_at)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-(--text-secondary)">
                      Updated
                    </TableCell>
                    <TableCell className="text-(--text-primary)">
                      {formatTimeAgo(location.updated_at)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Devices */}
          <Card className="border-(--border)">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                Devices ({locationDevices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-(--text-secondary)">Online</span>
                  <span className="font-semibold text-green-600">{devicesOnline}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-(--text-secondary)">Offline</span>
                  <span className="font-semibold text-red-600">{devicesOffline}</span>
                </div>
              </div>

              {locationDevices.length ? (
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationDevices.map((device) => (
                        <TableRow 
                          key={device.id}
                          className="cursor-pointer hover:bg-(--hover)"
                          onClick={() => navigate(`/devices?id=${device.id}`)}
                        >
                          <TableCell className="font-medium text-(--text-primary)">
                            {device.hostname}
                          </TableCell>
                          <TableCell className="text-(--text-secondary)">{device.ip}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                device.status
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {device.status ? "Online" : "Offline"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-(--text-secondary) py-4">
                  No devices found
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE - EVENTS + GRAPHS */}
        <div className="flex flex-col gap-2 w-2/3 overflow-y-auto">
          {/* Recent Events */}
          <Card className="border-(--border)">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {recentEvents.map((event, i) => (
                  <div
                    key={i}
                    className="border-l-4 border-blue-500 pl-3 py-2 bg-(--card) rounded"
                  >
                    <p className="text-sm font-medium text-(--text-primary)">{event.timestamp}</p>
                    <p className="text-sm text-(--text-secondary) mt-1">{event.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Location Availability Graph */}
          <Card className="border-(--border)">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Location Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center bg-(--muted) rounded border border-(--border)">
                <p className="text-(--text-secondary)">Graph placeholder</p>
              </div>
            </CardContent>
          </Card>

          {/* Devices Availability Graph */}
          <Card className="border-(--border)">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Devices Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: 'Devices',
                        Online: devicesOnline,
                        Offline: devicesOffline,
                      }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Online" fill="#22c55e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Offline" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-(--card) rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-(--border)">
              <h2 className="text-lg font-semibold text-(--text-primary)">
                Location Map - {location.name}
              </h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
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
          </div>
        </div>
      )}
    </div>
  );
}