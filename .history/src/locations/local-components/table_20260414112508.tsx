import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocationsPaginated, fetchLocationTypes } from '@/store/locationsSlice';
import LocationsFilters, { type FilterConfig } from './filters';
import { EditLocationForm } from './EditLocationForm';
import { DeleteLocationForm } from './DeleteLocationForm';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type EnrichedLocation = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    status: string;
    status_reason: string;
    location_type_id: number;
    project?: string;
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

export default function LocationsTable({
    onRowClick,
    selectedLocationId,
    onDataChange,
    initialFilters,
    onFiltersChange
}: {
    onRowClick?: (locationId: number) => void;
    selectedLocationId?: number | null;
    onDataChange?: (rows: EnrichedLocation[]) => void;
    initialFilters?: Record<string, string>;
    onFiltersChange?: (filters: Record<string, string>) => void;
}) {
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();

    // ─── Redux state ──────────────────────────────────────────────────────────
    // Use ONLY pagedLocations (a local slice of data) — never allLocations
    const { locationTypes = [], pagination, paginationLoading: loading } = useAppSelector(state => state.locations);
    const pagedLocations = useAppSelector(state => state.locations.locations); // current page only
    const { workers = [] } = useAppSelector(state => state.workers);
    const { devices = [] } = useAppSelector(state => state.devices);

    // ─── Local UI state ───────────────────────────────────────────────────────
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedLocationId || null);
    const [hasProcessedUrlId, setHasProcessedUrlId] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [pageInputValue, setPageInputValue] = useState('1');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedLocationForAction, setSelectedLocationForAction] = useState<number | null>(null);

    const [filters, setFilters] = useState<Record<string, string>>(() => {
        if (initialFilters) return initialFilters;
        try {
            const params = new URLSearchParams(window.location.search);
            const init: Record<string, string> = {};
            const s = params.get('status'); if (s) init.status = s.toLowerCase();
            const t = params.get('type');   if (t) init.type = t.trim();
            const p = params.get('project');if (p) init.project = p.trim();
            const a = params.get('area');   if (a) init.area = a.trim();
            return init;
        } catch { return {}; }
    });

    // ─── Fetch location types if missing ─────────────────────────────────────
    useEffect(() => {
        if (locationTypes.length === 0) {
            dispatch(fetchLocationTypes() as any);
        }
    }, [dispatch, locationTypes.length]);

    // ─── Pagination fetch ─────────────────────────────────────────────────────
    const lastFetchRef = useRef<{ page: number; perPage: number } | null>(null);
    const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);

        const alreadyFetched =
            lastFetchRef.current?.page === currentPage &&
            lastFetchRef.current?.perPage === perPage;

        if (alreadyFetched) return;

        fetchTimerRef.current = setTimeout(() => {
        lastFetchRef.current = { page: currentPage, perPage }; // ← moved here
        dispatch(fetchLocationsPaginated({ page: currentPage, perPage }) as any);
    }, 100);

        return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current); };
    }, [currentPage, perPage, dispatch]);

    // ─── Pagination helpers ───────────────────────────────────────────────────
    const totalPages = Math.max(1, pagination?.totalPages || 0);

    const goToPage = (page: number) => {
        const clamped = Math.max(1, Math.min(page, totalPages));
        if (clamped === currentPage) return;
        lastFetchRef.current = null; // clear cache so fetch runs
        setCurrentPage(clamped);
    };

    // Keep page input in sync with currentPage
    useEffect(() => { setPageInputValue(String(currentPage)); }, [currentPage]);

    // ─── Enrich current page locations ────────────────────────────────────────
    const enrichedLocations = useMemo((): EnrichedLocation[] => {
        const safeLocations = Array.isArray(pagedLocations) ? pagedLocations : [];
        const safeLocationTypes = Array.isArray(locationTypes) ? locationTypes : [];
        const safeWorkers = Array.isArray(workers) ? workers : [];
        const safeDevices = Array.isArray(devices) ? devices : [];

        return safeLocations.map((location) => {
            const locationType = safeLocationTypes.find(lt => lt.id === location.location_type_id);
            const type_name = locationType?.name || locationType?.location_type || 'Unknown';

            const worker_id = location.worker_id;
            const worker = worker_id
                ? safeWorkers.find(w => w.id === worker_id || w.id === String(worker_id))
                : undefined;
            const worker_hostname = worker?.name;

            const locationDevices = safeDevices.filter(d => d.location_id === location.id);
            const devices_online  = locationDevices.filter(d => d.is_reachable === true).length;
            const devices_offline = locationDevices.filter(d => d.is_reachable === false).length;
            const devices_total   = locationDevices.length;
            const device_ids      = locationDevices.map(d => d.id);

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
    }, [pagedLocations, locationTypes, workers, devices]);

    // ─── Client-side filter (on current page only) ────────────────────────────
    const filteredLocations = useMemo(() => {
        return enrichedLocations.filter(loc => {
            if (filters.type    && loc.type_name.trim().toLowerCase() !== filters.type.trim().toLowerCase()) return false;
            if (filters.status  && loc.status !== filters.status) return false;
            if (filters.project && loc.project?.trim() !== filters.project.trim()) return false;
            if (filters.area    && loc.area?.trim() !== filters.area.trim()) return false;
            return true;
        });
    }, [enrichedLocations, filters]);

    // ─── Filter options (built from current page) ─────────────────────────────
    const filterOptions = useMemo(() => {
        const uniq = <T,>(arr: T[]) => [...new Set(arr)].sort() as T[];
        return {
            types:    uniq(enrichedLocations.map(l => l.type_name)).map(v => ({ label: v, value: v })),
            statuses: uniq(enrichedLocations.map(l => l.status)).map(v => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v })),
            projects: uniq(enrichedLocations.map(l => l.project).filter((p): p is string => p != null)).map(v => ({ label: v, value: v })),
            areas:    uniq(enrichedLocations.map(l => l.area).filter((a): a is string => a != null)).map(v => ({ label: v, value: v })),
        };
    }, [enrichedLocations]);

    const filterConfigs: FilterConfig[] = [
        { label: "Type",    key: "type",    options: filterOptions.types    },
        { label: "Status",  key: "status",  options: filterOptions.statuses },
        { label: "Project", key: "project", options: filterOptions.projects },
        { label: "Area",    key: "area",    options: filterOptions.areas    },
    ];

    // ─── Sync filters from URL ────────────────────────────────────────────────
    useEffect(() => {
        setFilters(prev => {
            const next = { ...prev };
            const s = searchParams.get('status'); s ? (next.status = s.toLowerCase()) : delete next.status;
            const t = searchParams.get('type');   t ? (next.type = t.trim())          : delete next.type;
            const p = searchParams.get('project');p ? (next.project = p.trim())       : delete next.project;
            const a = searchParams.get('area');   a ? (next.area = a.trim())          : delete next.area;
            return next;
        });
    }, [searchParams]);

    useEffect(() => { onFiltersChange?.(filters); }, [filters, onFiltersChange]);
    useEffect(() => { onDataChange?.(filteredLocations); }, [filteredLocations, onDataChange]);
    useEffect(() => { setLocalSelectedId(selectedLocationId || null); }, [selectedLocationId]);

    // ─── Handle ?id= in URL ───────────────────────────────────────────────────
    useEffect(() => {
        try {
            const raw = searchParams.get('id');
            const locationId = raw ? parseInt(raw, 10) : null;
            if (locationId && !isNaN(locationId) && !hasProcessedUrlId) {
                setLocalSelectedId(locationId);
                onRowClick?.(locationId);
                setHasProcessedUrlId(true);
                setTimeout(() => {
                    document.querySelector(`[data-location-id="${locationId}"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            } else if (!locationId && hasProcessedUrlId) {
                setHasProcessedUrlId(false);
            }
        } catch (e) {
            console.error('Error handling location ID from URL:', e);
        }
    }, [searchParams, onRowClick, hasProcessedUrlId]);

    const handleRowClick = (id: number) => { setLocalSelectedId(id); onRowClick?.(id); };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="gap-4 w-full h-full bg-(--contrast) py-2">
            <LocationsFilters
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
            />

            {loading && (
                <div className="px-4 py-2 text-sm text-blue-600 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading page {currentPage}...
                </div>
            )}

            <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                        <TableRow className="border-b-2 border-gray-200">
                            <TableHead className="w-[4%]  font-semibold text-gray-700 text-center py-3">No.</TableHead>
                            <TableHead className="w-[25%] font-semibold text-gray-700 py-3">Location Name</TableHead>
                            <TableHead className="w-[12%] font-semibold text-gray-700 py-3">Type</TableHead>
                            <TableHead className="w-[15%] font-semibold text-gray-700 py-3">Area</TableHead>
                            <TableHead className="w-[14%] font-semibold text-gray-700 text-center py-3">Location Status</TableHead>
                            <TableHead className="w-[20%] font-semibold text-gray-700 py-3">Devices</TableHead>
                            <TableHead className="w-[10%] font-semibold text-gray-700 text-center py-3">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLocations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500 py-12">
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
                                        {(currentPage - 1) * perPage + index + 1}
                                    </TableCell>

                                    <TableCell className="font-medium py-2">
                                        <span className={`text-sm font-semibold ${localSelectedId === location.id ? 'text-blue-900' : 'text-gray-900'}`} title={location.name}>
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
                                            <span className={`text-sm ${localSelectedId === location.id ? 'text-blue-800' : 'text-gray-700'}`} title={location.area}>
                                                {location.area}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center py-2">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${location.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            <span className={`text-xs font-semibold ${location.status === 'online' ? 'text-green-700' : 'text-red-700'}`}>
                                                {location.status === 'online' ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                <span className="text-green-600 font-medium">{location.devices_online} online</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                                <span className="text-red-600 font-medium">{location.devices_offline} offline</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600">{location.devices_total} total</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center py-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedLocationForAction(location.id); setEditDialogOpen(true); }}
                                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition duration-150"
                                                title="Edit location"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedLocationForAction(location.id); setDeleteDialogOpen(true); }}
                                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition duration-150"
                                                title="Delete location"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedLocationForAction !== null && (
                <EditLocationForm locationId={selectedLocationForAction} open={editDialogOpen} setOpen={setEditDialogOpen} />
            )}
            {selectedLocationForAction !== null && (
                <DeleteLocationForm locationId={selectedLocationForAction} open={deleteDialogOpen} setOpen={setDeleteDialogOpen} />
            )}

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between mt-6 px-4 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="perPage" className="text-sm font-medium text-gray-700">Items per page:</label>
                        <select
                            id="perPage"
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                lastFetchRef.current = null;
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="text-sm text-gray-600">
                        Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                        {pagination?.total > 0 && (
                            <span> • Total: <span className="font-semibold">{pagination.total}</span> items</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1 border border-gray-300 rounded-md px-3 py-2">
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageInputValue}
                            onChange={(e) => setPageInputValue(e.target.value)}
                            onBlur={() => {
                                const parsed = parseInt(pageInputValue, 10);
                                if (!isNaN(parsed)) goToPage(parsed);
                                else setPageInputValue(String(currentPage));
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const parsed = parseInt(pageInputValue, 10);
                                    if (!isNaN(parsed)) goToPage(parsed);
                                    else setPageInputValue(String(currentPage));
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="w-14 text-center text-sm outline-none"
                        />
                    </div>

                    <Button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}