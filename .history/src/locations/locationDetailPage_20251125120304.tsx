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
        { timestamp: '2025-11-25 10:52:05', message: 'Device status changed to Up from icmp check.' },
        { timestamp: '2025-11-25 10:21:05', message: 'Device status changed to Down from icmp check.' },
        { timestamp: '2025-11-25 08:07:04', message: 'Device status changed to Up from icmp check.' },
        { timestamp: '2025-11-25 08:06:04', message: 'Device status changed to Down from icmp check.' },
      ];
      setRecentEvents(mockEvents);
    }
  }, [locationId]);

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
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/locations')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{location.name}</h1>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-1 space-y-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/3">System Name</TableCell>
                    <TableCell>{location.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Location Type</TableCell>
                    <TableCell>{locationType?.name || locationType?.location_type || 'Unknown'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Status</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        location.status === 'online' ? 'bg-green-100 text-green-800' :
                        location.status === 'offline' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {location.status}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Project</TableCell>
                    <TableCell>{location.project}</TableCell>
                  </TableRow>
                  {worker && (
                    <TableRow>
                      <TableCell className="font-medium">Area</TableCell>
                      <TableCell>{worker.hostname}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">Location</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {location.lat && location.lng ? (
                        <>
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                          <Button 
                            variant="link" 
                            size="sm"
                            onClick={() => window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')}
                          >
                            View on Map
                          </Button>
                        </>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Created</TableCell>
                    <TableCell>{formatTimeAgo(location.created_at)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Last Updated</TableCell>
                    <TableCell>{formatTimeAgo(location.updated_at)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Devices ({locationDevices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Online:</span>
                  <span className="font-semibold text-green-600">{devicesOnline}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Offline:</span>
                  <span className="font-semibold text-red-600">{devicesOffline}</span>
                </div>
              </div>
              
              {locationDevices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationDevices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.hostname}</TableCell>
                        <TableCell>{device.ip}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            device.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {device.status ? 'Online' : 'Offline'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500 py-4">No devices at this location</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentEvents.map((event, index) => (
                  <div key={index} className="flex gap-3 border-l-4 border-blue-500 pl-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.timestamp}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}