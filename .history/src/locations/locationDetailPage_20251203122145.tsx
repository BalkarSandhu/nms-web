import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocations } from '@/store/locationsSlice';
import { fetchDevices } from '@/store/deviceSlice';
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, X } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from './header'
import DeviceContent from './device-content';

import { useSearchParams } from 'react-router-dom';


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
    status: 0 | 1 | 2;
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
    if (locationId && location) {
      const events = [
        {
          status: location.status === 'online' ? 1 : 0,
          message: location.status_reason || (location.status === 'online' ? 'Location is online' : 'Location is offline'),
          timestamp: new Date(location.updated_at || Date.now()).toLocaleString(),
        } as { status: 0 | 1 | 2; message: string; timestamp: string }
      ];
      setRecentEvents(events);
    }
  }, [locationId, location]);

  if (!location) {
    return (
      <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
        <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
          <div className="text-center">
            <p className="text-lg mb-4">Location not found</p>
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

  // Field display component matching Device Info style
  const Field = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <div className="flex items-center py-3 border-b border-(--border)">
      <div className="text-sm font-medium text-(--text-secondary) uppercase tracking-wide w-1/3">
        {label}
      </div>
      <div className="text-base text-(--text-primary) flex-1 text-right">
        {value}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/locations')}
            className="p-2 rounded-full hover:bg-(--hover) transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-semibold text-(--text-primary)">
            {location.name}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full h-full gap-4 overflow-hidden">
        {/* LEFT COLUMN - Location Info */}
        <div className="flex flex-col gap-4 w-[45%] overflow-y-auto">
          {/* System Information */}
          <div className="bg-(--card) rounded-lg p-4 border border-(--border)">
            <div className="space-y-0">
              <Field label="System Name" value={location.name} />
              <Field label="Type" value={locationType?.name || "Unknown"} />
              <Field 
                label="Status" 
                value={
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    location.status === "online"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {location.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                }
              />
              {worker && <Field label="Area" value={worker.hostname} />}
              <Field 
                label="Coordinates" 
                value={
                  location.lat && location.lng ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-(--text-secondary)" />
                        <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMapModal(true)}
                      >
                        View on Map
                      </Button>
                    </div>
                  ) : "N/A"
                }
              />
              <Field label="Created" value={formatTimeAgo(location.created_at)} />
              <Field label="Updated" value={formatTimeAgo(location.updated_at)} />
            </div>
          </div>

          {/* Devices Section */}
          <div className="bg-(--card) rounded-lg p-4 border border-(--border)">
            <h2 className="text-lg font-semibold text-(--text-primary) mb-4">
              Devices ({locationDevices.length})
            </h2>
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

            {locationDevices.length > 0 && (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {locationDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-(--hover) cursor-pointer transition-colors"
                    onClick={() => navigate(`/devices?id=${device.id}`)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-(--text-primary)">
                        {device.hostname}
                      </span>
                      <span className="text-xs text-(--text-secondary)">{device.ip}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      device.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {device.status ? "Online" : "Offline"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Events & Graphs */}
        <div className="flex flex-col gap-4 w-[55%] overflow-y-auto">
          {/* Recent Events */}
          <div className="space-y-2">
            {recentEvents.map((event, i) => {
              const bgColor = event.status === 1 ? 'bg-green-500' : event.status === 0 ? 'bg-red-500' : 'bg-yellow-500';
              const textColor = event.status === 1 ? 'text-green-700' : event.status === 0 ? 'text-red-700' : 'text-yellow-700';
              
              return (
                <div
                  key={i}
                  className={`${bgColor} text-white rounded-lg p-4 flex items-center justify-between`}
                >
                  <div className="flex-1">
                    <p className="font-semibold">{event.message}</p>
                  </div>
                  <div className="text-sm opacity-90 ml-4">
                    {event.timestamp}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location Availability Graph */}
          <div className="bg-(--card) rounded-lg p-4 border border-(--border)">
            <h2 className="text-lg font-semibold text-(--text-primary) mb-4">
              Location Availability
            </h2>
            <div className="h-[250px] flex items-center justify-center bg-(--muted) rounded">
              <p className="text-(--text-secondary)">Graph placeholder</p>
            </div>
          </div>

          {/* Devices Availability Graph */}
          <div className="bg-(--card) rounded-lg p-4 border border-(--border)">
            <h2 className="text-lg font-semibold text-(--text-primary) mb-4">
              Devices Availability
            </h2>
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
          </div>
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





import { isDataStale } from '@/lib/auth';

export default function LocationInfoPage() {
    const [searchParams] = useSearchParams();
    const dispatch = useAppDispatch();
    const { devices, loading, lastFetched } = useAppSelector(state => state.devices);
    const deviceId = Number(searchParams.get('id'));
    const deviceInformation = devices.find(device => device.id === deviceId);

    useEffect(() => {
        // Only fetch if devices are not loaded OR data is stale (older than 5 minutes)
        if (!devices.length || isDataStale(lastFetched)) {
            dispatch(fetchAllDevices());
        }
    }, [dispatch, devices.length, lastFetched]);


    // Show loading state while fetching
    if (loading && devices.length === 0) {
        return(
            <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
                <Header />
                <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
                    Loading device information...
                </div>
            </div>
        )
    }

    // Show error if device not found after loading
    if(!deviceInformation) {
        return(
            <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
                <Header />
                <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
                    No device information available for ID: {deviceId}
                </div>
            </div>
        )
    }
    const deviceData = useMemo(() => {
        if (!deviceInformation) {
            return [
                { label: "Device Name", value: "Workstation-01" },
                { label: "Device Type", value: "Workstation" },
                { label: "IP Address", value: "192.168.1.100" }
            ];
        }

        return [
            { label: "Display Name", value: deviceInformation.display || deviceInformation.hostname || "N/A" },
            { label: "Hostname", value: deviceInformation.hostname || "N/A" },
            { label: "IP Address", value: `${deviceInformation.ip}:${deviceInformation.port}` },
            { label: "Protocol", value: deviceInformation.protocol || "N/A" },
            { label: "Device Type", value: deviceInformation.device_type?.name || "Unknown" },
            { label: "Location", value: deviceInformation.location?.name || "Unknown" },
            { label: "Worker", value: deviceInformation.worker?.hostname || "Unknown" },
            { label: "Status", value: deviceInformation.status ? "Online" : "Offline" },
            { label: "Status Reason", value: deviceInformation.status_reason || "N/A" },
            { label: "Check Interval (s)", value: deviceInformation.check_interval },
            { label: "Timeout (s)", value: deviceInformation.timeout },
            { label: "Last Ping", value: new Date(deviceInformation.last_ping).toLocaleString() },
            { label: "Created", value: new Date(deviceInformation.created_at).toLocaleString() },
            { label: "Updated", value: new Date(deviceInformation.updated_at).toLocaleString() }
        ];
    }, [deviceInformation]);

    const deviceStatusData = useMemo(() => {
        if (!deviceInformation) {
            return [
                { status: 1 as 0 | 1 | 2, message: "All systems operational", timestamp: "2024-10-01 10:00 AM" },
                { status: 0 as 0 | 1 | 2, message: "Device not reachable", timestamp: "2024-10-01 09:45 AM" }
            ];
        }

        return [
            {
                status: (deviceInformation.status ? 1 : 0) as 0 | 1 | 2,
                message: deviceInformation.status_reason || (deviceInformation.status ? 'Device is online' : 'Device is offline'),
                timestamp: new Date(deviceInformation.last_ping).toLocaleString(),
            },
            {
                status: (deviceInformation.disabled ? 2 : 1) as 0 | 1 | 2,
                message: deviceInformation.disabled ? 'Device is disabled' : 'Device is active',
                timestamp: new Date(deviceInformation.updated_at).toLocaleString(),
            }
        ];
    }, [deviceInformation]);

    return (
        <div className="flex flex-col gap-2 w-full h-full p-4 bg-(--contrast)">
            <Header />
            <div className="flex w-full h-full">
                <DeviceContent
                    deviceData={deviceData}
                    deviceStatusData={deviceStatusData}
                />
            </div>
            <div></div>
        </div>
    );
}

