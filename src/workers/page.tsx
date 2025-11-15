import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchWorkers } from '@/store/workerSlice';
import { isDataStale } from '@/lib/auth';
import Header from './local-components/header';
import WorkersTable, { type EnrichedWorker } from './local-components/table';
import { WorkerDetailsSidebar } from './local-components/WorkerDetailsSidebar';
import { LoadingPage } from '@/components/loading-screen';
import { exportToCsv, type CsvColumn } from '@/lib/utils';

export default function WorkersPage() {
    const dispatch = useAppDispatch();
    const { loading, error, workers, lastFetched } = useAppSelector(state => state.workers);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [exportRows, setExportRows] = useState<EnrichedWorker[]>([]);

    const exportColumns = useMemo<CsvColumn<EnrichedWorker>[]>(() => [
        { header: 'Hostname', accessor: (row) => row.hostname },
        { header: 'IP Address', accessor: (row) => row.ip_address ?? 'N/A' },
        { header: 'Status', accessor: (row) => row.status },
        { header: 'Max Devices', accessor: (row) => row.max_devices },
        { header: 'Current Devices', accessor: (row) => row.deviceCount },
        { header: 'Utilization %', accessor: (row) => row.utilizationPercent },
        { header: 'Approval', accessor: (row) => row.approval_status },
        { header: 'Version', accessor: (row) => row.version ?? 'N/A' },
        { header: 'Last Seen', accessor: (row) => row.last_seen ?? 'Never' },
    ], []);

    const handleExport = () => {
        if (!exportRows.length) return;
        exportToCsv('workers.csv', exportRows, exportColumns);
    };

    useEffect(() => {
        // Only fetch if workers are not loaded OR data is stale (older than 5 minutes)
        if (!workers || workers.length === 0 || isDataStale(lastFetched)) {
            dispatch(fetchWorkers({}));
        }
    }, [dispatch, workers, lastFetched]);

    if (loading && workers.length === 0) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Workers</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onExport={handleExport} exportDisabled={!exportRows.length} />
                <WorkersTable 
                    onRowClick={(workerId: string) => setSelectedWorkerId(workerId)}
                    selectedWorkerId={selectedWorkerId}
                    onDataChange={setExportRows}
                />
            </div>

            {/* Sidebar */}
            <WorkerDetailsSidebar 
                workerId={selectedWorkerId}
                onClose={() => setSelectedWorkerId(null)}
            />
        </div>
    );
}
