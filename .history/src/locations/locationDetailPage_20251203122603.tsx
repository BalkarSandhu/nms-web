import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocations } from '@/store/locationsSlice';
import { fetchDevices } from '@/store/deviceSlice';
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, X } from 'lucide-react';
import MapViewer from '../dashboard/local-components/Map-Viewer';
import type { MapDataPoint, MapConnection } from '../dashboard/local-components/Map-Viewer';

// Header Component
function Header({ locationName, onBack }: { locationName: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-(--hover) transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-semibold text-(--text-primary)">
          {locationName}
        </h1>
      </div>
    </div>
  );
}

// Location Content Component
function LocationContent({
  locationData,
  locationStatusData,
  devices,
  onDeviceClick,
  onViewMap
}: {
  locationData: Array<{ label: string; value: any }>;
  locationStatusData: Array<{ status: 0 | 1 | 2; message: string; timestamp: string }>;
  devices: Array<{ id: number; hostname: string; ip: string; status: boolean }>;
  onDeviceClick: (deviceId: number) => void;
  onViewMap?: () => void;
}) {
  return (
    <div className="flex w-full h-full gap-4 overflow-hidden">
      {/* LEFT COLUMN - Location Info */}
      <div className="flex flex-col gap-4 w-[45%] overflow-y-auto">
        <div className="bg-(--card) rounded-lg border border-(--border)">
          <div className="p-4 space-y-0">
            {locationData.map((field, index) => (
              <div 
                key={index}
                className="flex items-center py-3 border-b border-(--border) last:border-b-0"
              >
                <div className="text-sm font-medium text-(--text-secondary) uppercase tracking-wide w-1/3">
                  {field.label}
                </div>
                <div className="text-base text-(--text-primary) flex-1 text-right">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Devices Section */}
        {devices.length > 0 && (
          <div className="bg-(--card) rounded-lg p-4 border border-(--border)">
            <h2 className="text-lg font-semibold text-(--text-primary) mb-4">
              Devices ({devices.length})
            </h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-(--text-secondary)">Online</span>
                <span className="font-semibold text-green-600">
                  {devices.filter(d => d.status).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-(--text-secondary)">Offline</span>
                <span className="font-semibold text-red-600">
                  {devices.filter(d => !d.status).length}
                </span>
              </div>
            </div>

            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-(--hover) cursor-pointer transition-colors"
                  onClick={() => onDeviceClick(device.id)}
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
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - Status Events */}
      <div className="flex flex-col gap-4 w-[55%] overflow-y-auto">
        <div className="space-y-2">
          {locationStatusData.map((event, i) => {
            const bgColor = event.status === 1 ? 'bg-green-500' : event.status === 0 ? 'bg-red-500' : 'bg-yellow-500';
            
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
      </div>
    </div>
  );
}

// Main Component
export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const mapViewerRef = useRef(null);
  
  const locationId = id ? parseInt(id, 10) : null;
  
  const { locations, locationTypes } = useAppSelector(state => state.locations);
  const { devices } = useAppSelector(state => state.devices);
  const { workers } = useAppSelector(state => state.workers);
  
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

  if (!location) {
    return (
      <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
        <Header locationName="Location Not Found" onBack={() => navigate('/locations')} />
        <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
          No location information available for ID: {locationId}
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

  // Prepare location data similar to device data
  const locationData = useMemo(() => {
    if (!location) return [];

    const data = [
      { label: "System Name", value: location.name },
      { label: "Type", value: locationType?.name || "Unknown" },
      { 
        label: "Status", 
        value: (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            location.status === "online"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {location.status === 'online' ? 'Online' : 'Offline'}
          </span>
        )
      }
    ];

    if (worker) {
      data.push({ label: "Area", value: worker.hostname });
    }

    if (location.lat && location.lng) {
      data.push({ 
        label: "Coordinates", 
        value: (
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
        )
      });
    }

    data.push(
      { label: "Devices Online", value: devicesOnline },
      { label: "Devices Offline", value: devicesOffline },
      { label: "Total Devices", value: locationDevices.length },
      { label: "Created", value: formatTimeAgo(location.created_at) },
      { label: "Updated", value: formatTimeAgo(location.updated_at) }
    );

    return data;
  }, [location, locationType, worker, devicesOnline, devicesOffline, locationDevices.length]);

  // Prepare status data similar to device status data
  const locationStatusData = useMemo(() => {
    if (!location) return [];

    return [
      {
        status: (location.status === 'online' ? 1 : 0) as 0 | 1 | 2,
        message: location.status_reason || (location.status === 'online' ? 'Location is online' : 'Location is offline'),
        timestamp: new Date(location.updated_at || Date.now()).toLocaleString(),
      }
    ];
  }, [location]);

  // Prepare devices data for the component
  const devicesData = useMemo(() => {
    return locationDevices.map(device => ({
      id: device.id,
      hostname: device.hostname,
      ip: device.ip,
      status: device.status
    }));
  }, [locationDevices]);

  return (
    <div className="flex flex-col gap-2 w-full h-full p-4 bg-(--contrast)">
      <Header 
        locationName={location.name} 
        onBack={() => navigate('/locations')} 
      />
      <div className="flex w-full h-full">
        <LocationContent
          locationData={locationData}
          locationStatusData={locationStatusData}
          devices={devicesData}
          onDeviceClick={(deviceId) => navigate(`/devices?id=${deviceId}`)}
          onViewMap={() => setShowMapModal(true)}
        />
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