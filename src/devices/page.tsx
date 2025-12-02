import { useEffect, useMemo, useState } from 'react';
// import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAllDevices, fetchDeviceTypes } from '@/store/deviceSlice';
import { fetchLocations } from '@/store/locationsSlice';
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
        { header: 'Status', accessor: (row) => (row.status ? 'Online' : 'Offline') },
        { header: 'Location', accessor: (row) => row.location.name ?? 'N/A' },
        { header: 'Worker', accessor: (row) => row.worker.hostname ?? 'N/A' },
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
        if (!devices.length || isDataStale(lastFetched)) {
            dispatch(fetchAllDevices());
            dispatch(fetchLocations());
            dispatch(fetchDeviceTypes());
        }
    }, [dispatch, devices.length, lastFetched]);

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

    const handleDeviceNavigate = (deviceId: number) => {
        setSelectedDeviceId(deviceId);
        navigate(`/device-info?id=${deviceId}`);
    };

    return (
        <div className="flex h-full p-2 w-full bg-(--contrast) gap-2 ">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden p-2 w-8/10">
                <Header onExport={handleExport} exportDisabled={!exportRows.length} />
                <DevicesTable 
                    onRowClick={handleDeviceNavigate}
                    selectedDeviceId={selectedDeviceId}
                    onDataChange={setExportRows}
                />
            </div>

            {/* Sidebar */}
            {/* <DeviceDetailsSidebar 
                deviceId={selectedDeviceId}
                onClose={handleModalClose}
            /> */}
        </div>
    );
}