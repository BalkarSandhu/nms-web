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
        const badges: Record<string, { bg: string; text: string; }> = {
            'approved': { bg: 'bg-green-100', text: 'text-green-700' },
            'pending': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            'denied': { bg: 'bg-red-100', text: 'text-red-700' }
        };
        const badge = badges[status.toLowerCase()] || badges['pending'];
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const isActive = status.toLowerCase() === 'active' || status.toLowerCase() === 'online';
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${isActive ? 'bg-green-600' : 'bg-gray-600'}`}></span>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getUtilizationColor = (percent: number) => {
        if (percent >= 90) return 'text-red-600';
        if (percent >= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    useEffect(() => {
        onDataChange?.(filteredWorkers)
    }, [filteredWorkers, onDataChange])

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Filters */}
            <div className="border-b border-gray-200 py-3">
                <WorkersFilters 
                    filterConfigs={filterConfigs}
                    onFiltersChange={setFilters}
                    initialFilters={filters}
                />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                        <TableRow>
                            <TableHead className="font-semibold">Hostname</TableHead>
                            <TableHead className="font-semibold">IP Address</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Max Devices</TableHead>
                            <TableHead className="font-semibold">Current Devices</TableHead>
                            <TableHead className="font-semibold">Utilization</TableHead>
                            <TableHead className="font-semibold">Approval</TableHead>
                            <TableHead className="font-semibold">Version</TableHead>
                            <TableHead className="font-semibold">Last Seen</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredWorkers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    No workers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredWorkers.map((worker) => (
                                <TableRow
                                    key={worker.id}
                                    onClick={() => onRowClick?.(worker.id)}
                                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                        selectedWorkerId === worker.id ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <TableCell className="font-medium">{worker.hostname}</TableCell>
                                    <TableCell className="text-gray-600">{worker.ip_address || 'N/A'}</TableCell>
                                    <TableCell>{getStatusBadge(worker.status)}</TableCell>
                                    <TableCell className="text-gray-600">{worker.max_devices}</TableCell>
                                    <TableCell className="text-gray-600">{worker.deviceCount}</TableCell>
                                    <TableCell>
                                        <span className={`font-semibold ${getUtilizationColor(worker.utilizationPercent)}`}>
                                            {worker.utilizationPercent}%
                                        </span>
                                    </TableCell>
                                    <TableCell>{getApprovalBadge(worker.approval_status)}</TableCell>
                                    <TableCell className="text-gray-600 text-sm">{worker.version || 'N/A'}</TableCell>
                                    <TableCell className="text-gray-600 text-sm">
                                        {worker.last_seen ? new Date(worker.last_seen).toLocaleString() : 'Never'}
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
