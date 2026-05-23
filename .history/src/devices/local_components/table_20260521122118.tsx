import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRefresh } from "@/contexts/RefreshContext";
import { fetchDevices } from "@/store/deviceSlice";
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import DevicesFilters, { type FilterConfig } from './filters';
import { type readDeviceType } from '@/contexts/read-Types';
import { EditDeviceForm } from './EditDeviceForm';
import { DeleteDeviceForm } from './DeleteDeviceForm';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";

const parseUrlFilters = (searchParams: URLSearchParams): Record<string, string> => {
    const init: Record<string, string> = {};
    const typeParam = searchParams.get('type');
    if (typeParam) init.type = typeParam;
    const isReachableParam = searchParams.get('is_reachable');
    if (isReachableParam === 'true') init.is_reachable = 'Online';
    else if (isReachableParam === 'false') init.is_reachable = 'Offline';
    const locationParam = searchParams.get('location');
    if (locationParam) init.location = locationParam;
    const workerParam = searchParams.get('worker');
    if (workerParam) init.worker = workerParam;
    const protocolParam = searchParams.get('protocol');
    if (protocolParam) init.protocol = protocolParam;
    const areaParam = searchParams.get('area');
    if (areaParam) init.locationArea = areaParam;
    return init;
};

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
    filterActions,       // ← restored: parent injects Topology / Add / Export buttons here
}: {
    onRowClick?: (deviceId: number) => void;
    selectedDeviceId?: number | null;
    onDataChange?: (rows: readDeviceType[]) => void;
    onModalClose?: () => void;
    filterActions?: React.ReactNode;  // ← restored
}) {
    const { devices } = useAppSelector(state => state.devices);
    const [searchParams] = useSearchParams();
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedDeviceId || null);
    const [hasProcessedUrlId, setHasProcessedUrlId] = useState(false);
    const dispatch = useAppDispatch();
    const { refreshVersion } = useRefresh();

    // ── Dialog state ──────────────────────────────────────────────────────────
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDeviceForAction, setSelectedDeviceForAction] = useState<number | null>(null);

    const [filters, setFilters] = useState<Record<string, string>>(() => {
        try { return parseUrlFilters(searchParams); }
        catch (e) { return {}; }
    });

    useEffect(() => {
        try { setFilters(parseUrlFilters(searchParams)); }
        catch (e) { console.error('Error parsing search params:', e); }
    }, [searchParams]);

    // ── Re-fetch when anything triggers a refresh ─────────────────────────────
    useEffect(() => {
        if (refreshVersion === 0) return;
        dispatch(fetchDevices() as any);
    }, [refreshVersion]);

    useEffect(() => {
        try {
            const deviceIdFromUrl = getDeviceIdFromUrl(searchParams);
            if (deviceIdFromUrl !== null && !hasProcessedUrlId) {
                setLocalSelectedId(deviceIdFromUrl);
                onRowClick?.(deviceIdFromUrl);
                setHasProcessedUrlId(true);
                setTimeout(() => {
                    document.querySelector(`[data-device-id="${deviceIdFromUrl}"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            } else if (deviceIdFromUrl === null && hasProcessedUrlId) {
                setHasProcessedUrlId(false);
            }
        } catch (e) {
            console.error('Error handling device ID from URL:', e);
        }
    }, [searchParams, onRowClick, hasProcessedUrlId]);

    useEffect(() => { setLocalSelectedId(selectedDeviceId || null); }, [selectedDeviceId]);

    const filterOptions = useMemo(() => {
        const uniqueTypes     = [...new Set(devices.map(dev => dev.device_type?.name))].sort();
        const uniqueStatuses  = [...new Set(devices.map(dev => dev.is_reachable ? 'Online' : 'Offline'))].sort();
        const uniqueLocations = [...new Set(devices.map(dev => dev.location?.name).filter(Boolean))].sort() as string[];
        const uniqueWorkers   = [...new Set(devices.map(dev => dev.worker?.name).filter(Boolean))].sort() as string[];
        const uniqueProtocols = [...new Set(devices.map(dev => dev.protocol.toUpperCase()))].sort();
        return {
            types:       uniqueTypes.map(v     => ({ label: v, value: v })),
            is_reachable:uniqueStatuses.map(v  => ({ label: v, value: v })),
            locations:   uniqueLocations.map(v => ({ label: v, value: v })),
            workers:     uniqueWorkers.map(v   => ({ label: v, value: v })),
            protocols:   uniqueProtocols.map(v => ({ label: v, value: v })),
        };
    }, [devices]);

    const areaScoped = !!(filters.locationArea && filters.locationArea.trim());

    const filterConfigs: FilterConfig[] = [
        { label: "Type",     key: "type",         options: filterOptions.types },
        { label: "Status",   key: "is_reachable",  options: filterOptions.is_reachable },
        ...(areaScoped ? [] : [{ label: "Area", key: "area", options: filterOptions.workers }]),
    ];

    const filteredDevices = useMemo(() => {
        return devices.filter(device => {
            if (filters.type         && device.device_type?.name !== filters.type) return false;
            if (filters.is_reachable && (device.is_reachable ? 'Online' : 'Offline') !== filters.is_reachable) return false;
            if (filters.location     && device.location?.name !== filters.location) return false;
            if (filters.worker       && device.worker.name !== filters.worker) return false;
            if (filters.protocol     && device.protocol.toUpperCase() !== filters.protocol) return false;
            if (filters.locationArea && device.location?.area !== filters.locationArea) return false;
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const hit =
                    (device.display        || '').toLowerCase().includes(q) ||
                    (device.hostname       || '').toLowerCase().includes(q) ||
                    (device.worker?.name   || '').toLowerCase().includes(q) ||
                    (device.location?.name || '').toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
    }, [devices, filters]);

    useEffect(() => { onDataChange?.(filteredDevices); }, [filteredDevices, onDataChange]);

    const handleRowClick = (deviceId: number) => {
        setLocalSelectedId(deviceId);
        onRowClick?.(deviceId);
    };

    const headStyle: React.CSSProperties = { color: 'var(--text-lo)' };
    const headClass = "font-semibold text-[11px] uppercase tracking-[0.14em]";

    return (
        <div className="gap-4 w-full h-full py-2 px-4 flex flex-col overflow-hidden">
            {/* trailing prop re-injects the Topology / Add Device / Export buttons */}
            <DevicesFilters
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
                trailing={filterActions}   // ← restored
            />

            <div className="overflow-auto flex-1 rounded-lg border" style={{ borderColor: 'var(--border-soft)' }}>
                <Table className="table-fixed w-full [&_td]:align-top [&_td]:whitespace-normal [&_td]:break-words [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
                    <TableHeader className="sticky top-0 z-10" style={{ background: 'rgba(15,23,42,0.92)' }}>
                        <TableRow style={{ borderColor: 'var(--border-soft)' }}>
                            <TableHead className={`w-[4%]  text-center ${headClass}`} style={headStyle}>#</TableHead>
                            <TableHead className={`w-[20%] ${headClass}`}             style={headStyle}>Device Name</TableHead>
                            <TableHead className={`w-[12%] ${headClass}`}             style={headStyle}>Hostname</TableHead>
                            <TableHead className={`w-[14%] ${headClass}`}             style={headStyle}>Area</TableHead>
                            <TableHead className={`w-[14%] ${headClass}`}             style={headStyle}>Type</TableHead>
                            <TableHead className={`w-[14%] text-center ${headClass}`} style={headStyle}>Status</TableHead>
                            <TableHead className={`w-[10%] text-center ${headClass}`} style={headStyle}>Actions</TableHead>
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
                                        <p className="text-xs"            style={{ color: 'var(--text-dim)' }}>Try adjusting your filters</p>
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
                                            background:  selected ? 'rgba(34,211,238,0.10)' : 'transparent',
                                            borderColor: 'var(--border-soft)',
                                            borderLeft:  selected ? '3px solid var(--brand)' : '3px solid transparent',
                                        }}
                                    >
                                        <TableCell className="text-center text-sm tabular-nums" style={{ color: 'var(--text-lo)' }}>
                                            {index + 1}
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }} title={device.display}>
                                                {device.display}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <span
                                                className="text-xs font-mono px-2 py-1 rounded inline-block"
                                                style={{ background: 'rgba(34,211,238,0.10)', color: 'var(--brand)', border: '1px solid var(--border-brand)' }}
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
                                            <span className="badge-info">{device.device_type?.name}</span>
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

                                        {/* ── Actions ── */}
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDeviceForAction(device.id);
                                                        setEditDialogOpen(true);
                                                    }}
                                                    className="p-1.5 rounded transition-colors hover:bg-white/[0.06]"
                                                    title="Edit device"
                                                    style={{ color: 'var(--brand)' }}
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDeviceForAction(device.id);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                    className="p-1.5 rounded transition-colors hover:bg-white/[0.06]"
                                                    title="Delete device"
                                                    style={{ color: 'var(--status-offline)' }}
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ── Dialogs ── */}
            {selectedDeviceForAction !== null && (
                <EditDeviceForm
                    deviceId={selectedDeviceForAction}
                    open={editDialogOpen}
                    setOpen={setEditDialogOpen}
                />
            )}
            {selectedDeviceForAction !== null && (
                <DeleteDeviceForm
                    deviceId={selectedDeviceForAction}
                    open={deleteDialogOpen}
                    setOpen={setDeleteDialogOpen}
                />
            )}
        </div>
    );
}