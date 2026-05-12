import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/store/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import WorkersFilters, { FilterConfig } from '@/workers/local-components/filters';
import type { Worker } from '@/store/workerSlice';

// Enriched worker type with additional computed fields
export type EnrichedWorker = Worker & {
    deviceCount: number;
    utilizationPercent: number;
};

// Props type for the WorkersTable component
type WorkersTableProps = {
    onRowClick?: (workerId: string) => void;
    selectedWorkerId?: string | null;
    onDataChange?: (rows: EnrichedWorker[]) => void;
};

export default function WorkersTable({ onRowClick, selectedWorkerId, onDataChange }: WorkersTableProps) {
    const { workers } = useAppSelector(state => state.workers);
    const { devices } = useAppSelector(state => state.devices);
    
    const [filters, setFilters] = useState<Record<string, string>>(() => {
        // Initialize from the URL
        try {
            const params = new URLSearchParams(window.location.search);
            const statusParam = params.get('status');
            const init: Record<string, string> = {};
            if (statusParam) {
                const normalized = String(statusParam).toLowerCase();
                init.status = normalized;
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
            setFilters(prev => ({ ...prev, status: normalized }));
        } else {
            // If param removed, clear the status filter
            setFilters(prev => {
                const copy = { ...prev };
                delete copy.status;
                return copy;
            });
        }
    }, [searchParams]);

    // Create enriched workers with device count
    const enrichedWorkers = useMemo((): EnrichedWorker[] => {
        return workers.map(worker => {
            const workerDevices = devices.filter(d => d.worker_id === worker.id);
            const deviceCount = workerDevices.length;
            const utilizationPercent = worker.max_devices > 0 
                ? Math.round((deviceCount / worker.max_devices) * 100)
                : 0;

            return {
                ...worker,
                deviceCount,
                utilizationPercent
            };
        });
    }, [workers, devices]);

    // Generate filter configurations dynamically from worker data
    const filterConfigs = useMemo((): FilterConfig[] => {
        const approvalStatuses = [...new Set(workers.map(w => w.approval_status))].filter(Boolean);
        const statuses = [...new Set(workers.map(w => w.status))].filter(Boolean);

        return [
            {
                label: 'Approval',
                key: 'approval_status',
                options: approvalStatuses.map(status => ({
                    label: status.charAt(0).toUpperCase() + status.slice(1),
                    value: status
                }))
            },
            {
                label: 'Status',
                key: 'status',
                options: statuses.map(status => ({
                    label: status.charAt(0).toUpperCase() + status.slice(1),
                    value: status
                }))
            }
        ];
    }, [workers]);

    // Apply filters to enriched workers
    const filteredWorkers = useMemo(() => {
        return enrichedWorkers.filter(worker => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                
                const workerValue = worker[key as keyof EnrichedWorker];
                if (workerValue === null || workerValue === undefined) return false;
                
                return String(workerValue).toLowerCase() === value.toLowerCase();
            });
        });
    }, [enrichedWorkers, filters]);

    const getApprovalBadge = (status: string) => {
        const key = (status || '').toLowerCase();
        const cls =
            key === 'approved' ? 'badge-success' :
            key === 'denied'   ? 'badge-critical' :
                                 'badge-warning';
        return <span className={cls}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}</span>;
    };

    const getStatusBadge = (status: string) => {
        const isActive = status?.toLowerCase() === 'active' || status?.toLowerCase() === 'online';
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: isActive ? 'var(--status-online)' : 'var(--text-lo)' }}>
                <span className={`nms-dot ${isActive ? 'nms-dot-online' : 'nms-dot-offline'}`} />
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
            </span>
        );
    };

    useEffect(() => {
        onDataChange?.(filteredWorkers)
    }, [filteredWorkers, onDataChange])

    const headStyle: React.CSSProperties = { color: 'var(--text-lo)' };
    const headClass = "font-semibold text-[11px] uppercase tracking-[0.14em]";

    return (
        <div className="flex-1 flex flex-col overflow-hidden px-4 py-2 gap-3">
            <div>
                <WorkersFilters
                    filterConfigs={filterConfigs}
                    onFiltersChange={setFilters}
                    initialFilters={filters}
                />
            </div>

            <div className="flex-1 overflow-auto rounded-lg border" style={{ borderColor: 'var(--border-soft)' }}>
                <Table>
                    <TableHeader className="sticky top-0 z-10" style={{ background: 'rgba(15,23,42,0.92)' }}>
                        <TableRow style={{ borderColor: 'var(--border-soft)' }}>
                            <TableHead className={headClass} style={headStyle}>Hostname</TableHead>
                            <TableHead className={headClass} style={headStyle}>IP Address</TableHead>
                            <TableHead className={headClass} style={headStyle}>Current Devices</TableHead>
                            <TableHead className={headClass} style={headStyle}>Last Seen</TableHead>
                            <TableHead className={headClass} style={headStyle}>Status</TableHead>
                            <TableHead className={headClass} style={headStyle}>Approval</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWorkers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-10" style={{ color: 'var(--text-lo)' }}>
                                    No workers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredWorkers.map((worker) => {
                                const selected = selectedWorkerId === worker.id;
                                return (
                                    <TableRow
                                        key={worker.id}
                                        onClick={() => onRowClick?.(worker.id)}
                                        className="cursor-pointer transition-colors"
                                        style={{
                                            background: selected ? 'rgba(34,211,238,0.10)' : 'transparent',
                                            borderColor: 'var(--border-soft)',
                                            borderLeft: selected ? '3px solid var(--brand)' : '3px solid transparent',
                                        }}
                                    >
                                        <TableCell className="font-medium" style={{ color: 'var(--text-hi)' }}>{worker.name}</TableCell>
                                        <TableCell className="font-mono text-xs" style={{ color: 'var(--text-mid)' }}>{worker.ip_address || 'N/A'}</TableCell>
                                        <TableCell className="tabular-nums" style={{ color: 'var(--text-mid)' }}>{worker.deviceCount}</TableCell>
                                        <TableCell className="text-sm" style={{ color: 'var(--text-lo)' }}>
                                            {worker.last_seen ? new Date(worker.last_seen).toLocaleString() : 'Never'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(worker.status)}</TableCell>
                                        <TableCell>{getApprovalBadge(worker.approval_status)}</TableCell>
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
