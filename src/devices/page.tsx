import { useEffect, useMemo, useState } from 'react';
import { Plus, Map as MapIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAllDevices, fetchDeviceTypes } from '@/store/deviceSlice';
import { fetchAllLocationsPaginated } from '@/store/locationsSlice';
import { isDataStale } from '@/lib/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Header from './local_components/header';
import DevicesTable from './local_components/table';
import AddDeviceForm from './local_components/AddDeviceForm';
import { AddDeviceTypeForm } from './local_components/AddDeviceTypeForm';
import { LoadingPage } from '@/components/loading-screen';
import { exportToCsv, type CsvColumn } from '@/lib/utils';
import { exportToPdf, type TopoLine } from '@/lib/export-report';
import { ExportMenu, type ExportFormat, type HeaderMetric } from '@/components/page-header';
import type { readDeviceType } from '@/contexts/read-Types';

export default function DevicesPage(
    { onBack, onShowTopology }: { onBack?: () => void; onShowTopology?: () => void } = {}
) {
    const dispatch = useAppDispatch();
    const { loading, error, devices, lastFetched } = useAppSelector(state => state.devices);
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
    const [exportRows, setExportRows] = useState<readDeviceType[]>([]);
    const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0 });

    const exportColumns = useMemo<CsvColumn<readDeviceType>[]>(() => [
        { header: 'S.No', accessor: (_row, index) => index + 1 },
        { header: 'Name', accessor: (row) => row.display },
        { header: 'Location', accessor: (row) => row.location.name ?? 'N/A' },
        { header: 'Hostname', accessor: (row) => row.hostname },
        { header: 'Type', accessor: (row) => row.device_type.name },
        { header: 'Status', accessor: (row) => (row.is_reachable ? 'Online' : 'Offline') },
    ], []);

    const handleExport = (format: ExportFormat = 'pdf') => {
        if (!exportRows.length) return;
        if (format === 'csv') {
            exportToCsv('devices.csv', exportRows, exportColumns);
            return;
        }
        // Topology section: Location → its devices.
        const byLoc = new Map<string, readDeviceType[]>();
        for (const d of exportRows) {
            const k = d.location?.name || 'Unassigned';
            let arr = byLoc.get(k);
            if (!arr) { arr = []; byLoc.set(k, arr); }
            arr.push(d);
        }
        const topology: TopoLine[] = [];
        for (const [loc, devs] of byLoc) {
            topology.push({ label: loc, depth: 0 });
            for (const d of devs) {
                topology.push({
                    label: d.display || d.hostname,
                    depth: 1,
                    status: d.is_reachable ? 'online' : 'offline',
                });
            }
        }
        exportToPdf('devices.pdf', exportRows, exportColumns, {
            title: 'Devices Report',
            topology,
        });
    };

    useEffect(() => {
        if (isDataStale(lastFetched)) {
            dispatch(fetchAllDevices());
            dispatch(fetchAllLocationsPaginated());
            dispatch(fetchDeviceTypes());
        }
    }, [dispatch, devices.length, lastFetched]);

    if (loading && devices.length === 0) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center nms-panel p-8">
                    <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--status-offline)' }}>Error Loading Devices</h2>
                    <p className="text-sm" style={{ color: 'var(--text-mid)' }}>{error}</p>
                </div>
            </div>
        );
    }

    // Row click only highlights the row — device detail view is disabled.
    const handleDeviceSelect = (deviceId: number) => {
        setSelectedDeviceId(deviceId);
    };

    const metrics: HeaderMetric[] = [
        { label: 'Total Devices', value: summary.total, color: 'var(--text-hi)' },
        { label: 'Online Devices', value: summary.online, color: 'var(--status-online)' },
        { label: 'Offline Devices', value: summary.offline, color: 'var(--status-offline)' },
    ];

    const filterActions = (
        <>
            {onShowTopology && (
                <button
                    type="button"
                    onClick={onShowTopology}
                    title="Show topology"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors"
                    style={{
                        background: 'var(--brand-soft)',
                        border: '1px solid var(--border-brand)',
                        color: 'var(--brand)',
                        cursor: 'pointer',
                    }}
                >
                    <MapIcon className="size-4" />
                    Topology
                </button>
            )}
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all duration-150"
                        style={{
                            background: 'linear-gradient(180deg, var(--status-online) 0%, #059669 100%)',
                            color: '#fff',
                            boxShadow: '0 6px 14px -8px rgba(16,185,129,0.7)',
                        }}
                    >
                        <Plus className="size-4" />
                        Add
                    </button>
                </PopoverTrigger>
                <PopoverContent>
                    <AddDeviceForm />
                    <AddDeviceTypeForm />
                </PopoverContent>
            </Popover>
            <ExportMenu onExport={handleExport} disabled={!exportRows.length} />
        </>
    );

    return (
        <div className="flex h-full w-full gap-2 p-4 fade-in" style={{ backgroundColor: 'transparent' }}>
            <div className="flex-1 flex flex-col overflow-hidden nms-panel">
                <Header onBack={onBack} metrics={metrics} />
                <div className="flex-1 overflow-hidden">
                    <DevicesTable
                        onRowClick={handleDeviceSelect}
                        selectedDeviceId={selectedDeviceId}
                        onDataChange={setExportRows}
                        onSummaryChange={setSummary}
                        filterActions={filterActions}
                    />
                </div>
            </div>
        </div>
    );
}
