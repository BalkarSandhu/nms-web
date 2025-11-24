import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';


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

// Helper function to get location ID from URL
const getLocationIdFromUrl = (searchParams: URLSearchParams): number | null => {
    const idParam = searchParams.get('id');
    if (idParam) {
        const id = parseInt(idParam, 10);
        return isNaN(id) ? null : id;
    }
    return null;
};

export default function LocationsTable({ 
    onRowClick, 
    selectedLocationId,
    onDataChange
}: { 
    onRowClick?: (locationId: number) => void;
    selectedLocationId?: number | null;
    onDataChange?: (rows: EnrichedLocation[]) => void;
}) {
    // Use the custom hook to get enriched data
    const enrichedLocations = useEnrichedLocations();
    const [searchParams] = useSearchParams();
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedLocationId || null);
    const [hasProcessedUrlId, setHasProcessedUrlId] = useState(false);
    
    // State for filters
    const [filters, setFilters] = useState<Record<string, string>>(() => {
        // Initialize from the URL so child `LocationsFilters` receives initialFilters correctly
        try {
            const params = new URLSearchParams(window.location.search);
            const statusParam = params.get('status');
            const init: Record<string, string> = {};
            if (statusParam) {
                const normalized = String(statusParam).toLowerCase();
                init.status = normalized;
            }
            return init;
        } catch (e) {
            return {};
        }
    });

    // React to changes in the search params for filters
    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam) {
            const normalized = String(statusParam).toLowerCase();
            setFilters(prev => ({ ...prev, status: normalized }));
        } else {
            // If param removed, clear the status filter
            setFilters(prev => {
                const copy = { ...prev };
                delete copy.status;
                return copy;
            });
        }
    }, [searchParams]);

    // Handle location ID from URL for navigation from dashboard
    useEffect(() => {
        try {
            const locationIdFromUrl = getLocationIdFromUrl(searchParams);
            console.log('Location ID from URL:', locationIdFromUrl);
            
            if (locationIdFromUrl !== null && !hasProcessedUrlId) {
                setLocalSelectedId(locationIdFromUrl);
                onRowClick?.(locationIdFromUrl);
                setHasProcessedUrlId(true);
                
                // Scroll to the selected location row
                setTimeout(() => {
                    const element = document.querySelector(`[data-location-id="${locationIdFromUrl}"]`);
                    console.log('Found element to scroll to:', element);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            } else if (locationIdFromUrl === null && hasProcessedUrlId) {
                setHasProcessedUrlId(false);
            }
        } catch (e) {
            console.error('Error handling location ID from URL:', e);
        }
    }, [searchParams, onRowClick, hasProcessedUrlId]);

    // Update local selected ID when prop changes
    useEffect(() => {
        setLocalSelectedId(selectedLocationId || null);
    }, [selectedLocationId]);

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

    useEffect(() => {
        onDataChange?.(filteredLocations)
    }, [filteredLocations, onDataChange])

    // Handle row click
    const handleRowClick = (locationId: number) => {
        setLocalSelectedId(locationId);
        onRowClick?.(locationId);
    };

    return (
        <div className="gap-4 w-full h-full bg-(--contrast) py-2">
            <LocationsFilters 
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
            />

            <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                    <TableCaption>List of all locations in the network.</TableCaption>
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                        <TableRow className="border-b-2 border-gray-200">
                            <TableHead className="w-[5%] font-semibold text-gray-700 text-center">S.No</TableHead>
                            <TableHead className="w-[20%] font-semibold text-gray-700">Name</TableHead>
                            <TableHead className="w-[15%] font-semibold text-gray-700">Type</TableHead>
                            <TableHead className="w-[12%] font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="w-[15%] font-semibold text-gray-700">Project</TableHead>
                            <TableHead className="w-[15%] font-semibold text-gray-700">Area</TableHead>
                            <TableHead className="w-[13%] font-semibold text-gray-700 text-right">Devices</TableHead>
                            <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLocations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-sm font-medium">No locations found</p>
                                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLocations.map((location, index) => (
                                <TableRow 
                                    key={location.id}
                                    data-location-id={location.id}
                                    className={`cursor-pointer transition-all duration-150 border-b border-gray-100 ${
                                        localSelectedId === location.id 
                                            ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleRowClick(location.id)}
                                >
                                    <TableCell className="text-center text-sm font-medium text-gray-600">
                                        {index + 1}
                                    </TableCell>
                                    
                                    <TableCell className="font-medium break-words overflow-hidden">
                                        <span className={`text-sm font-semibold ${
                                            localSelectedId === location.id ? 'text-blue-900' : 'text-gray-900'
                                        }`} title={location.name}>
                                            {location.name}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="break-words overflow-hidden">
                                        <span className={`text-sm ${
                                            localSelectedId === location.id ? 'text-blue-800' : 'text-gray-700'
                                        }`}>
                                            {location.type_name}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="break-words overflow-hidden">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                            location.status === 'online' ? 'bg-green-100 text-green-800' :
                                            location.status === 'offline' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {location.status === 'unknown' ? '---' : location.status}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="break-words overflow-hidden">
                                        <span className={`text-sm ${
                                            localSelectedId === location.id ? 'text-blue-800' : 'text-gray-700'
                                        }`} title={location.project}>
                                            {location.project}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="break-words overflow-hidden">
                                        <span className={`text-sm ${
                                            localSelectedId === location.id ? 'text-blue-800' : 'text-gray-700'
                                        }`} title={location.area}>
                                            {location.area}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="text-right break-words overflow-hidden">
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
                                    
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <LocationModifier locationId={location.id} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}