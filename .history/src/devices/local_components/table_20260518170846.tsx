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
    
    const isReachableParam = searchParams.get('is_reachable');
    if (isReachableParam) {
        // Map 'true'/'false' to 'Online'/'Offline' for filter compatibility
        if (isReachableParam === 'true') {
            init.is_reachable = 'Online';
        } else if (isReachableParam === 'false') {
            init.is_reachable = 'Offline';
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

    // Area scoping (set when drilling in from an area card: /topology?area=…
    // or /devices?area=…). Kept under a distinct key so it doesn't collide
    // with the existing (worker-backed) "area" filter dropdown.
    const areaParam = searchParams.get('area');
    if (areaParam) {
        init.locationArea = areaParam;
    }
    
    return init;
};

// Helper function to get device ID from URL
const getDeviceIdFromUrl = (searchParams: URLSearchParams): number | null => {
    const idParam = searchParams.get('id');
    if (idParam) {
        const id = parseInt(idParam, 10);
        return isNaN(id) ? null : id;
    }
    return null;
};

export default function DevicesTable({ 
    onRowClick, 
    selectedDeviceId,
    onDataChange,
    onSummaryChange,
    filterActions,
}: {
    onRowClick?: (deviceId: number) => void;
    selectedDeviceId?: number | null;
    onDataChange?: (rows: readDeviceType[]) => void;
    onSummaryChange?: (s: { total: number; online: number; offline: number }) => void;
    filterActions?: React.ReactNode;
    onModalClose?: () => void;
}) {
    const { devices } = useAppSelector(state => state.devices);
    const [searchParams] = useSearchParams();
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedDeviceId || null);
    const [hasProcessedUrlId, setHasProcessedUrlId] = useState(false);
    
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

    // Separate useEffect to handle device ID from URL
    useEffect(() => {
        try {
            // Check if there's an 'id' parameter in the URL and auto-select that device
            const deviceIdFromUrl = getDeviceIdFromUrl(searchParams);
            console.log('Device ID from URL:', deviceIdFromUrl);
            
            if (deviceIdFromUrl !== null && !hasProcessedUrlId) {
                setLocalSelectedId(deviceIdFromUrl);
                onRowClick?.(deviceIdFromUrl);
                setHasProcessedUrlId(true);
                
                // Scroll to the selected device row after a short delay to ensure DOM is ready
                setTimeout(() => {
                    const element = document.querySelector(`[data-device-id="${deviceIdFromUrl}"]`);
                    console.log('Found element to scroll to:', element);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            } else if (deviceIdFromUrl === null && hasProcessedUrlId) {
                // URL was cleared, reset the flag
                setHasProcessedUrlId(false);
            }
        } catch (e) {
            console.error('Error handling device ID from URL:', e);
        }
    }, [searchParams, onRowClick, hasProcessedUrlId]);

    // Update local selected ID when prop changes
    useEffect(() => {
        setLocalSelectedId(selectedDeviceId || null);
    }, [selectedDeviceId]);

    // Get unique values for filter options
    const filterOptions = useMemo(() => {
        const uniqueTypes = [...new Set(devices.map(dev => dev.device_type?.name))].sort();
        const uniqueStatuses = [...new Set(devices.map(dev => dev.is_reachable ? 'Online' : 'Offline'))].sort();
        const uniqueLocations = [...new Set(devices.map(dev => dev.location?.name).filter(Boolean))].sort() as string[];
        const uniqueWorkers = [...new Set(devices.map(dev => dev.worker?.name).filter(Boolean))].sort() as string[];
        const uniqueProtocols = [...new Set(devices.map(dev => dev.protocol.toUpperCase()))].sort();

        return {
            types: uniqueTypes.map(type => ({ label: type, value: type })),
            is_reachable: uniqueStatuses.map(status => ({ label: status, value: status })),
            locations: uniqueLocations.map(location => ({ label: location, value: location })),
            workers: uniqueWorkers.map(worker => ({ label: worker, value: worker })),
            protocols: uniqueProtocols.map(protocol => ({ label: protocol, value: protocol })),
        };
    }, [devices]);

    // Only Status (online/offline) and Device Type — search handled by the
    // filter bar's search box. Area scope comes from the URL, not a filter.
    const filterConfigs: FilterConfig[] = [
        {
            label: "Status",
            key: "is_reachable",
            options: filterOptions.is_reachable,
        },
        {
            label: "Device Type",
            key: "type",
            options: filterOptions.types,
        },
    ];

    // Apply filters to devices
    const filteredDevices = useMemo(() => {
        console.log('Applying filters:', filters);
        const result = devices.filter(device => {
            if (filters.type && device.device_type?.name !== filters.type) return false;
            if (filters.is_reachable && (device.is_reachable ? 'Online' : 'Offline') !== filters.is_reachable) return false;
            if (filters.location && device.location?.name !== filters.location) return false;
            if (filters.worker && device.worker.name !== filters.worker) return false;
            if (filters.protocol && device.protocol.toUpperCase() !== filters.protocol) return false;
            if (filters.locationArea && device.location?.area !== filters.locationArea) return false;
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const hit =
                    (device.display || '').toLowerCase().includes(q) ||
                    (device.hostname || '').toLowerCase().includes(q) ||
                    (device.ip || '').toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
        console.log(`Filtered ${result.length} devices out of ${devices.length}`);
        return result;
    }, [devices, filters]);

    useEffect(() => {
        onDataChange?.(filteredDevices)
    }, [filteredDevices, onDataChange])

    // Handle row click
    // Area summary (Total / Online / Offline) — scoped to the area when
    // opened from an area card, otherwise across all devices.
    const summary = useMemo(() => {
        const areaScope = filters.locationArea?.trim();
        const base = areaScope
            ? devices.filter(d => d.location?.area === areaScope)
            : devices;
        const online = base.filter(d => d.is_reachable).length;
        return { total: base.length, online, offline: base.length - online };
    }, [devices, filters]);

    useEffect(() => { onSummaryChange?.(summary); }, [summary, onSummaryChange]);

    const handleRowClick = (deviceId: number) => {
        setLocalSelectedId(deviceId);
        onRowClick?.(deviceId);
    };

    // Handle closing modal - clear URL parameter
    

    const headStyle: React.CSSProperties = { color: 'var(--text-lo)' };
    const headClass = "font-semibold text-[11px] uppercase tracking-[0.14em]";

    return (
        <div className="gap-4 w-full h-full py-2 px-4 flex flex-col overflow-hidden">
            <DevicesFilters
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
                searchPlaceholder="Search devices…"
                trailing={filterActions}
            />

            <div className="overflow-auto flex-1 rounded-lg border" style={{ borderColor: 'var(--border-soft)' }}>
                <Table className="table-fixed w-full [&_td]:align-top [&_td]:whitespace-normal [&_td]:break-words [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
                    <TableHeader className="sticky top-0 z-10" style={{ background: 'rgba(15,23,42,0.92)' }}>
                        <TableRow style={{ borderColor: 'var(--border-soft)' }}>
                            <TableHead className={`w-[5%] text-center ${headClass}`} style={headStyle}>#</TableHead>
                            <TableHead className={`w-[20%] ${headClass}`} style={headStyle}>Device Name</TableHead>
                            <TableHead className={`w-[12%] ${headClass}`} style={headStyle}>Hostname</TableHead>
                            <TableHead className={`w-[15%] ${headClass}`} style={headStyle}>Area</TableHead>
                            <TableHead className={`w-[15%] ${headClass}`} style={headStyle}>Type</TableHead>
                            <TableHead className={`w-[15%] text-center ${headClass}`} style={headStyle}>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDevices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12" style={{ color: 'var(--text-lo)' }}>
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-dim)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>No devices found</p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Try adjusting your filters</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDevices.map((device, index) => {
                                const selected = localSelectedId === device.id;
                                return (
                                    <TableRow
                                        key={device.id}
                                        data-device-id={device.id}
                                        onClick={() => handleRowClick(device.id)}
                                        className="cursor-pointer transition-colors"
                                        style={{
                                            background: selected ? 'rgba(34,211,238,0.10)' : 'transparent',
                                            borderColor: 'var(--border-soft)',
                                            borderLeft: selected ? '3px solid var(--brand)' : '3px solid transparent',
                                        }}
                                    >
                                        <TableCell className="text-center text-sm tabular-nums" style={{ color: 'var(--text-lo)' }}>{index + 1}</TableCell>
                                        <TableCell>
                                            <span className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }} title={device.display}>
                                                {device.display}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className="text-xs font-mono px-2 py-1 rounded inline-block"
                                                style={{
                                                    background: 'rgba(34,211,238,0.10)',
                                                    color: 'var(--brand)',
                                                    border: '1px solid var(--border-brand)',
                                                }}
                                            >
                                                {device.hostname}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-dim)' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="text-sm truncate" style={{ color: 'var(--text-mid)' }}>
                                                    {device.worker?.name || 'N/A'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="badge-info">
                                                {device.device_type?.name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="inline-flex items-center justify-center gap-1.5">
                                                <span className={`nms-dot ${device.is_reachable ? 'nms-dot-online' : 'nms-dot-offline'}`} />
                                                <span
                                                    className="text-xs font-semibold uppercase tracking-wide"
                                                    style={{ color: device.is_reachable ? 'var(--status-online)' : 'var(--status-offline)' }}
                                                >
                                                    {device.is_reachable ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}