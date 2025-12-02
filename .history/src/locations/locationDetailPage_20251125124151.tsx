import { useEffect, useState } from 'react';
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
import { ArrowLeft, MapPin, Activity, Clock, Server } from 'lucide-react';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const locationId = id ? parseInt(id, 10) : null;
  
  const { locations, locationTypes } = useAppSelector(state => state.locations);
  const { devices } = useAppSelector(state => state.devices);
  const { workers } = useAppSelector(state => state.workers);
  
  const [recentEvents, setRecentEvents] = useState<Array<{
    timestamp: string;
    message: string;
  }>>([]);

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

  return (
  <div className="min-h-screen bg-gray-100 p-1">

    {/* Top Bar */}
    <div className="flex items-center gap-1 mb-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/locations')}
        className="gap-1 hover:bg-gray-200 border-1"
      >
        <ArrowLeft className="h-4 w-4 onHover" />
      </Button>

      <h1 className="text-xl font-semibold  text-gray-900 tracking-tight">
        {location.name}
      </h1>
    </div>

    {/* Main Grid Layout */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">

      {/* LEFT SIDEBAR - SYSTEM INFO + DEVICES */}
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
                        location.status === "online"
                          ? "bg-green-100 text-green-700"
                          : location.status === "offline"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {location.status}
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

                {/* Location Coordinates with Map Button */}
                <TableRow>
                  <TableCell className="font-medium text-gray-700">
                    Coordinates
                  </TableCell>

                  <TableCell>
                    {location.lat && location.lng ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-gray-900">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-fit"
                          onClick={() =>
                            window.open(
                              `http://103.208.173.228/India/India.pmtiles/?q=${location.lat},${location.lng}`,
                              "_blank"
                            )
                          }
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
                    {locationDevices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium text-gray-900">
                          {device.hostname}
                        </TableCell>
                        <TableCell className="text-gray-700">{device.ip}</TableCell>
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
              <p className="text-center text-gray-500 py-4">
                No devices found
              </p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* RIGHT SIDE - EVENTS + GRAPHS */}
      <div className="lg:col-span-2 space-y-2">

        {/* Recent Events */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-1 text-lg font-semibold">
              <Clock className="h-5 w-5 text-gray-600" />
              Recent Events
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="max-h-[300px] overflow-y-auto thin-scroll space-y-2">
              {recentEvents.map((event, i) => (
                <div
                  key={i}
                  className="border-l-4 border-blue-500 pl-3 py-2 bg-white rounded shadow-sm"
                >
                  <p className="text-sm font-medium text-gray-900">{event.timestamp}</p>
                  <p className="text-sm text-gray-600 mt-1">{event.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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