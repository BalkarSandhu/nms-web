import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/store/hooks';
import DevicesFilters, { type FilterConfig } from './filters';

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import DevicesModifier from './devices-modifier';

export type EnrichedDevice = {
    id: number;
    hostname: string;
    ip: string;
    port: number;
    display: string;
    status: boolean;
    protocol: string;
    device_type_id: number;
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
    device_type_name: string;
    location_name?: string;
    worker_hostname?: string;
};

export const useEnrichedDevices = (): EnrichedDevice[] => {
    const { devices, deviceTypes } = useAppSelector(state => state.devices);
    const { locations } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);

    return useMemo(() => {
        return devices.map((device) => {
            const deviceType = deviceTypes.find(dt => dt.id === device.device_type_id);
            const device_type_name = deviceType?.name || 'Unknown';

            const location = locations.find(l => l.id === device.location_id);
            const location_name = location?.name;

            const worker_id = (device as any).worker_id || '';
            const worker = workers.find(w => w.id === worker_id);
            const worker_hostname = worker?.hostname;

            return {
                ...device,
                worker_id,
                device_type_name,
                location_name,
                worker_hostname,
            };
        });
    }, [devices, deviceTypes, locations, workers]);
};

// Helper function to parse URL parameters into filters
const parseUrlFilters = (searchParams: URLSearchParams): Record<string, string> => {
    const init: Record<string, string> = {};
    
    const typeParam = searchParams.get('type');
    if (typeParam) {
        init.type = typeParam;
    }
    
    const statusParam = searchParams.get('status');
    if (statusParam) {
        const normalized = String(statusParam).toLowerCase();
        if (normalized === 'online' || normalized === 'offline') {
            init.status = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }
    }
    
    const locationParam = searchParams.get('location');
    if (locationParam) {
        init.location = locationParam;
    }
    
    const workerParam = searchParams.get('worker');
    if (workerParam) {
        init.worker = workerParam;
    }
    
    const protocolParam = searchParams.get('protocol');
    if (protocolParam) {
        init.protocol = protocolParam;
    }
    
    return init;
};

