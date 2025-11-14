import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAllDevices } from '@/store/deviceSlice';
import { isDataStale } from '@/lib/auth';
import Header from './local_components/header';
import DevicesTable from './local_components/table';
import { DeviceDetailsSidebar } from './local_components/DeviceDetailsSidebar';
import { LoadingPage } from '@/components/loading-screen';

export default function DevicesPage() {
    const dispatch = useAppDispatch();
    const { loading, error, devices, lastFetched } = useAppSelector(state => state.devices);
    const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

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
                <Header />
                <DevicesTable 
                    onRowClick={(deviceId: number) => setSelectedDeviceId(deviceId)}
                    selectedDeviceId={selectedDeviceId}
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
