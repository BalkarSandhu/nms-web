import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

//--local-components
import Section from "./local-components/Section";
import Filters from "./local-components/Filters";

// import { useAPIs } from "@/contexts/API-Context"
// import type { ApiContextType } from "@/contexts/API-Context"

// Redux imports
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices, fetchDeviceTypes, fetchDeviceStatistics } from "@/store/deviceSlice";
import { fetchLocations, fetchLocationTypes } from "@/store/locationsSlice";
import { fetchWorkers, fetchWorkerStats } from "@/store/workerSlice";
import { AlertTriangle } from 'lucide-react';


type DashboardProps = {
	isButtonClicked?: boolean;
	setIsButtonClicked?: (value: boolean) => void;
}

interface WorkerRow {
  id: number;
  name: string;
  [key: string]: any; // optional, if there are extra properties
}


export default function Dashboard({ isButtonClicked }: DashboardProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	// Get data from Redux store
	const { devices: reduxDevices } = useAppSelector(state => state.devices);
	const { locations: reduxLocations } = useAppSelector(state => state.locations);
	const { workers: reduxWorkers } = useAppSelector(state => state.workers);
	const { deviceTypes } = useAppSelector(state => state.devices);
	const { locationTypes } = useAppSelector(state => state.locations);
	const { loading, deviceStatistics: reduxDevicesStatistics } = useAppSelector(state => state.devices);

	// Fetch all data when component mounts
	useEffect(() => {
		// Fetch devices and device types
		dispatch(fetchAllDevices());
		dispatch(fetchDeviceTypes());

		// Fetch device statistics
		dispatch(fetchDeviceStatistics());

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
	const deviceStats = reduxDevicesStatistics;

	// Loading check for device statistics
	
	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-full w-full">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
				<span className="text-white text-lg">Loading device statistics...</span>
			</div>
		);
	}

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
	// const onlineDevices = activeDevices.filter(d => d.status);
	const offlineDevices = activeDevices.filter(d => !d.is_reachable);

	const onlineDevicesCount = deviceStats.online_devices;
	const offlineDevicesCount = deviceStats.offline_devices;

	const deviceMetrics = {
		low: onlineDevicesCount,// Online (green)
		medium: 0, // Not used (keep empty as per requirements)
		high: offlineDevicesCount, // Offline (red)
	};

	// Devices with Critical (offline devices sorted by updated_at)
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

	// Locations with Critical
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

	// Workers with Critical
	const workerDowntimeData = offlineWorkersList
		.map(w => ({
			id: w.id,
			col1: w.name,
			col2: formatDowntime(calculateDowntime(w.last_seen || w.updated_at)),
			downtime: calculateDowntime(w.last_seen || w.updated_at),
			link: `/workers?id=${w.id}`
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// Context-aware navigation callbacks for each section
	const handleDeviceStatusClick = (is_reachable: 'true' | 'false' | 'unknown') => {
		navigate(`/devices?is_reachable=${is_reachable === 'true' ? 'false' : 'online'}`);
	};
// 	const handleMetricItemClick = (item: MetricItem) => {
//     // Navigate to /devices with device_type_name equal to clicked item's label
//     navigate(`/devices?device_type_name=${encodeURIComponent(item.label)}`);
// };


	const handleLocationStatusClick = (status: 'online' | 'offline' | 'unknown') => {
		navigate(`/locations?status=${encodeURIComponent(status)}`);
	};

	const handleWorkerStatusClick = (status: 'online' | 'offline' | 'unknown') => {
		navigate(`/areas?status=${status === 'online' ? 'ONLINE' : 'offline'}`);
	};


	// MAP DATA PREPARATION
	// Devices Map Data - show devices on map with green for online, red for offline
	const devicesMapData = activeDevices
		.map(d => {
			// Find the location for this device
			const location = activeLocations.find(l => l.id === d.location_id);
			if (!location) return null;

			const isOnline = d.is_reachable;
			return {
				id: `device-${d.id}`,
				name: d.display || d.hostname,
				coordinates: [location.longitude, location.latitude] as [number, number],
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
		const isUnknown = l.status === 'unknown';
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
			coordinates: [l.longitude, l.latitude] as [number, number],
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
				name: w.name,
				coordinates: [workerLocation.longitude, workerLocation.latitude] as [number, number],
				value: isOnline ? 100 : 50,
				category: isOnline ? ('green' as const) : ('red' as const),
				popupData: {
					indicatorColour: isOnline ? ('green' as const) : ('red' as const),
					headerLeft: { field: 'Worker', value: w.name },
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
		<div className="flex flex-col p-2 bg-linear-to-b from-(--base) to-(--dark) w-full min-h-full">
			<div
				className={`transition-all duration-500 ease-in-out overflow-hidden ${isButtonClicked ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
					}`}
			>
				<Filters
					fromDate={"2024-01-01"}
					toDate={"2024-12-31"}
					onFromDateChange={() => { }}
					onToDateChange={() => { }}
					selectedLocationType="1"
					onLocationTypeChange={() => { }}
					selectedDeviceType="1"
					onDeviceTypeChange={() => { }}
					selectedWorker="1"
					onWorkerChange={() => { }}
					selectedLocation="1"
					onLocationChange={() => { }}
					deviceTypes={[{ value: "1", label: "Device Type A" }, { value: "2", label: "Device Type B" }]}
					locationTypes={[{ value: "1", label: "Location Type A" }, { value: "2", label: "Location Type B" }]}
					locations={[{ value: "1", label: "Location A" }, { value: "2", label: "Location B" }]}

					workers={[{ value: "1", label: "Worker John" }, { value: "2", label: "Worker Jane" }]}
				/>

			</div>

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
						title: (
							<div className="flex items-center gap-2">
								<AlertTriangle 
									size={20} 
									className="text-yellow-400 alert-vibrate"
								/>

								<span className="
									bg-red-600 
									text-white 
									px-2 
									py-0.5 
									rounded-md 
									text-sm 
									font-bold 
									alert-shine 
									alert-vibrate
								">
									Critical
								</span>
							</div>
						),
						headers: { col1: "Device", col2: "Downtime" },
						data: deviceDowntimeData,
						maxRows: 5,
						onRowClick: (row: WorkerRow) => navigate(`/devices?id=${row.id}`)
					},


					metric3: undefined,
					metric4: activeDevices
						.reduce((acc, d) => {
							// Find the device type by ID
							const devicetype = deviceTypes.find(dt => dt.id === d.device_type_id);
							const typeName = devicetype?.name || "Unknown";

							const found = acc.find(item => item.label === typeName);
							if (found) {
								found.value += 1;
							} else {
								acc.push({ label: typeName, value: 1 });
							}
							return acc;
						}, [] as { label: string; value: number }[])
						.sort((a, b) => b.value - a.value)
						.slice(0, 5)
				}}
			/>

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
						title: "Critical",
						headers: { col1: "Location", col2: "Downtime" },
						data: locationDowntimeData,
						maxRows: 5,
						onRowClick: (row:WorkerRow) => navigate(`/locations?id=${row.id}`)
					},
					metric3: undefined,
					metric4: activeLocations
						.reduce((acc, l) => {
							// Find the location type by ID
							const locationType = locationTypes.find(lt => lt.id === l.location_type_id);
							const typeName = locationType?.name || "Unknown";

							const found = acc.find(item => item.label === typeName);
							if (found) {
								found.value += 1;
							} else {
								acc.push({ label: typeName, value: 1 });
							}
							return acc;
						}, [] as { label: string; value: number }[])
						.sort((a, b) => b.value - a.value)
						.slice(0, 5)
				}}
			/>


			<Section
				title="Areas"
				mapData={workersMapData}
				metricsData={{
					metric1: {
						title: "Area Status",
						data: workerMetrics,
						labels: { low: "ONLINE", medium: "", high: "OFFLINE" },
						onStatusClick: handleWorkerStatusClick
					},
					metric2: {
						title: "Critical",
						headers: { col1: "Area", col2: "Downtime" },
						data: workerDowntimeData,
						maxRows: 5,
						onRowClick: (row:WorkerRow) => navigate(`/workers/${row.id}`)
					},
					metric3: undefined,
					metric4: undefined
				}}
			/>
		</div>
	)
}
