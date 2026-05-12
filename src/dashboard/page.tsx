import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import Section from "./local-components/Section";
import Filters from "./local-components/Filters";
import OverviewStrip from "./local-components/OverviewStrip";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices, fetchDeviceTypes, fetchDeviceStatistics } from "@/store/deviceSlice";
import { fetchLocationsforMap, fetchLocationTypes } from "@/store/locationsSlice";
import { fetchWorkers, fetchWorkerStats } from "@/store/workerSlice";

type DashboardProps = {
	isButtonClicked?: boolean;
	setIsButtonClicked?: (value: boolean) => void;
}

interface WorkerRow {
	id: number;
	name: string;
	[key: string]: any;
}

export default function Dashboard({ isButtonClicked }: DashboardProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const { devices: reduxDevices = [], deviceTypes = [], loading, deviceStatistics: reduxDevicesStatistics } =
		useAppSelector(state => state.devices);
	const { locations: reduxLocations = [], locationTypes = [] } = useAppSelector(state => state.locations);
	const { workers: reduxWorkers = [] } = useAppSelector(state => state.workers);

	useEffect(() => {
		dispatch(fetchAllDevices());
		dispatch(fetchDeviceTypes());
		dispatch(fetchDeviceStatistics());
		dispatch(fetchLocationsforMap());
		dispatch(fetchLocationTypes());
		dispatch(fetchWorkers({}));
		dispatch(fetchWorkerStats());
	}, [dispatch]);

	const activeDevices   = Array.isArray(reduxDevices)   ? reduxDevices   : [];
	const activeLocations = Array.isArray(reduxLocations) ? reduxLocations : [];
	const activeWorkers   = Array.isArray(reduxWorkers)   ? reduxWorkers   : [];
	const deviceStats = reduxDevicesStatistics || {
		online_devices: 0, offline_devices: 0, active_devices: 0,
		protocol_stats: {}, total_devices: 0, device_type_stats: {},
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-full w-full gap-3 fade-in">
				<div
					className="h-9 w-9 rounded-full border-2 spinner"
					style={{ borderColor: 'rgba(34,211,238,0.25)', borderTopColor: 'var(--brand)' }}
				/>
				<span className="text-sm" style={{ color: 'var(--text-mid)' }}>Synchronising network state…</span>
			</div>
		);
	}

	const calculateDowntime = (updatedAt: string): number => {
		const now = new Date();
		const lastUpdate = new Date(updatedAt);
		const diffMs = now.getTime() - lastUpdate.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60));
	};

	const formatDowntime = (hours: number): string => {
		if (hours < 1) return '< 1h';
		if (hours < 24) return `${hours}h`;
		const days = Math.floor(hours / 24);
		const remainingHours = hours % 24;
		return `${days}d ${remainingHours}h`;
	};

	// ── DEVICES ─────────────────────────────────────────────────────────────
	const offlineDevices = activeDevices.filter(d => !d.is_reachable);
	const onlineDevicesCount  = deviceStats.online_devices  || 0;
	const offlineDevicesCount = deviceStats.offline_devices || 0;
	const totalDevicesCount   = deviceStats.total_devices   || (onlineDevicesCount + offlineDevicesCount);

	const deviceMetrics = { low: onlineDevicesCount, medium: 0, high: offlineDevicesCount };

	const deviceDowntimeData = offlineDevices
		.map(d => ({
			id: d.id,
			col1: d.display || d.hostname,
			col2: formatDowntime(calculateDowntime(d.updated_at)),
			downtime: calculateDowntime(d.updated_at),
			link: `/devices?id=${d.id}`,
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// ── LOCATIONS ────────────────────────────────────────────────────────────
	const onlineLocations   = activeLocations.filter(l => l.status === 'online');
	const partialLocations  = activeLocations.filter(l => l.status === 'partial');
	const unknownLocations  = activeLocations.filter(l => l.status === 'unknown');
	const offlineLocations  = activeLocations.filter(l => l.status === 'offline');

	const locationMetrics = {
		low:    onlineLocations.length,
		medium: partialLocations.length,
		high:   offlineLocations.length,
	};

	const locationDowntimeData = [...offlineLocations, ...unknownLocations, ...partialLocations]
		.map(l => ({
			id: l.id,
			col1: l.name,
			col2: formatDowntime(calculateDowntime(l.updated_at || l.created_at || new Date().toISOString())),
			downtime: calculateDowntime(l.updated_at || l.created_at || new Date().toISOString()),
			link: `/locations?id=${l.id}`,
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// ── AREAS / WORKERS ──────────────────────────────────────────────────────
	const activeWorkersOnline = activeWorkers.filter(w => w.status === 'ONLINE' || w.status === 'active');
	const offlineWorkersList  = activeWorkers.filter(w => !(w.status === 'ONLINE' || w.status === 'active'));

	const workerMetrics = {
		low:    activeWorkersOnline.length,
		medium: 0,
		high:   offlineWorkersList.length,
	};

	const workerDowntimeData = offlineWorkersList
		.map(w => ({
			id: w.id,
			col1: w.name,
			col2: formatDowntime(calculateDowntime(w.last_seen || w.updated_at)),
			downtime: calculateDowntime(w.last_seen || w.updated_at),
			link: `/workers?id=${w.id}`,
		}))
		.sort((a, b) => b.downtime - a.downtime)
		.slice(0, 10);

	// ── Navigation helpers ───────────────────────────────────────────────────
	const handleDeviceStatusClick = (status: 'unknown' | 'online' | 'offline') => {
		if (status === 'online')       navigate('/devices?is_reachable=true');
		else if (status === 'offline') navigate('/devices?is_reachable=false');
		else                           navigate('/devices');
	};
	const handleLocationStatusClick = (status: 'online' | 'offline' | 'unknown') => {
		navigate(`/locations?status=${encodeURIComponent(status)}`);
	};
	const handleWorkerStatusClick = (status: 'online' | 'offline' | 'unknown') => {
		navigate(`/areas?status=${status === 'online' ? 'ONLINE' : 'offline'}`);
	};

	// ── Map data ─────────────────────────────────────────────────────────────
	const devicesMapData = activeDevices
		.map(d => {
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
					headerLeft:  { field: 'Device', value: d.display || d.hostname },
					headerRight: { field: 'IP',     value: d.ip },
					sideLabel:   { field: 'Status', value: isOnline ? 'Online' : 'Offline' },
					data: [
						{ field: 'Location',     value: location.name, colour: 'white' as const },
						{ field: 'Last Updated', value: new Date(d.updated_at).toLocaleString(), colour: 'blue' as const },
						{ field: 'Failures',     value: d.consecutive_failures.toString(), colour: d.consecutive_failures > 0 ? ('red' as const) : ('green' as const) },
					],
				},
			};
		})
		.filter(item => item !== null);

	const locationsMapData = activeLocations.map(l => {
		const isOnline  = l.status === 'online';
		const isUnknown = l.status === 'unknown';
		let indicatorColour: 'green' | 'red';
		let category: 'green' | 'red' | 'azul';
		let value: number;
		if (isOnline)       { indicatorColour = 'green'; category = 'green'; value = 100; }
		else if (isUnknown) { indicatorColour = 'green'; category = 'azul';  value = 75;  }
		else                { indicatorColour = 'red';   category = 'red';   value = 50;  }
		return {
			id: `location-${l.id}`,
			name: l.name,
			coordinates: [l.longitude, l.latitude] as [number, number],
			value,
			category,
			popupData: {
				indicatorColour,
				headerLeft:  { field: 'Location', value: l.name },
				headerRight: { field: 'Project',  value: l.project || 'N/A' },
				sideLabel:   { field: 'Area',     value: l.area },
				data: [
					{ field: 'Status', value: l.status.charAt(0).toUpperCase() + l.status.slice(1), colour: indicatorColour },
					{ field: 'Type',   value: l.location_type_id.toString(), colour: 'blue' as const },
				],
			},
		};
	});

	const workersMapData = activeWorkers
		.map(w => {
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
					headerLeft:  { field: 'Worker', value: w.name },
					headerRight: { field: 'IP',     value: w.ip_address },
					sideLabel:   { field: 'Status', value: w.status },
					data: [
						{ field: 'Last Seen',   value: new Date(w.last_seen).toLocaleString(), colour: 'white' as const },
						{ field: 'Max Devices', value: w.max_devices.toString(), colour: 'blue' as const },
						{ field: 'Approval',    value: w.approval_status, colour: w.approval_status === 'approved' ? ('green' as const) : ('red' as const) },
					],
				},
			};
		})
		.filter(item => item !== null);

	// ── Health score (network) ───────────────────────────────────────────────
	const healthScore = totalDevicesCount
		? Math.round((onlineDevicesCount / totalDevicesCount) * 100)
		: 100;

	return (
		<div className="flex flex-col gap-4 p-4 w-full min-h-full fade-in">
			{/* Filters drawer (legacy — surfaced when the parent toggles it) */}
			<div
				className={`transition-all duration-500 ease-in-out overflow-hidden ${
					isButtonClicked ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
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

			{/* Top KPI strip */}
			<OverviewStrip
				devicesTotal={totalDevicesCount}
				devicesOnline={onlineDevicesCount}
				locationsTotal={activeLocations.length}
				locationsOffline={offlineLocations.length}
				areasOnline={activeWorkersOnline.length}
				areasTotal={activeWorkers.length}
				healthScore={healthScore}
				onDevicesClick={() => navigate('/devices')}
				onLocationsClick={() => navigate('/locations')}
				onAreasClick={() => navigate('/areas')}
			/>

			{/* Sections */}
			<Section
				title="Devices"
				mapData={devicesMapData}
				metricsData={{
					metric1: {
						title: "Device Status",
						data: deviceMetrics,
						labels: { low: "Online", medium: "", high: "Offline" },
						onStatusClick: handleDeviceStatusClick,
					},
					metric2: {
						title: (
							<div className="flex items-center gap-2">
								<AlertTriangle size={14} className="text-amber-400 alert-vibrate" />
								<span className="badge-critical alert-shine">Critical</span>
							</div>
						),
						headers: { col1: "Device", col2: "Downtime" },
						data: deviceDowntimeData,
						maxRows: 5,
						onRowClick: (row: WorkerRow) => navigate(`/devices?id=${row.id}`),
					},
					metric3: undefined,
					metric4: activeDevices
						.reduce((acc, d) => {
							const devicetype = deviceTypes.find(dt => dt.id === d.device_type_id);
							const typeName = devicetype?.name || "Unknown";
							const found = acc.find(item => item.label === typeName);
							if (found) {
								found.value += 1;
								if (!found.navigateTarget) found.navigateTarget = '/devices';
							} else {
								acc.push({ label: typeName, value: 1, navigateTarget: '/devices' });
							}
							return acc;
						}, [] as { label: string; value: number; navigateTarget?: string }[])
						.sort((a, b) => b.value - a.value)
						.slice(0, 5),
				}}
			/>

			<Section
				title="Locations"
				mapData={locationsMapData}
				metricsData={{
					metric1: {
						title: "Location Status",
						data: locationMetrics,
						labels: { low: "Online", medium: "Partial", high: "Offline" },
						onStatusClick: handleLocationStatusClick,
					},
					metric2: {
						title: (
							<div className="flex items-center gap-2">
								<AlertTriangle size={14} className="text-amber-400" />
								<span className="badge-critical">Critical</span>
							</div>
						),
						headers: { col1: "Location", col2: "Downtime" },
						data: locationDowntimeData,
						maxRows: 5,
						onRowClick: (row: WorkerRow) => navigate(`/locations?id=${row.id}`),
					},
					metric3: undefined,
					metric4: activeLocations
						.reduce((acc, l) => {
							const locationType = locationTypes.find(lt => lt.id === l.location_type_id);
							const typeName = locationType?.name || "Unknown";
							const found = acc.find(item => item.label === typeName);
							if (found) {
								found.value += 1;
								if (!found.navigateTarget) found.navigateTarget = '/locations';
							} else {
								acc.push({ label: typeName, value: 1, navigateTarget: '/locations' });
							}
							return acc;
						}, [] as { label: string; value: number; navigateTarget?: string }[])
						.sort((a, b) => b.value - a.value)
						.slice(0, 5),
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
						onStatusClick: handleWorkerStatusClick,
					},
					metric2: {
						title: (
							<div className="flex items-center gap-2">
								<AlertTriangle size={14} className="text-amber-400" />
								<span className="badge-critical">Critical</span>
							</div>
						),
						headers: { col1: "Area", col2: "Downtime" },
						data: workerDowntimeData,
						maxRows: 5,
						onRowClick: (row: WorkerRow) => navigate(`/workers?${row.id}`),
					},
					metric3: undefined,
					metric4: undefined,
				}}
			/>
		</div>
	);
}
