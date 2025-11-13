import { useMemo, useState } from 'react';

//-- Redux
import { useAppSelector } from '@/store/hooks';

//--Local components
import LocationsFilters, { type FilterConfig } from './filters';

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
import LocationsModifier from './location-modifier';

// Enhanced location type with all related data
export type EnrichedLocation = {
    id: number;
    hostname: string;
    ip: string;
    port: number;
    display: string;
    status: boolean;
    protocol: string;
    location_type_id: number;
    location_id: number;
    worker_id: string;
    imei: string;
    last_ping: string;
    last_ping_time_taken: number;
    consecutive_failures: number;
    check_interval: number;
    timeout: number;
    disabled: boolean;
    created_at: string;
    updated_at: string;
    status_reason: string;
    // Enriched fields
    location_type_name: string; // from LocationType
    location_name?: string; // from Location
    worker_hostname?: string; // from Worker
};

/**
 * Custom hook to get enriched location data with all relationships
 */
export const useEnrichedLocations = (): EnrichedLocation[] => {
    const { location, locationTypes } = useAppSelector(state => state.locations);
    const { locations } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);

    return useMemo(() => {
        return locations.map((locations) => {
            // Find location type name
            const locationType = locationTypes.find(dt => dt.id === location.location_type_id);
            const location_type_name = locationType?.name || 'Unknown';

            // Find location name
            const location = locations.find(l => l.id === location.location_id);
            const location_name = location?.name;

            // Find worker hostname
            const worker_id = (location as any).worker_id || '';
            const worker = workers.find(w => w.id === worker_id);
            const worker_hostname = worker?.hostname;

            return {
                ...location,
                worker_id,
                location_type_name,
                location_name,
                worker_hostname,
            };
        });
    }, [locations, locationTypes, locations, workers]);
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
        const uniqueTypes = [...new Set(enrichedLocations.map(dev => dev.location_type_name))].sort();
        const uniqueStatuses = [...new Set(enrichedLocations.map(dev => dev.status ? 'Online' : 'Offline'))].sort();
        const uniqueLocations = [...new Set(enrichedLocations.map(dev => dev.location_name).filter(Boolean))].sort() as string[];
        const uniqueWorkers = [...new Set(enrichedLocations.map(dev => dev.worker_hostname).filter(Boolean))].sort() as string[];
        const uniqueProtocols = [...new Set(enrichedLocations.map(dev => dev.protocol.toUpperCase()))].sort();

        return {
            types: uniqueTypes.map(type => ({ label: type, value: type })),
            statuses: uniqueStatuses.map(status => ({ label: status, value: status })),
            locations: uniqueLocations.map(location => ({ label: location, value: location })),
            workers: uniqueWorkers.map(worker => ({ label: worker, value: worker })),
            protocols: uniqueProtocols.map(protocol => ({ label: protocol, value: protocol })),
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
            label: "Location",
            key: "location",
            options: filterOptions.locations,
        },
        {
            label: "Worker",
            key: "worker",
            options: filterOptions.workers,
        },
        {
            label: "Protocol",
            key: "protocol",
            options: filterOptions.protocols,
        },
    ];

    // Apply filters to locations
    const filteredLocations = useMemo(() => {
        return enrichedLocations.filter(location => {
            if (filters.type && location.location_type_name !== filters.type) return false;
            if (filters.status && (location.status ? 'Online' : 'Offline') !== filters.status) return false;
            if (filters.location && location.location_name !== filters.location) return false;
            if (filters.worker && location.worker_hostname !== filters.worker) return false;
            if (filters.protocol && location.protocol.toUpperCase() !== filters.protocol) return false;
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
                        <TableHead>IP</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Worker</TableHead>
                        <TableHead className="text-right">Failures</TableHead>
                        <TableHead className="text-center">Actions</TableHead>

                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredLocations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500">
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
                                <TableCell className="font-medium">
                                    <div>
                                        <p className="font-semibold">{location.display}</p>
                                        <p className="text-xs text-gray-500">{location.hostname}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{location.ip}:{location.port}</TableCell>
                                <TableCell>{location.location_type_id}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        location.status 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {location.status ? 'Online' : 'Offline'}
                                    </span>
                                </TableCell>
                                <TableCell>{location.location_id || 'N/A'}</TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {location.worker_id || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        location.consecutive_failures === 0 
                                            ? 'bg-green-100 text-green-800' 
                                            : location.consecutive_failures < 3
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {location.consecutive_failures}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                <LocationsModifier
                                    locationId={location.id}
                                    onEdit={(id) => console.log("Edit location", id)}
                                    onDelete={(id) => console.log("Delete location", id)}
                                />
                                </TableCell>


                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
