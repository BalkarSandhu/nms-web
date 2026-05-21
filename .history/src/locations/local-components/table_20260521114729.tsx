import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocationsPaginated, fetchLocationsforMap, fetchLocationTypes } from '@/store/locationsSlice';
import LocationsFilters, { type FilterConfig } from './filters';
import { EditLocationForm } from './EditLocationForm';
import { useRefresh } from "@/contexts/RefreshContext";
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
    onSummaryChange,
    filterActions,
    initialFilters,
    onFiltersChange
}: {
    onRowClick?: (locationId: number) => void;
    selectedLocationId?: number | null;
    onDataChange?: (rows: EnrichedLocation[]) => void;
    onSummaryChange?: (s: { total: number; online: number; offline: number }) => void;
    filterActions?: React.ReactNode;
    initialFilters?: Record<string, string>;
    onFiltersChange?: (filters: Record<string, string>) => void;
}) {
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();

    // ─── Redux state ──────────────────────────────────────────────────────────
    // Use ONLY pagedLocations (a local slice of data) — never allLocations
    const { locationTypes = [], pagination, paginationLoading: loading } = useAppSelector(state => state.locations);
    const fullLoading = useAppSelector(state => state.locations.loading);
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
    const { refreshVersion } = useRefresh();

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

    // Area-scoped mode: reached by drilling in from an area card
    // (/topology?area=… or /locations?area=…). Pagination only ever holds
    // one page, so an area filter applied to that single page misses most
    // rows — in this mode we load ALL locations and filter the full set.
    const areaScoped = !!(filters.area && filters.area.trim());

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
        // Area-scoped: fetch every location once (server `?fetch_all=true`),
        // then the client-side area filter narrows to the whole area.
        if (areaScoped) {
            dispatch(fetchLocationsforMap() as any);
            return;
        }

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
    }, [currentPage, perPage, dispatch, areaScoped]);

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
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const hit =
                    (loc.name || '').toLowerCase().includes(q) ||
                    (loc.area || '').toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
    }, [enrichedLocations, filters]);

    // Area summary (Total / Online / Offline) — scoped to the area when
    // opened from an area card, otherwise across all loaded locations.
    const summary = useMemo(() => {
        const areaScope = filters.area?.trim();
        const base = areaScope
            ? enrichedLocations.filter(l => l.area?.trim() === areaScope)
            : enrichedLocations;
        const online = base.filter(l => l.status === 'online').length;
        const offline = base.filter(l => l.status === 'offline').length;
        return { total: base.length, online, offline };
    }, [enrichedLocations, filters]);

    useEffect(() => { onSummaryChange?.(summary); }, [summary, onSummaryChange]);

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

    // Only Status (online/offline) and Location Type — search handled by the
    // filter bar's search box. Area scope comes from the URL, not a filter.
    const filterConfigs: FilterConfig[] = [
        { label: "Status",        key: "status", options: filterOptions.statuses },
        { label: "Location Type", key: "type",   options: filterOptions.types    },
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
    const headStyle: React.CSSProperties = { color: 'var(--text-lo)' };
    const headClass = "font-semibold text-[11px] uppercase tracking-[0.14em]";

    return (
        <div className="gap-4 w-full h-full py-2 px-4 flex flex-col overflow-hidden">
            <LocationsFilters
                filterConfigs={filterConfigs}
                onFiltersChange={setFilters}
                initialFilters={filters}
                searchPlaceholder="Search locations…"
                trailing={filterActions}
            />

            {(areaScoped ? fullLoading : loading) && (
                <div className="px-3 py-2 text-xs flex items-center gap-2 rounded-md" style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--brand)', border: '1px solid var(--border-brand)' }}>
                    <span className="spinner size-3 rounded-full border-2" style={{ borderColor: 'rgba(34,211,238,0.25)', borderTopColor: 'var(--brand)' }} />
                    {areaScoped ? 'Loading locations…' : `Loading page ${currentPage}…`}
                </div>
            )}

            <div className="overflow-auto flex-1 rounded-lg border" style={{ borderColor: 'var(--border-soft)' }}>
                <Table className="table-fixed w-full [&_td]:align-top [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
                    <TableHeader className="sticky top-0 z-10" style={{ background: 'rgba(15,23,42,0.92)' }}>
                        <TableRow style={{ borderColor: 'var(--border-soft)' }}>
                            <TableHead className={`w-[4%] text-center py-3 ${headClass}`} style={headStyle}>#</TableHead>
                            <TableHead className={`w-[30%] py-3 ${headClass}`} style={headStyle}>Location Name</TableHead>
                            <TableHead className={`w-[16%] py-3 ${headClass}`} style={headStyle}>Type</TableHead>
                            <TableHead className={`w-[13%] py-3 ${headClass}`} style={headStyle}>Area</TableHead>
                            <TableHead className={`w-[12%] text-center py-3 ${headClass}`} style={headStyle}>Status</TableHead>
                            <TableHead className={`w-[15%] py-3 ${headClass}`} style={headStyle}>Devices</TableHead>
                            <TableHead className={`w-[10%] text-center py-3 ${headClass}`} style={headStyle}>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLocations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12" style={{ color: 'var(--text-lo)' }}>
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-dim)' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>No locations found</p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Try adjusting your filters</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLocations.map((location, index) => {
                                const selected = localSelectedId === location.id;
                                return (
                                    <TableRow
                                        key={location.id}
                                        data-location-id={location.id}
                                        onClick={() => handleRowClick(location.id)}
                                        className="cursor-pointer transition-colors"
                                        style={{
                                            background: selected ? 'rgba(34,211,238,0.10)' : 'transparent',
                                            borderColor: 'var(--border-soft)',
                                            borderLeft: selected ? '3px solid var(--brand)' : '3px solid transparent',
                                        }}
                                    >
                                        <TableCell className="text-center text-sm tabular-nums py-2" style={{ color: 'var(--text-lo)' }}>
                                            {(currentPage - 1) * perPage + index + 1}
                                        </TableCell>
                                        <TableCell className="py-2 whitespace-normal break-words">
                                            <span className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }} title={location.name}>
                                                {location.name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 whitespace-normal break-words">
                                            <span className="badge-info">{location.type_name}</span>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-dim)' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="text-sm truncate" style={{ color: 'var(--text-mid)' }} title={location.area}>
                                                    {location.area}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-2">
                                            <div className="inline-flex items-center justify-center gap-1.5">
                                                <span className={`nms-dot ${location.status === 'online' ? 'nms-dot-online' : 'nms-dot-offline'}`} />
                                                <span className="text-xs font-semibold uppercase tracking-wide" style={{
                                                    color: location.status === 'online' ? 'var(--status-online)' : 'var(--status-offline)'
                                                }}>
                                                    {location.status === 'online' ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: 'var(--status-online)' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-online)' }} />
                                                    {location.devices_online}
                                                </span>
                                                <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: 'var(--status-offline)' }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--status-offline)' }} />
                                                    {location.devices_offline}
                                                </span>
                                                <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: 'var(--text-lo)' }}>
                                                    / {location.devices_total}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-2">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedLocationForAction(location.id); setEditDialogOpen(true); }}
                                                    className="p-1.5 rounded transition-colors hover:bg-white/[0.06]"
                                                    title="Edit location"
                                                    style={{ color: 'var(--brand)' }}
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedLocationForAction(location.id); setDeleteDialogOpen(true); }}
                                                    className="p-1.5 rounded transition-colors hover:bg-white/[0.06]"
                                                    title="Delete location"
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

            {selectedLocationForAction !== null && (
                <EditLocationForm locationId={selectedLocationForAction} open={editDialogOpen} setOpen={setEditDialogOpen} />
            )}
            {selectedLocationForAction !== null && (
                <DeleteLocationForm locationId={selectedLocationForAction} open={deleteDialogOpen} setOpen={setDeleteDialogOpen} />
            )}

            {/* ── Pagination — hidden when scoped to a single area ── */}
            {!areaScoped && (
            <div
                className="flex items-center justify-between px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--border-soft)', background: 'rgba(15,23,42,0.6)' }}
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="perPage" className="text-xs font-medium" style={{ color: 'var(--text-lo)' }}>Items per page:</label>
                        <select
                            id="perPage"
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                lastFetchRef.current = null;
                                setCurrentPage(1);
                            }}
                            className="px-2.5 py-1 rounded-md text-sm focus:outline-none"
                            style={{ background: 'rgba(15,23,42,0.8)', color: 'var(--text-hi)', border: '1px solid var(--border-soft)' }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="text-xs" style={{ color: 'var(--text-lo)' }}>
                        Page <span className="font-semibold tabular-nums" style={{ color: 'var(--text-hi)' }}>{currentPage}</span> / <span className="font-semibold tabular-nums" style={{ color: 'var(--text-hi)' }}>{totalPages}</span>
                        {pagination?.total > 0 && (
                            <span> • <span className="font-semibold tabular-nums" style={{ color: 'var(--text-hi)' }}>{pagination.total}</span> total</span>
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
                        style={{
                            background: 'rgba(15,23,42,0.6)',
                            color: 'var(--text-mid)',
                            borderColor: 'var(--border-soft)',
                        }}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1 rounded-md px-2 py-1" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-soft)' }}>
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
                            className="w-12 text-center text-sm outline-none bg-transparent"
                            style={{ color: 'var(--text-hi)' }}
                        />
                    </div>

                    <Button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        style={{
                            background: 'rgba(15,23,42,0.6)',
                            color: 'var(--text-mid)',
                            borderColor: 'var(--border-soft)',
                        }}
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            )}
        </div>
    );
}