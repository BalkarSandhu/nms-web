import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import LocationsFilters, { type FilterConfig } from './filters';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export type EnrichedLocation = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    status: string;
    
    status_reason: string;
    location_type_id: number;
    project: string;
    area: string;
    worker_id?: string;
    created_at?: string;
    updated_at?: string;
    type_name: string;
    worker_hostname?: string;
    devices_online: number;
    devices_offline: number;
    devices_total: number;
    device_ids: number[];
};


export const useEnrichedLocations = (): EnrichedLocation[] => {
    const { locations, locationTypes } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);
    const { devices } = useAppSelector(state => state.devices);
    const normalizeStatus = (status: any): boolean | 'false' => {
  if (status === 'unknown' || status === 'Unknown' || status === null || status === undefined) {
    return false;
  }
  return status;
};

    return useMemo(() => {
        return locations.map((location) => {
            const locationType = locationTypes.find(lt => lt.id === location.location_type_id);
            const type_name = locationType?.name || locationType?.location_type || 'Unknown';

            const worker_id = (location as any).worker_id;
            const worker = worker_id ? workers.find(w => w.id === worker_id) : undefined;
            const worker_hostname = worker?.name;

            const locationDevices = devices.filter(device => device.location_id === location.id);
            // const devices_online = locationDevices.filter(d => d.is_reachable === true).length;
            const devices_online = locationDevices.filter(d => normalizeStatus(d.is_reachable) === true).length;

            const devices_offline = locationDevices.filter(d => normalizeStatus(d.is_reachable) === false).length;
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

    // React to changes in search params - update filters when URL changes
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

    // Handle location ID from URL
    useEffect(() => {
        try {
            const locationIdFromUrl = searchParams.get('id');
            const locationId = locationIdFromUrl ? parseInt(locationIdFromUrl, 10) : null;
            
            if (locationId !== null && !isNaN(locationId) && !hasProcessedUrlId) {
                setLocalSelectedId(locationId);
                onRowClick?.(locationId);
                setHasProcessedUrlId(true);
                
                // Scroll to the selected location row after a short delay
                setTimeout(() => {
                    const element = document.querySelector(`[data-location-id="${locationId}"]`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            } else if (locationId === null && hasProcessedUrlId) {
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
        <div className="gap-4 w-full h-full bg-(--contrast) py-2">
            <LocationsFilters 
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
            />

            <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                        <TableRow className="border-b-2 border-gray-200">
                            <TableHead className="w-[5%] font-semibold text-gray-700 text-center py-3">No.</TableHead>
                            <TableHead className="w-[30%] font-semibold text-gray-700 py-3">Location Name</TableHead>
                            <TableHead className="w-[14%] font-semibold text-gray-700 py-3">Type</TableHead>
                            <TableHead className="w-[16%] font-semibold text-gray-700 py-3">Area</TableHead>
                            <TableHead className="w-[15%] font-semibold text-gray-700 text-center py-3">Location Status</TableHead>

                            <TableHead className="w-[20%] font-semibold text-gray-700 py-3">Devices</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLocations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-500 py-12">
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
                                    <TableCell className="text-center text-sm font-medium text-gray-600 py-2">
                                        {index + 1}
                                    </TableCell>
                                    
                                    <TableCell className="font-medium py-2">
                                        <span className={`text-sm font-semibold ${
                                            localSelectedId === location.id ? 'text-blue-900' : 'text-gray-900'
                                        }`} title={location.name}>
                                            {location.name}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="py-2">
                                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${
                                            localSelectedId === location.id 
                                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                            {location.type_name}
                                        </span>
                                    </TableCell>
                                    
                                    
                                    
                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className={`text-sm ${
                                                localSelectedId === location.id ? 'text-blue-800' : 'text-gray-700'
                                            }`} title={location.area}>
                                                {location.area}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-2">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                location.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                            }`}></span>
                                            <span className={`text-xs font-semibold ${
                                                location.status === 'online' ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                                {location.status === 'online' ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                                                <span className="text-green-600 font-medium">
                                                    {location.devices_online} online
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                                                <span className="text-red-600 font-medium">
                                                    {location.devices_offline} offline
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                                                <span className="text-gray-600">
                                                    {location.devices_total} total
                                                </span>
                                            </div>
                                        </div>
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