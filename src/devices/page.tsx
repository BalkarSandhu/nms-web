import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAllDevices } from '@/store/deviceSlice';
import { isDataStale } from '@/lib/auth';
import Header from './local_components/header';
import DevicesTable, { type EnrichedDevice } from './local_components/table';
import { DeviceDetailsSidebar } from './local_components/DeviceDetailsSidebar';
import { LoadingPage } from '@/components/loading-screen';
import { exportToCsv, type CsvColumn } from '@/lib/utils';

export default function DevicesPage() {
    const dispatch = useAppDispatch();
    const { loading, error, devices, lastFetched } = useAppSelector(state => state.devices);
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
    const [exportRows, setExportRows] = useState<EnrichedDevice[]>([]);

    const exportColumns = useMemo<CsvColumn<EnrichedDevice>[]>(() => [
        { header: 'S.No', accessor: (_row, index) => index + 1 },
        { header: 'Display Name', accessor: (row) => row.display },
        { header: 'Hostname', accessor: (row) => row.hostname },
        { header: 'IP', accessor: (row) => `${row.ip}:${row.port}` },
        { header: 'Type', accessor: (row) => row.device_type_name },
        { header: 'Status', accessor: (row) => (row.status ? 'Online' : 'Offline') },
        { header: 'Location', accessor: (row) => row.location_name ?? 'N/A' },
        { header: 'Worker', accessor: (row) => row.worker_hostname ?? 'N/A' },
        { header: 'Failures', accessor: (row) => row.consecutive_failures },
    ], []);

    const handleExport = () => {
        if (!exportRows.length) return;
        exportToCsv('devices.csv', exportRows, exportColumns);
    };

    useEffect(() => {
        // Only fetch if devices are not loaded OR data is stale (older than 5 minutes)
        if (!devices || devices.length === 0 || isDataStale(lastFetched)) {
            dispatch(fetchAllDevices());
        }
    }, [dispatch, devices, lastFetched]);

    if (loading && devices.length === 0) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Devices</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full p-2 w-full bg-(--contrast) gap-2 ">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden p-2 w-8/10">
                <Header onExport={handleExport} exportDisabled={!exportRows.length} />
                <DevicesTable 
                    onRowClick={(deviceId: number) => setSelectedDeviceId(deviceId)}
                    selectedDeviceId={selectedDeviceId}
                    onDataChange={setExportRows}
                />
            </div>

            {/* Sidebar */}
            <DeviceDetailsSidebar 
                deviceId={selectedDeviceId}
                onClose={() => setSelectedDeviceId(null)}
            />
        </div>
    );
}
