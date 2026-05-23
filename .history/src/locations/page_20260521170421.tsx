import { useMemo, useState } from 'react';
import { Plus, Map as MapIcon } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Header from './local-components/header';
import LocationsTable, { type EnrichedLocation } from './local-components/table';
import { AddLocationForm } from './local-components/AddLocationForm';
import { AddLocationTypeForm } from './local-components/AddLocationTypeForm';
import { exportToCsv, type CsvColumn } from '@/lib/utils';
import { exportToPdf, type TopoLine } from '@/lib/export-report';
import { ExportMenu, type ExportFormat, type HeaderMetric } from '@/components/page-header';

export default function LocationsPage(
    { onBack, onShowTopology }: { onBack?: () => void; onShowTopology?: () => void } = {}
) {
    const { error } = useAppSelector(state => state.locations);
    const [exportRows, setExportRows] = useState<EnrichedLocation[]>([]);
    const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0 });

    const exportColumns = useMemo<CsvColumn<EnrichedLocation>[]>(() => [
        { header: 'S.No', accessor: (_row, index) => index + 1 },
        { header: 'Name', accessor: (row) => row.name },
        { header: 'Area', accessor: (row) => row.area },
        { header: 'Type', accessor: (row) => row.type_name },
        { header: 'Status', accessor: (row) => row.status },
        { header: 'Total Devices', accessor: (row) => row.devices_total },
        { header: 'Online', accessor: (row) => row.devices_online },
        { header: 'Offline', accessor: (row) => row.devices_offline },
    ], []);

    const handleExport = (format: ExportFormat = 'pdf') => {
        if (!exportRows.length) return;
        if (format === 'csv') {
            exportToCsv('locations.csv', exportRows, exportColumns);
            return;
        }
        // Topology section: Area → its locations.
        const byArea = new Map<string, EnrichedLocation[]>();
        for (const l of exportRows) {
            const k = l.area || 'Unassigned';
            let arr = byArea.get(k);
            if (!arr) { arr = []; byArea.set(k, arr); }
            arr.push(l);
        }
        const topology: TopoLine[] = [];
        for (const [areaName, locs] of byArea) {
            topology.push({ label: areaName, depth: 0 });
            for (const l of locs) {
                topology.push({
                    label: `${l.name}  (${l.devices_online}/${l.devices_total} devices)`,
                    depth: 1,
                    status: l.status,
                });
            }
        }
        exportToPdf('locations.pdf', exportRows, exportColumns, {
            title: 'Locations Report',
            topology,
        });
    };

    const metrics: HeaderMetric[] = [
        { label: 'Total Locations', value: summary.total, color: 'var(--text-hi)' },
        { label: 'Online Locations', value: summary.online, color: 'var(--status-online)' },
        { label: 'Offline Locations', value: summary.offline, color: 'var(--status-offline)' },
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
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold"
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
                    <AddLocationForm />
                    <AddLocationTypeForm />
                </PopoverContent>
            </Popover>
            <ExportMenu onExport={handleExport} disabled={!exportRows.length} />
        </>
    );

    return (
        <div className="p-4 flex gap-4 min-h-[90vh] max-h-full w-full fade-in">
            <div className="h-full w-full nms-panel flex flex-col overflow-hidden">
                <Header onBack={onBack} metrics={metrics} />
                {error ? (
                    <div className="p-6 text-center text-sm" style={{ color: 'var(--status-offline)' }}>{error}</div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <LocationsTable
                            onDataChange={setExportRows}
                            onSummaryChange={setSummary}
                            filterActions={filterActions}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
