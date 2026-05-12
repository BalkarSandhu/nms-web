import { useEffect, useMemo, useState } from 'react';
// import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAllDevices, fetchDeviceTypes } from '@/store/deviceSlice';
import {fetchAllLocationsPaginated} from '@/store/locationsSlice';
import { isDataStale } from '@/lib/auth';
import Header from './local_components/header';
import DevicesTable from './local_components/table';
// import { DeviceDetailsSidebar } from './local_components/DeviceDetailsSidebar';
import { LoadingPage } from '@/components/loading-screen';
import { exportToCsv, type CsvColumn } from '@/lib/utils';
import type { readDeviceType } from '@/contexts/read-Types';
import { useNavigate } from "react-router-dom";

export default function DevicesPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    // const [searchParams, setSearchParams] = useSearchParams();
    const { loading, error, devices, lastFetched } = useAppSelector(state => state.devices);
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
    const [exportRows, setExportRows] = useState<readDeviceType[]>([]);
    const exportColumns = useMemo<CsvColumn<readDeviceType>[]>(() => [
        { header: 'S.No', accessor: (_row, index) => index + 1 },
        { header: 'Display Name', accessor: (row) => row.display },
        { header: 'Hostname', accessor: (row) => row.hostname },
        { header: 'IP', accessor: (row) => `${row.ip}:${row.port}` },
        { header: 'Type', accessor: (row) => row.device_type.name },
        { header: 'Status', accessor: (row) => (row.is_reachable ? 'Online' : 'Offline') },
        { header: 'Location', accessor: (row) => row.location.name ?? 'N/A' },
        { header: 'Worker', accessor: (row) => row.worker.name ?? 'N/A' },
        { header: 'Failures', accessor: (row) => row.consecutive_failures },
    ], []);

    const handleExport = () => {
        if (!exportRows.length) return;
        exportToCsv('devices.csv', exportRows, exportColumns);
    };

    // Handle modal close - clear URL parameter
    // const handleModalClose = () => {
    //     const params = new URLSearchParams(searchParams);
    //     params.delete('id');
    //     setSearchParams(params);
    //     setSelectedDeviceId(null);
    // };
    useEffect(() => {
        // Only fetch if devices are not loaded OR data is stale (older than 5 minutes)
        if (isDataStale(lastFetched)) {
            dispatch(fetchAllDevices());
            // dispatch(fetchLocations());
            // dispatch(fetchLocationsforMap());
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
    const handleDeviceNavigate = (deviceId: number) => {
        setSelectedDeviceId(deviceId);
        navigate(`/device-info?id=${deviceId}`);
    };
    return (
        <div className="flex h-full w-full gap-2 p-4 fade-in" style={{ backgroundColor: 'transparent' }}>
            <div className="flex-1 flex flex-col overflow-hidden nms-panel">
                <Header onExport={handleExport} exportDisabled={!exportRows.length} />
                <div className="flex-1 overflow-hidden">
                    <DevicesTable
                        onRowClick={handleDeviceNavigate}
                        selectedDeviceId={selectedDeviceId}
                        onDataChange={setExportRows}
                    />
                </div>
            </div>
        </div>
    );
}