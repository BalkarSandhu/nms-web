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
    const { devices, deviceTypes } = useAppSelector(state => state.devices);
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
        const uniqueTypes = [...new Set(devices.map(dev => dev.device_type.name))].sort();
        const uniqueStatuses = [...new Set(devices.map(dev => dev.status ? 'Online' : 'Offline'))].sort();
        const uniqueLocations = [...new Set(devices.map(dev => dev.location.name).filter(Boolean))].sort() as string[];
        const uniqueWorkers = [...new Set(devices.map(dev => dev.worker.hostname).filter(Boolean))].sort() as string[];
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

            <Table>
                
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        
                        
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
                                <TableCell className={`text-sm ${localSelectedId === device.id ? 'text-blue-100' : 'text-gray-600'}`}>
                                    {device.worker.hostname || 'N/A'}
                                </TableCell>
                                <TableCell className={localSelectedId === device.id ? 'text-white' : ''}>
                                    {device.location.name || 'N/A'}
                                </TableCell>
                                <TableCell className={localSelectedId === device.id ? 'text-white' : ''}>
                                    {device.device_type.name}
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
                                
                                
                                
                            
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}