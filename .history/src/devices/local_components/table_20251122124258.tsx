import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/store/hooks';
import DevicesFilters, { type FilterConfig } from './filters';
import {type readDeviceType} from '@/contexts/read-Types';


import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"


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
    onDataChange?: (rows: readDeviceType[]) => void;
}) {
    const { devices } = useAppSelector(state => state.devices);
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
        const uniqueTypes = [...new Set(devices.map(dev => dev.device_type?.name))].sort();
        const uniqueStatuses = [...new Set(devices.map(dev => dev.status ? 'Online' : 'Offline'))].sort();
        const uniqueLocations = [...new Set(devices.map(dev => dev.location?.name).filter(Boolean))].sort() as string[];
        const uniqueWorkers = [...new Set(devices.map(dev => dev.worker?.hostname).filter(Boolean))].sort() as string[];
        const uniqueProtocols = [...new Set(devices.map(dev => dev.protocol.toUpperCase()))].sort();

        return {
            types: uniqueTypes.map(type => ({ label: type, value: type })),
            statuses: uniqueStatuses.map(status => ({ label: status, value: status })),
            locations: uniqueLocations.map(location => ({ label: location, value: location })),
            workers: uniqueWorkers.map(worker => ({ label: worker, value: worker })),
            protocols: uniqueProtocols.map(protocol => ({ label: protocol, value: protocol })),
        };
    }, [devices]);

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
        }
    ];

    // Apply filters to devices
    const filteredDevices = useMemo(() => {
        console.log('Applying filters:', filters);
        return devices.filter(device => {
            if (filters.type && device.device_type.name !== filters.type) return false;
            if (filters.status && (device.status ? 'Online' : 'Offline') !== filters.status) return false;
            if (filters.location && device.location.name !== filters.location) return false;
            if (filters.worker && device.worker.hostname !== filters.worker) return false;
            if (filters.protocol && device.protocol.toUpperCase() !== filters.protocol) return false;
            return true;
        });
    }, [devices, filters]);

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

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                        <TableRow className="border-b-2 border-gray-200">
                            <TableHead className="w-[50px] font-semibold text-gray-700 text-center">No.</TableHead>
                            <TableHead className="min-w-[200px] font-semibold text-gray-700">Device Name</TableHead>
                            <TableHead className="min-w-[120px] font-semibold text-gray-700">IP Address</TableHead>
                            <TableHead className="min-w-[120px] font-semibold text-gray-700">Area</TableHead>
                            <TableHead className="min-w-[150px] font-semibold text-gray-700">Site Location</TableHead>
                            <TableHead className="min-w-[100px] font-semibold text-gray-700">Type</TableHead>
                            <TableHead className="w-[90px] font-semibold text-gray-700 text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDevices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-medium">No devices found</p>
                                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDevices.map((device, index) => (
                                <TableRow 
                                    key={device.id} 
                                    className={`cursor-pointer transition-all duration-150 border-b border-gray-100 ${
                                        localSelectedId === device.id 
                                            ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleRowClick(device.id)}
                                >
                                    <TableCell className="text-center text-sm font-medium text-gray-600">
                                        {index + 1}
                                    </TableCell>
                                    
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-semibold truncate max-w-[200px] ${
                                                localSelectedId === device.id ? 'text-blue-900' : 'text-gray-900'
                                            }`} title={device.display}>
                                                {device.display}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className={`text-xs font-mono px-2 py-1 rounded ${
                                            localSelectedId === device.id 
                                                ? 'bg-blue-100 text-blue-800' 
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {device.hostname}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className={`text-sm truncate max-w-[100px] ${
                                                localSelectedId === device.id ? 'text-blue-800' : 'text-gray-700'
                                            }`} title={device.worker?.hostname || 'N/A'}>
                                                {device.worker?.hostname || 'N/A'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className={`text-sm break-words max-w-[140px] ${
                                                localSelectedId === device.id ? 'text-blue-800' : 'text-gray-700'
                                            }`} title={device.location.name || 'N/A'}>
                                                {device.location.name || 'N/A'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                            localSelectedId === device.id 
                                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                            {device.device_type.name}
                                        </span>
                                    </TableCell>
                                    
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${
                                                device.status ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                            }`}></span>
                                            <span className={`text-xs font-semibold ${
                                                device.status ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                                {device.status ? 'Online' : 'Offline'}
                                            </span>
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