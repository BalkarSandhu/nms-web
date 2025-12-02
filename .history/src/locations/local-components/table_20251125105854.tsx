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
    type_name: string;
    worker_hostname?: string;
    devices_online: number;
    devices_offline: number;
    devices_total: number;
    device_ids: number[];
};

/**
 * Custom hook to get enriched location data with all relationships
 */
export const useEnrichedLocations = (): EnrichedLocation[] => {
    const { locations, locationTypes } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);
    const { devices } = useAppSelector(state => state.devices);

    return useMemo(() => {
        return locations.map((location) => {
            const locationType = locationTypes.find(lt => lt.id === location.location_type_id);
            const type_name = locationType?.name || locationType?.location_type || 'Unknown';

            const worker_id = (location as any).worker_id;
            const worker = worker_id ? workers.find(w => w.id === worker_id) : undefined;
            const worker_hostname = worker?.hostname;

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
    const enrichedLocations = useEnrichedLocations();
    const [searchParams] = useSearchParams();
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedLocationId || null);
    const [hasProcessedUrlId, setHasProcessedUrlId] = useState(false);
    
    const [filters, setFilters] = useState<Record<string, string>>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const statusParam = params.get('status');
            const init: Record<string, string> = {};
            if (statusParam) {
                init.status = String(statusParam).toLowerCase();
            }
            return init;
        } catch {
            return {};
        }
    });

    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam) {
            setFilters(prev => ({ ...prev, status: String(statusParam).toLowerCase() }));
        } else {
            setFilters(prev => {
                const { status, ...rest } = prev;
                return rest;
            });
        }
    }, [searchParams]);

    useEffect(() => {
        try {
            const locationIdFromUrl = getLocationIdFromUrl(searchParams);
            
            if (locationIdFromUrl !== null && !hasProcessedUrlId) {
                setLocalSelectedId(locationIdFromUrl);
                onRowClick?.(locationIdFromUrl);
                setHasProcessedUrlId(true);
                
                setTimeout(() => {
                    const element = document.querySelector(`[data-location-id="${locationIdFromUrl}"]`);
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

    useEffect(() => {
        setLocalSelectedId(selectedLocationId || null);
    }, [selectedLocationId]);

    const filterOptions = useMemo(() => {
        const uniqueTypes = [...new Set(enrichedLocations.map(loc => loc.type_name))].sort();
        const uniqueStatuses = [...new Set(enrichedLocations.map(loc => loc.status))].sort();
        const uniqueProjects = [...new Set(enrichedLocations.map(loc => loc.project))].sort();
        const uniqueAreas = [...new Set(enrichedLocations.map(loc => loc.area))].sort();

        return {
            types: uniqueTypes.map(type => ({ label: type, value: type })),
            statuses: uniqueStatuses.map(status => ({ 
                label: status.charAt(0).toUpperCase() + status.slice(1), 
                value: status 
            })),
            projects: uniqueProjects.map(project => ({ label: project, value: project })),
            areas: uniqueAreas.map(area => ({ label: area, value: area })),
        };
    }, [enrichedLocations]);

    const filterConfigs: FilterConfig[] = [
        { label: "Type", key: "type", options: filterOptions.types },
        { label: "Status", key: "status", options: filterOptions.statuses },
        { label: "Project", key: "project", options: filterOptions.projects },
        { label: "Area", key: "area", options: filterOptions.areas }
    ];

    const filteredLocations = useMemo(() => {
        return enrichedLocations.filter(location => {
            if (filters.type && location.type_name !== filters.type) return false;
            if (filters.status && location.status !== filters.status) return false;
            if (filters.project && location.project !== filters.project) return false;
            if (filters.area && location.area !== filters.area) return false;
            return true;
        });
    }, [enrichedLocations, filters]);

    useEffect(() => {
        onDataChange?.(filteredLocations);
    }, [filteredLocations, onDataChange]);

    const handleRowClick = (locationId: number) => {
        setLocalSelectedId(locationId);
        onRowClick?.(locationId);
    };

    return (
        <div className="w-full h-full py-2">
            <LocationsFilters 
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
            />

            <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                    <TableCaption>A list of all locations in the network.</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[8%] text-center">S.No</TableHead>
                            <TableHead className="w-[20%]">Name</TableHead>
                            <TableHead className="w-[15%]">Type</TableHead>
                            <TableHead className="w-[12%]">Status</TableHead>
                            <TableHead className="w-[18%]">Area</TableHead>
                            <TableHead className="w-[20%] text-right">Devices</TableHead>
                            <TableHead className="w-[7%]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLocations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="font-medium">No locations found</p>
                                        <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLocations.map((location, index) => (
                                <TableRow 
                                    key={location.id}
                                    data-location-id={location.id}
                                    className={`cursor-pointer ${
                                        localSelectedId === location.id 
                                            ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500' 
                                            : ''
                                    }`}
                                    onClick={() => handleRowClick(location.id)}
                                >
                                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                                    
                                    <TableCell className="font-medium break-words">
                                        {location.name}
                                    </TableCell>
                                    
                                    <TableCell className="break-words">{location.type_name}</TableCell>
                                    
                                    <TableCell className="break-words">
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                            location.status === 'online' ? 'bg-green-100 text-green-800' :
                                            location.status === 'offline' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {location.status === 'unknown' ? '---' : location.status}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="break-words">{location.area}</TableCell>
                                    
                                    <TableCell className="text-right break-words">
                                        <div className="flex flex-col items-end text-xs space-y-1">
                                            <span className="text-green-600 font-medium">
                                                {location.devices_online} online
                                            </span>
                                            <span className="text-red-600">
                                                {location.devices_offline} offline
                                            </span>
                                            <span className="text-muted-foreground">
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