export default function DevicesTable({ 
    onRowClick, 
    selectedDeviceId,
    onDataChange
}: { 
    onRowClick?: (deviceId: number) => void;
    selectedDeviceId?: number | null;
    onDataChange?: (rows: EnrichedDevice[]) => void;
}) {
    const enrichedDevices = useEnrichedDevices();
    const [searchParams] = useSearchParams();
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedDeviceId || null);
    
    // Initialize filters from URL parameters
    const [filters, setFilters] = useState<Record<string, string>>(() => {
        try {
            return parseUrlFilters(searchParams);
        } catch (e) {
            return {};
        }
    });

    // React to changes in search params - update filters when URL changes
    useEffect(() => {
        try {
            const newFilters = parseUrlFilters(searchParams);
            setFilters(newFilters);
            console.log('Updated filters from URL:', newFilters);
        } catch (e) {
            console.error('Error parsing search params:', e);
        }
    }, [searchParams]);

    // Update local selected ID when prop changes
    useEffect(() => {
        setLocalSelectedId(selectedDeviceId || null);
    }, [selectedDeviceId]);

    // Get unique values for filter options
    const filterOptions = useMemo(() => {
        const uniqueTypes = [...new Set(enrichedDevices.map(dev => dev.device_type_name))].sort();
        const uniqueStatuses = [...new Set(enrichedDevices.map(dev => dev.status ? 'Online' : 'Offline'))].sort();
        const uniqueLocations = [...new Set(enrichedDevices.map(dev => dev.location_name).filter(Boolean))].sort() as string[];
        const uniqueWorkers = [...new Set(enrichedDevices.map(dev => dev.worker_hostname).filter(Boolean))].sort() as string[];
        const uniqueProtocols = [...new Set(enrichedDevices.map(dev => dev.protocol.toUpperCase()))].sort();

        return {
            types: uniqueTypes.map(type => ({ label: type, value: type })),
            statuses: uniqueStatuses.map(status => ({ label: status, value: status })),
            locations: uniqueLocations.map(location => ({ label: location, value: location })),
            workers: uniqueWorkers.map(worker => ({ label: worker, value: worker })),
            protocols: uniqueProtocols.map(protocol => ({ label: protocol, value: protocol })),
        };
    }, [enrichedDevices]);

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

    // Apply filters to devices
    const filteredDevices = useMemo(() => {
        console.log('Applying filters:', filters);
        return enrichedDevices.filter(device => {
            if (filters.type && device.device_type_name !== filters.type) return false;
            if (filters.status && (device.status ? 'Online' : 'Offline') !== filters.status) return false;
            if (filters.location && device.location_name !== filters.location) return false;
            if (filters.worker && device.worker_hostname !== filters.worker) return false;
            if (filters.protocol && device.protocol.toUpperCase() !== filters.protocol) return false;
            return true;
        });
    }, [enrichedDevices, filters]);

    useEffect(() => {
        onDataChange?.(filteredDevices)
    }, [filteredDevices, onDataChange])

    // Handle row click
    const handleRowClick = (deviceId: number) => {
        setLocalSelectedId(deviceId);
        onRowClick?.(deviceId);
    };

    return (
        <div className="gap-4 w-full h-full bg-(--contrast) py-2">
            <DevicesFilters 
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
            />

            <Table>
                <TableCaption>List of all devices in the network.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Area</TableHead>
                        
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredDevices.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                No devices found
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredDevices.map((device, index) => (
                            <TableRow 
                                key={device.id} 
                                className={`cursor-pointer transition-all duration-200 ${
                                    localSelectedId === device.id 
                                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md border-l-4 border-blue-700' 
                                        : 'hover:bg-gray-100 text-gray-900'
                                }`}
                                onClick={() => handleRowClick(device.id)}
                            >
                                <TableCell className={`font-semibold w-[60px] ${localSelectedId === device.id ? 'text-white' : ''}`}>
                                    {index + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div>
                                        <p className={`font-semibold ${localSelectedId === device.id ? 'text-white' : 'text-gray-900'}`}>
                                            {device.display}
                                        </p>
                                        <p className={`text-xs ${localSelectedId === device.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {device.hostname}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell className={localSelectedId === device.id ? 'text-white' : ''}>
                                    {device.device_type_name}
                                </TableCell>
                                <TableCell>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                        device.status 
                                            ? localSelectedId === device.id 
                                                ? 'bg-green-200 text-green-900'
                                                : 'bg-green-100 text-green-800'
                                            : localSelectedId === device.id 
                                            ? 'bg-red-200 text-red-900'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {device.status ? 'Online' : 'Offline'}
                                    </span>
                                </TableCell>
                                <TableCell className={localSelectedId === device.id ? 'text-white' : ''}>
                                    {device.location_name || 'N/A'}
                                </TableCell>
                                <TableCell className={`text-sm ${localSelectedId === device.id ? 'text-blue-100' : 'text-gray-600'}`}>
                                    {device.worker_hostname || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                        device.consecutive_failures === 0 
                                            ? localSelectedId === device.id
                                                ? 'bg-green-200 text-green-900'
                                                : 'bg-green-100 text-green-800'
                                            : device.consecutive_failures < 3
                                            ? localSelectedId === device.id
                                                ? 'bg-yellow-200 text-yellow-900'
                                                : 'bg-yellow-100 text-yellow-800'
                                            : localSelectedId === device.id
                                            ? 'bg-red-200 text-red-900'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {device.consecutive_failures}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className={localSelectedId === device.id ? 'opacity-90' : ''}>
                                        <DevicesModifier
                                            deviceId={device.id}
                                            onEdit={(id) => console.log("Edit device", id)}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}