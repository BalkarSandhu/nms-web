# Using Enriched Location Data

## Overview
The `table.tsx` component provides a custom hook `useEnrichedLocations()` that combines data from multiple Redux slices to create enriched location data with all relationships resolved.

## What Data is Available

Each enriched location includes:

```typescript
{
    // Original Location fields
    id: number;
    name: string;
    lat: number;
    lng: number;
    status: string;
    status_reason: string;
    location_type_id: number;
    project: string;
    area: string;
    worker_id?: string;
    created_at?: string;
    updated_at?: string;
    
    // Enriched fields (resolved relationships)
    type_name: string;           // LocationType name (via location_type_id)
    worker_hostname?: string;    // Worker hostname (via worker_id)
    devices_online: number;      // Count of online devices
    devices_offline: number;     // Count of offline devices
    devices_total: number;       // Total device count
    device_ids: number[];        // Array of device IDs for further queries
}
```

## Usage in Components

### Example: Sidebar Component

```tsx
import { useEnrichedLocations, type EnrichedLocation } from './table';
import { useAppSelector } from '@/store/hooks';

function LocationSidebar({ selectedLocationId }: { selectedLocationId?: number }) {
    const enrichedLocations = useEnrichedLocations();
    const { devices } = useAppSelector(state => state.devices);
    
    // Find the selected location
    const selectedLocation = enrichedLocations.find(loc => loc.id === selectedLocationId);
    
    if (!selectedLocation) {
        return <div>No location selected</div>;
    }
    
    // Get full device details for this location
    const locationDevices = devices.filter(device => 
        selectedLocation.device_ids.includes(device.id)
    );
    
    return (
        <div className="p-4">
            <h2 className="text-xl font-bold">{selectedLocation.name}</h2>
            
            <div className="mt-4">
                <h3 className="font-semibold">Details</h3>
                <p>Type: {selectedLocation.type_name}</p>
                <p>Project: {selectedLocation.project}</p>
                <p>Area: {selectedLocation.area}</p>
                <p>Status: {selectedLocation.status}</p>
                {selectedLocation.worker_hostname && (
                    <p>Worker: {selectedLocation.worker_hostname}</p>
                )}
            </div>
            
            <div className="mt-4">
                <h3 className="font-semibold">Devices ({selectedLocation.devices_total})</h3>
                <p className="text-green-600">{selectedLocation.devices_online} Online</p>
                <p className="text-red-600">{selectedLocation.devices_offline} Offline</p>
                
                <div className="mt-2">
                    {locationDevices.map(device => (
                        <div key={device.id} className="border p-2 rounded mb-2">
                            <p className="font-medium">{device.display}</p>
                            <p className="text-sm text-gray-600">{device.ip}</p>
                            <p className={`text-xs ${device.status ? 'text-green-600' : 'text-red-600'}`}>
                                {device.status ? 'Online' : 'Offline'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

### Example: Device Details Component

```tsx
import { useEnrichedLocations } from './table';
import { useAppSelector } from '@/store/hooks';

function DeviceDetailsCard({ deviceId }: { deviceId: number }) {
    const enrichedLocations = useEnrichedLocations();
    const { devices } = useAppSelector(state => state.devices);
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) return null;
    
    // Find the location this device belongs to
    const location = enrichedLocations.find(loc => 
        loc.device_ids.includes(deviceId)
    );
    
    return (
        <div className="card">
            <h3>{device.display}</h3>
            <p>IP: {device.ip}</p>
            <p>Status: {device.status ? 'Online' : 'Offline'}</p>
            
            {location && (
                <div className="mt-2 border-t pt-2">
                    <p className="text-sm font-semibold">Location Details</p>
                    <p className="text-sm">{location.name}</p>
                    <p className="text-xs text-gray-600">{location.area}, {location.project}</p>
                    <p className="text-xs">Type: {location.type_name}</p>
                    <p className="text-xs">
                        Other devices here: {location.devices_total - 1} 
                        ({location.devices_online} online)
                    </p>
                </div>
            )}
        </div>
    );
}
```

### Example: Statistics Dashboard

```tsx
import { useEnrichedLocations } from './table';

function LocationStatistics() {
    const enrichedLocations = useEnrichedLocations();
    
    const stats = {
        totalLocations: enrichedLocations.length,
        totalDevices: enrichedLocations.reduce((sum, loc) => sum + loc.devices_total, 0),
        onlineDevices: enrichedLocations.reduce((sum, loc) => sum + loc.devices_online, 0),
        offlineDevices: enrichedLocations.reduce((sum, loc) => sum + loc.devices_offline, 0),
        locationsWithWorkers: enrichedLocations.filter(loc => loc.worker_hostname).length,
        locationsByType: enrichedLocations.reduce((acc, loc) => {
            acc[loc.type_name] = (acc[loc.type_name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };
    
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
                <h3>Total Locations</h3>
                <p className="text-3xl">{stats.totalLocations}</p>
            </div>
            <div className="stat-card">
                <h3>Total Devices</h3>
                <p className="text-3xl">{stats.totalDevices}</p>
            </div>
            <div className="stat-card">
                <h3>Online Devices</h3>
                <p className="text-3xl text-green-600">{stats.onlineDevices}</p>
            </div>
            <div className="stat-card">
                <h3>Offline Devices</h3>
                <p className="text-3xl text-red-600">{stats.offlineDevices}</p>
            </div>
        </div>
    );
}
```

## Key Benefits

1. **Single Source of Truth**: Use the same enriched data across all components
2. **Automatic Updates**: Data updates when any Redux slice changes
3. **Optimized Performance**: Uses `useMemo` for efficient re-renders
4. **Easy Device Access**: `device_ids` array allows quick filtering of devices
5. **No Prop Drilling**: Access data directly via the hook

## Data Relationships

```
Location
  ├─ location_type_id → LocationType.name (type_name)
  ├─ worker_id → Worker.hostname (worker_hostname)
  └─ id → Device.location_id (device_ids, devices_online, devices_offline)
```
