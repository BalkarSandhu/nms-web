import Header from './local-components/header';
import DeviceContent from './local-components/device-content';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useSearchParams } from 'react-router-dom';
import { fetchAllDevices } from '@/store/deviceSlice';
import { useEffect, useMemo } from 'react';
import { isDataStale } from '@/lib/auth';

export default function DeviceInfoPage() {
    const [searchParams] = useSearchParams();
    const dispatch = useAppDispatch();
    const { devices, loading, lastFetched } = useAppSelector(state => state.devices);
    const deviceId = Number(searchParams.get('id'));
    const deviceInformation = devices.find(device => device.id === deviceId);

    useEffect(() => {
        // Only fetch if devices are not loaded OR data is stale (older than 5 minutes)
        if (!devices.length || isDataStale(lastFetched)) {
            dispatch(fetchAllDevices());
        }
    }, [dispatch, devices.length, lastFetched]);


    // Show loading state while fetching
    if (loading && devices.length === 0) {
        return(
            <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
                <Header />
                <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
                    Loading device information...
                </div>
            </div>
        )
    }

    // Show error if device not found after loading
    if(!deviceInformation) {
        return(
            <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
                <Header />
                <div className="flex w-full h-full items-center justify-center text-(--text-secondary)">
                    No device information available for ID: {deviceId}
                </div>
            </div>
        )
    }
    const deviceData = useMemo(() => {
        if (!deviceInformation) {
            return [
                { label: "Device Name", value: "Workstation-01" },
                { label: "Device Type", value: "Workstation" },
                { label: "IP Address", value: "192.168.1.100" }
            ];
        }

        return [
            { label: "Display Name", value: deviceInformation.display || deviceInformation.hostname || "N/A" },
            { label: "Hostname", value: deviceInformation.hostname || "N/A" },
            { label: "IP Address", value: `${deviceInformation.ip}:${deviceInformation.port}` },
            { label: "Protocol", value: deviceInformation.protocol || "N/A" },
            { label: "Device Type", value: deviceInformation.device_type?.name || "Unknown" },
            { label: "Location", value: deviceInformation.location?.name || "Unknown" },
            { label: "Worker", value: deviceInformation.worker?.hostname || "Unknown" },
            { label: "Status", value: deviceInformation.status ? "Online" : "Offline" },
            { label: "Status Reason", value: deviceInformation.status_reason || "N/A" },
            { label: "Check Interval (s)", value: deviceInformation.check_interval },
            { label: "Timeout (s)", value: deviceInformation.timeout },
            { label: "Last Ping", value: new Date(deviceInformation.last_ping).toLocaleString() },
            { label: "Created", value: new Date(deviceInformation.created_at).toLocaleString() },
            { label: "Updated", value: new Date(deviceInformation.updated_at).toLocaleString() }
        ];
    }, [deviceInformation]);

    const deviceStatusData = useMemo(() => {
        if (!deviceInformation) {
            return [
                { status: 1 as 0 | 1 | 2, message: "All systems operational", timestamp: "2024-10-01 10:00 AM" },
                { status: 0 as 0 | 1 | 2, message: "Device not reachable", timestamp: "2024-10-01 09:45 AM" }
            ];
        }

        return [
            {
                status: (deviceInformation.status ? 1 : 0) as 0 | 1 | 2,
                message: deviceInformation.status_reason || (deviceInformation.status ? 'Device is online' : 'Device is offline'),
                timestamp: new Date(deviceInformation.last_ping).toLocaleString(),
            },
            {
                status: (deviceInformation.disabled ? 2 : 1) as 0 | 1 | 2,
                message: deviceInformation.disabled ? 'Device is disabled' : 'Device is active',
                timestamp: new Date(deviceInformation.updated_at).toLocaleString(),
            }
        ];
    }, [deviceInformation]);

    return (
        <div className="flex flex-col gap-4 w-full h-full p-4 bg-(--contrast)">
            <Header />
            <div className="flex w-full h-full">
                <DeviceContent
                    deviceData={deviceData}
                    deviceStatusData={deviceStatusData}
                />
            </div>
            <div></div>
        </div>
    );
}
