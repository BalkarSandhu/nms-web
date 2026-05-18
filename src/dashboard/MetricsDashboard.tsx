import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function MetricsDashboard({ isButtonClicked }: DashboardProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const { devices: reduxDevices = [] = [], loading, deviceStatistics: reduxDevicesStatistics } =
		useAppSelector(state => state.devices);
	const { locations: reduxLocations = [] = [] } = useAppSelector(state => state.locations);
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

	// ── LIVE TOPOLOGY — areas aggregated from locations ─────────────────────
	// NOTE: must run BEFORE any early returns to preserve hook order.
	const liveTopologyAreas = useMemo(() => {
		const byArea = new Map<string, { online: number; offline: number; partial: number; total: number }>();
		for (const l of activeLocations) {
			const key = (l.area || 'Unassigned').toString();
			const cur = byArea.get(key) || { online: 0, offline: 0, partial: 0, total: 0 };
			cur.total += 1;
			if (l.status === 'online') cur.online += 1;
			else if (l.status === 'offline') cur.offline += 1;
			else if (l.status === 'partial') cur.partial += 1;
			byArea.set(key, cur);
		}
		return Array.from(byArea.entries()).map(([area, s]) => ({ area, ...s }));
	}, [activeLocations]);

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

	// ── DEVICES ─────────────────────────────────────────────────────────────
	const onlineDevicesCount  = deviceStats.online_devices  || 0;
	const offlineDevicesCount = deviceStats.offline_devices || 0;
	const totalDevicesCount   = deviceStats.total_devices   || (onlineDevicesCount + offlineDevicesCount);

	const deviceMetrics = { low: onlineDevicesCount, medium: 0, high: offlineDevicesCount };

	// ── LOCATIONS ────────────────────────────────────────────────────────────
	const onlineLocations   = activeLocations.filter(l => l.status === 'online');
	const partialLocations  = activeLocations.filter(l => l.status === 'partial');
	const offlineLocations  = activeLocations.filter(l => l.status === 'offline');

	const locationMetrics = {
		low:    onlineLocations.length,
		medium: partialLocations.length,
		high:   offlineLocations.length,
	};

	// ── AREAS / WORKERS ──────────────────────────────────────────────────────
	const activeWorkersOnline = activeWorkers.filter(w => w.status === 'ONLINE' || w.status === 'active');
	const offlineWorkersList  = activeWorkers.filter(w => !(w.status === 'ONLINE' || w.status === 'active'));

	const workerMetrics = {
		low:    activeWorkersOnline.length,
		medium: 0,
		high:   offlineWorkersList.length,
	};

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
					reliability: {
						devices: activeDevices.map(d => ({
							id: d.id,
							is_reachable: d.is_reachable,
							consecutive_failures: d.consecutive_failures,
						})),
					},
					liveTopology: {
						areas: liveTopologyAreas,
						totalDevices: totalDevicesCount,
						onlineDevices: onlineDevicesCount,
					},
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
					trend: {
						title: "Location Pulse",
						total: activeLocations.length,
						online: onlineLocations.length,
						offline: offlineLocations.length,
						partial: partialLocations.length,
					},
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
					trend: {
						title: "Area Pulse",
						total: activeWorkers.length,
						online: activeWorkersOnline.length,
						offline: offlineWorkersList.length,
					},
				}}
			/>
		</div>
	);
}
