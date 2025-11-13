import { useMemo, useState } from 'react';

//-- Redux
import { useAppSelector } from '@/store/hooks';

//--Local components
import LocationsFilters, { type FilterConfig } from './filters';
import LocationModifier from './location-modifier';

//-- ShadCN Components
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Enhanced location type with all related data
export type EnrichedLocation = {
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
    // Enriched fields
    type_name: string; // from LocationType
    worker_hostname?: string; // from Worker
    devices_online: number; // count of online devices at this location
    devices_offline: number; // count of offline devices at this location
    devices_total: number; // total devices at this location
    device_ids: number[]; // array of device IDs for sidebar access
};

/**
 * Custom hook to get enriched location data with all relationships
 * Can be used in sidebar or other components
 */
export const useEnrichedLocations = (): EnrichedLocation[] => {
    const { locations, locationTypes } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);
    const { devices } = useAppSelector(state => state.devices);

    return useMemo(() => {
        return locations.map((location) => {
            // Find location type name
            const locationType = locationTypes.find(lt => lt.id === location.location_type_id);
            const type_name = locationType?.name || locationType?.location_type || 'Unknown';

            // Find worker hostname (check if worker_id exists on location)
            const worker_id = (location as any).worker_id;
            const worker = worker_id ? workers.find(w => w.id === worker_id) : undefined;
            const worker_hostname = worker?.hostname;

            // Find devices at this location and count by status
            const locationDevices = devices.filter(device => device.location_id === location.id);
            const devices_online = locationDevices.filter(d => d.status === true).length;
            const devices_offline = locationDevices.filter(d => d.status === false).length;
            const devices_total = locationDevices.length;
            const device_ids = locationDevices.map(d => d.id);

            return {
                ...location,
                worker_id,
                type_name,
                worker_hostname,
                devices_online,
                devices_offline,
                devices_total,
                device_ids,
            };
        });
    }, [locations, locationTypes, workers, devices]);
};

export default function LocationsTable({ 
    onRowClick, 
    selectedLocationId 
}: { 
    onRowClick?: (locationId: number) => void;
    selectedLocationId?: number | null;
}) {
    // Use the custom hook to get enriched data
    const enrichedLocations = useEnrichedLocations();
    
    // State for filters
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Get unique values for filter options
    const filterOptions = useMemo(() => {
        const uniqueTypes = [...new Set(enrichedLocations.map(loc => loc.type_name))].sort();
        const uniqueStatuses = [...new Set(enrichedLocations.map(loc => loc.status))].sort();
        const uniqueProjects = [...new Set(enrichedLocations.map(loc => loc.project))].sort();
        const uniqueAreas = [...new Set(enrichedLocations.map(loc => loc.area))].sort();
        const uniqueWorkers = [...new Set(enrichedLocations.map(loc => loc.worker_hostname).filter(Boolean))].sort() as string[];

        return {
            types: uniqueTypes.map(type => ({ label: type, value: type })),
            statuses: uniqueStatuses.map(status => ({ label: status.charAt(0).toUpperCase() + status.slice(1), value: status })),
            projects: uniqueProjects.map(project => ({ label: project, value: project })),
            areas: uniqueAreas.map(area => ({ label: area, value: area })),
            workers: uniqueWorkers.map(worker => ({ label: worker, value: worker })),
        };
    }, [enrichedLocations]);

    // Create filter configs
    const filterConfigs: FilterConfig[] = [
        {
            label: "Type",
            key: "type",
            options: filterOptions.types,
        },
        {
            label: "Status",
            key: "status",
            options: filterOptions.statuses,
        },
        {
            label: "Project",
            key: "project",
            options: filterOptions.projects,
        },
        {
            label: "Area",
            key: "area",
            options: filterOptions.areas,
        },
        {
            label: "Worker",
            key: "worker",
            options: filterOptions.workers,
        },
    ];

    // Apply filters to locations
    const filteredLocations = useMemo(() => {
        return enrichedLocations.filter(location => {
            if (filters.type && location.type_name !== filters.type) return false;
            if (filters.status && location.status !== filters.status) return false;
            if (filters.project && location.project !== filters.project) return false;
            if (filters.area && location.area !== filters.area) return false;
            if (filters.worker && location.worker_hostname !== filters.worker) return false;
            return true;
        });
    }, [enrichedLocations, filters]);

    return (
        <div className="gap-4 w-full h-full bg-(--contrast) py-2">
            <LocationsFilters 
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
            />

            <Table>
                <TableCaption>List of all locations in the network.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Worker</TableHead>
                        <TableHead className="text-right">Devices</TableHead>
                        {/* No header for modifier */}
                        <TableHead className="w-8"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredLocations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center text-gray-500">
                                No locations found
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredLocations.map((location, index) => (
                            <TableRow 
                                key={location.id} 
                                className={`cursor-pointer transition-colors ${
                                    selectedLocationId === location.id 
                                        ? 'bg-blue-50 hover:bg-blue-100' 
                                        : 'hover:bg-gray-50'
                                }`}
                                onClick={() => onRowClick?.(location.id)}
                            >
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell className="font-medium">{location.name}</TableCell>
                                <TableCell>{location.location_type_id}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        location.status === 'online' 
                                            ? 'bg-green-100 text-green-800' 
                                            : location.status === 'offline'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {location.status}
                                    </span>
                                </TableCell>
                                <TableCell>{location.project}</TableCell>
                                <TableCell>{location.area}</TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {location.worker_id || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex flex-col items-end text-xs">
                                        <span className="text-green-600 font-medium">
                                            {location.devices_online} online
                                        </span>
                                        <span className="text-red-600">
                                            {location.devices_offline} offline
                                        </span>
                                        <span className="text-gray-500">
                                            {location.devices_total} total
                                        </span>
                                    </div>
                                </TableCell>
                                {/* LocationModifier as last cell, pass locationId */}
                                <TableCell>
                                    <LocationModifier locationId={location.id} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

