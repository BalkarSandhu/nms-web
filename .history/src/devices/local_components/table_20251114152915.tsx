import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

//-- Redux
import { useAppSelector } from '@/store/hooks';

//--Local components
import DevicesFilters, { type FilterConfig } from './filters';

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
import DevicesModifier from './devices-modifier';

// Enhanced device type with all related data
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
    // Enriched fields
    device_type_name: string; // from DeviceType
    location_name?: string; // from Location
    worker_hostname?: string; // from Worker
};

/**
 * Custom hook to get enriched device data with all relationships
 */
export const useEnrichedDevices = (): EnrichedDevice[] => {
    const { devices, deviceTypes } = useAppSelector(state => state.devices);
    const { locations } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);

    return useMemo(() => {
        return devices.map((device) => {
            // Find device type name
            const deviceType = deviceTypes.find(dt => dt.id === device.device_type_id);
            const device_type_name = deviceType?.name || 'Unknown';

            // Find location name
            const location = locations.find(l => l.id === device.location_id);
            const location_name = location?.name;

            // Find worker hostname
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

export default function DevicesTable({ 
    onRowClick, 
    selectedDeviceId 
}: { 
    onRowClick?: (deviceId: number) => void;
    selectedDeviceId?: number | null;
}) {
    // Use the custom hook to get enriched data
    const enrichedDevices = useEnrichedDevices();
    
    // State for filters
    const [filters, setFilters] = useState<Record<string, string>>(() => {
        // Initialize from the URL so child `DevicesFilters` receives initialFilters correctly
        try {
            const params = new URLSearchParams(window.location.search);
            const statusParam = params.get('status');
            const init: Record<string, string> = {};
            if (statusParam) {
                const normalized = String(statusParam).toLowerCase();
                if (normalized === 'online' || normalized === 'offline') {
                    init.status = normalized.charAt(0).toUpperCase() + normalized.slice(1);
                }
            }
            return init;
        } catch (e) {
            return {};
        }
    });

    // React to changes in the search params (client navigation)
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam) {
            const normalized = String(statusParam).toLowerCase();
            if (normalized === 'online' || normalized === 'offline') {
                // Capitalize to match filter option values (e.g., 'Online' / 'Offline')
                const formatted = normalized.charAt(0).toUpperCase() + normalized.slice(1);
                setFilters(prev => ({ ...prev, status: formatted }));
            }
        } else {
            // If param removed, clear the status filter
            setFilters(prev => {
                const copy = { ...prev };
                delete copy.status;
                return copy;
            });
        }
    // Update when searchParams change
    }, [searchParams]);

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
        return enrichedDevices.filter(device => {
            if (filters.type && device.device_type_name !== filters.type) return false;
            if (filters.status && (device.status ? 'Online' : 'Offline') !== filters.status) return false;
            if (filters.location && device.location_name !== filters.location) return false;
            if (filters.worker && device.worker_hostname !== filters.worker) return false;
            if (filters.protocol && device.protocol.toUpperCase() !== filters.protocol) return false;
            return true;
        });
    }, [enrichedDevices, filters]);

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
                    {filteredDevices.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500">
                                No devices found
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredDevices.map((device, index) => (
                            <TableRow 
                                key={device.id} 
                                className={`cursor-pointer transition-colors ${
                                    selectedDeviceId === device.id 
                                        ? 'bg-blue-50 hover:bg-blue-100' 
                                        : 'hover:bg-gray-50'
                                }`}
                                onClick={() => onRowClick?.(device.id)}
                            >
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                    <div>
                                        <p className="font-semibold">{device.display}</p>
                                        <p className="text-xs text-gray-500">{device.hostname}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{device.ip}:{device.port}</TableCell>
                                <TableCell>{device.device_type_name}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        device.status 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {device.status ? 'Online' : 'Offline'}
                                    </span>
                                </TableCell>
                                <TableCell>{device.location_name || 'N/A'}</TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {device.worker_hostname || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        device.consecutive_failures === 0 
                                            ? 'bg-green-100 text-green-800' 
                                            : device.consecutive_failures < 3
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {device.consecutive_failures}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                <DevicesModifier
                                    deviceId={device.id}
                                    onEdit={(id) => console.log("Edit device", id)}
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
