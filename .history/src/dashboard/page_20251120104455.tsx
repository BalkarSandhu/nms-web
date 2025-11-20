import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

//--local-components
import Section from "./local-components/Section";
import Filters from "./local-components/Filters";

// import { useAPIs } from "@/contexts/API-Context"
// import type { ApiContextType } from "@/contexts/API-Context"

// Redux imports
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices, fetchDeviceTypes } from "@/store/deviceSlice";
import { fetchLocations, fetchLocationTypes } from "@/store/locationsSlice";
import { fetchWorkers, fetchWorkerStats } from "@/store/workerSlice";

type DashboardProps = {
	isButtonClicked?: boolean;
	setIsButtonClicked?: (value: boolean) => void;
}

export default function Dashboard({ isButtonClicked }: DashboardProps) {

	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	// Get data from Redux store
	const { devices: reduxDevices } = useAppSelector(state => state.devices);
	const { locations: reduxLocations } = useAppSelector(state => state.locations);
	const { workers: reduxWorkers } = useAppSelector(state => state.workers);

	// Fetch all data when component mounts
	useEffect(() => {
		// Fetch devices and device types
		dispatch(fetchAllDevices());
		dispatch(fetchDeviceTypes());

		// Fetch locations and location types
		dispatch(fetchLocations());
		dispatch(fetchLocationTypes());

		// Fetch workers and worker stats (with default params)
		dispatch(fetchWorkers({}));
		dispatch(fetchWorkerStats());
	}, [dispatch]);

	// Use only Redux data for dashboard metrics
	const activeDevices = reduxDevices;
	const activeLocations = reduxLocations;
	const activeWorkers = reduxWorkers;

	// Note: Removed blocking loading check to allow UI to render immediately
	// Data will populate as API calls complete in parallel

	// Helper function to calculate downtime in hours
	const calculateDowntime = (updatedAt: string): number => {
		const now = new Date();
		const lastUpdate = new Date(updatedAt);
		const diffMs = now.getTime() - lastUpdate.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60)); // hours
	};

	// Helper function to format downtime
	const formatDowntime = (hours: number): string => {
		if (hours < 1) return '< 1h';
		if (hours < 24) return `${hours}h`;
		const days = Math.floor(hours / 24);
		const remainingHours = hours % 24;
		return `${days}d ${remainingHours}h`;
	};

	// DEVICES METRICS
	const onlineDevices = activeDevices.filter(d => d.status);
	const offlineDevices = activeDevices.filter(d => !d.status);
	
	const deviceMetrics = {
		low: onlineDevices.length, // Online (green)
		medium: 0, // Not used (keep empty as per requirements)
		high: offlineDevices.length // Offline (red)
	};

	// Devices with longest downtime (offline devices sorted by updated_at)
	const deviceDowntimeData = offlineDevices
		.map(d => ({
			id: d.id,
			col1: d.display || d.hostname,
			col2: formatDowntime(calculateDowntime(d.updated_at)),
			downtime: calculateDowntime(d.updated_at),
			link: `/devices?id=${d.id}`
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// LOCATIONS METRICS
	const onlineLocations = activeLocations.filter(l => l.status === 'online');
	const unknownLocations = activeLocations.filter(l => l.status === 'unknown');
	const offlineLocations = activeLocations.filter(l => l.status === 'offline');
	
	const locationMetrics = {
		low: onlineLocations.length, // Online (green)
		medium: unknownLocations.length, // Not used (keep empty)
		high: offlineLocations.length // Offline (red)
	};

	// Locations with longest downtime
	const locationDowntimeData = [...offlineLocations, ...unknownLocations]
		.map(l => ({
			id: l.id,
			col1: l.name,
			col2: formatDowntime(calculateDowntime(l.updated_at || l.created_at || new Date().toISOString())),
			downtime: calculateDowntime(l.updated_at || l.created_at || new Date().toISOString()),
			link: `/locations?id=${l.id}`
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// WORKERS METRICS
	const activeWorkersOnline = activeWorkers.filter(w => w.status === 'ONLINE' || w.status === 'active');
	const offlineWorkersList = activeWorkers.filter(w => w.status === 'OFFLINE' || w.status !== 'ONLINE');
	
	const workerMetrics = {
		low: activeWorkersOnline.length, // Active (green)
		medium: 0, // Not used (keep empty)
		high: offlineWorkersList.length // Offline (red)
	};

	// Workers with longest downtime
	const workerDowntimeData = offlineWorkersList
		.map(w => ({
			id: w.id,
			col1: w.hostname,
			col2: formatDowntime(calculateDowntime(w.last_seen || w.updated_at)),
			downtime: calculateDowntime(w.last_seen || w.updated_at),
			link: `/workers?id=${w.id}`
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// Context-aware navigation callbacks for each section
	const handleDeviceStatusClick = (status: 'online' | 'offline' | 'unknown') => {
		navigate(`/devices?status=${status === 'online' ? 'online' : 'offline'}`);
	};

	const handleLocationStatusClick = (status: 'online' | 'offline'| 'unknown') => {
		navigate(`/locations?status=${encodeURIComponent(status)}`);
	};

	const handleWorkerStatusClick = (status: 'online' | 'offline' | 'unknown') => {
		navigate(`/workers?status=${status === 'online' ? 'ONLINE' : 'offline'}`);
	};
	

	// MAP DATA PREPARATION
	// Devices Map Data - show devices on map with green for online, red for offline
	const devicesMapData = activeDevices
		.map(d => {
			// Find the location for this device
			const location = activeLocations.find(l => l.id === d.location_id);
			if (!location) return null;

			const isOnline = d.status;
			return {
				id: `device-${d.id}`,
				name: d.display || d.hostname,
				coordinates: [location.lng, location.lat] as [number, number],
				value: isOnline ? 100 : 50,
				category: isOnline ? ('green' as const) : ('red' as const),
				popupData: {
					indicatorColour: isOnline ? ('green' as const) : ('red' as const),
					headerLeft: { field: 'Device', value: d.display || d.hostname },
					headerRight: { field: 'IP', value: d.ip },
					sideLabel: { field: 'Status', value: isOnline ? 'Online' : 'Offline' },
					data: [
						{ field: 'Location', value: location.name, colour: 'white' as const },
						{ field: 'Last Ping', value: new Date(d.last_ping).toLocaleString(), colour: 'blue' as const },
						{ field: 'Failures', value: d.consecutive_failures.toString(), colour: d.consecutive_failures > 0 ? ('red' as const) : ('green' as const) },
					]
				}
			};
		})
		.filter((item) => item !== null);

	// Locations Map Data - show locations with circles (green for online, red for offline)
	const locationsMapData = activeLocations.map(l => {
		const isOnline = l.status === 'online';
		const isUnknown=l.status==='unknown';
		let indicatorColour: 'green' | 'red';
		let category: 'green' | 'red' | 'azul';
		let value: number;

		if (isOnline) {
			indicatorColour = 'green';
			category = 'green';
			value = 100;
		} else if (isUnknown) {
			indicatorColour = 'green';
			category = 'azul';
			value = 75;
		} else {
			indicatorColour = 'red';
			category = 'red';
			value = 50;
		}
		return {
			id: `location-${l.id}`,
			name: l.name,
			coordinates: [l.lng, l.lat] as [number, number],
			value: value,
			category: category,


			popupData: {
				indicatorColour: indicatorColour,
				headerLeft: { field: 'Location', value: l.name },
				headerRight: { field: 'Project', value: l.project },
				sideLabel: { field: 'Area', value: l.area },
				data: [
					{ 
						field: 'Status', 
						value: l.status.charAt(0).toUpperCase() + l.status.slice(1), 
						colour: indicatorColour
					},
					{ field: 'Type', value: l.location_type_id.toString(), colour: 'blue' as const },
				]
			}
		};
	});

	// Workers Map Data - show workers on map, use associated location lat/lng if worker doesn't have coordinates
	const workersMapData = activeWorkers
		.map(w => {
			// Placeholder: Use first location - in real implementation, you'd look up worker's assigned location
			const workerLocation = activeLocations[0];
			
			if (!workerLocation) return null;

			const isOnline = w.status === 'ONLINE' || w.status === 'active';
			return {
				id: `worker-${w.id}`,
				name: w.hostname,
				coordinates: [workerLocation.lng, workerLocation.lat] as [number, number],
				value: isOnline ? 100 : 50,
				category: isOnline ? ('green' as const) : ('red' as const),
				popupData: {
					indicatorColour: isOnline ? ('green' as const) : ('red' as const),
					headerLeft: { field: 'Worker', value: w.hostname },
					headerRight: { field: 'IP', value: w.ip_address },
					sideLabel: { field: 'Status', value: w.status },
					data: [
						{ field: 'Last Seen', value: new Date(w.last_seen).toLocaleString(), colour: 'white' as const },
						{ field: 'Max Devices', value: w.max_devices.toString(), colour: 'blue' as const },
						{ field: 'Approval', value: w.approval_status, colour: w.approval_status === 'approved' ? ('green' as const) : ('red' as const) },
					]
				}
			};
		})
		.filter((item) => item !== null);

	return (
		<div className="flex flex-col gap-2 p-2 bg-linear-to-b from-(--base) to-(--dark) w-full min-h-full">
			<div
				className={`transition-all duration-500 ease-in-out overflow-hidden ${isButtonClicked ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
					}`}
			>
				<Filters
					fromDate={"2024-01-01"}
					toDate={"2024-12-31"}
					onFromDateChange={() => {}}
					onToDateChange={() => {}}
					selectedLocationType="1"
					onLocationTypeChange={() => {}}
					selectedDeviceType="1"
					onDeviceTypeChange={() => {}}
					selectedWorker="1"
					onWorkerChange={() => {}}
					selectedLocation="1"
					onLocationChange={() => {}}
					deviceTypes={[{ value: "1", label: "Device Type A" }, { value: "2", label: "Device Type B" }]}
					locationTypes={[{ value: "1", label: "Location Type A" }, { value: "2", label: "Location Type B" }]}
					locations={[{ value: "1", label: "Location A" }, { value: "2", label: "Location B" }]}
					
					workers={[{ value: "1", label: "Worker John" }, { value: "2", label: "Worker Jane" }]}
				/>
				
			</div>

// DEVICES SECTION
<Section
    title="Devices"
    mapData={devicesMapData}
    metricsData={{
        metric1: {
            title: "Device Status",
            data: deviceMetrics,
            labels: { low: "Online", medium: "", high: "Offline" },
            onStatusClick: handleDeviceStatusClick
        },
        metric2: {
            title: "Longest Downtime",
            headers: { col1: "Device", col2: "Downtime" },
            data: deviceDowntimeData,
            maxRows: 5,
            onRowClick: (row) => navigate(`/devices/${row.id}`) // Proper navigation
        },
        metric3: undefined // Empty for now
    }}
/>

// LOCATIONS SECTION
<Section
    title="Locations"
    mapData={locationsMapData}
    metricsData={{
        metric1: {
            title: "Location Status",
            data: locationMetrics,
            labels: { low: "Online", medium: "Unknown", high: "Offline" },
            onStatusClick: handleLocationStatusClick
        },
        metric2: {
            title: "Longest Downtime",
            headers: { col1: "Location", col2: "Downtime" },
            data: locationDowntimeData,
            maxRows: 5,
            onRowClick: (row) => navigate(`/locations/${row.id}`)
        },
        metric3: undefined
    }}
/>

// WORKERS SECTION
<Section
    title="Workers"
    mapData={workersMapData}
    metricsData={{
        metric1: {
            title: "Worker Status",
            data: workerMetrics,
            labels: { low: "ONLINE", medium: "", high: "OFFLINE" },
            onStatusClick: handleWorkerStatusClick
        },
        metric2: {
            title: "Longest Downtime",
            headers: { col1: "Worker", col2: "Downtime" },
            data: workerDowntimeData,
            maxRows: 5,
            onRowClick: (row) => navigate(`/workers/${row.id}`)
        },
        metric3: undefined
    }}
/>
		</div>
	)
}
