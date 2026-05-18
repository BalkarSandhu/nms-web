import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
	ArrowLeft, MapPin, Server, Wifi, WifiOff, Activity, Layers,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
	fetchLocationsforMap, fetchLocationTypes, type Location,
} from '@/store/locationsSlice';
import { fetchAllDevices } from '@/store/deviceSlice';
import type { readDeviceType } from '@/contexts/read-Types';

function statusColor(s: string): string {
	if (s === 'online') return 'var(--status-online)';
	if (s === 'offline') return 'var(--status-offline)';
	if (s === 'partial') return 'var(--status-warning)';
	return 'var(--text-dim)';
}

export default function AreaDetailPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const search = useLocation().search;
	const area = useMemo(
		() => new URLSearchParams(search).get('area') || '',
		[search]
	);

	const { locations: reduxLocations = [], locationTypes = [], loading } =
		useAppSelector(state => state.locations);
	const { devices: reduxDevices = [] } = useAppSelector(state => state.devices);

	useEffect(() => {
		dispatch(fetchLocationsforMap());
		dispatch(fetchLocationTypes());
		dispatch(fetchAllDevices());
	}, [dispatch]);

	const allLocations = Array.isArray(reduxLocations) ? reduxLocations : [];
	const allDevices = Array.isArray(reduxDevices) ? reduxDevices : [];

	const typeName = useMemo(() => {
		const m = new Map<number, string>();
		for (const t of locationTypes) m.set(t.id, t.name || t.location_type || 'Unknown');
		return (id: number) => m.get(id) || 'Unknown';
	}, [locationTypes]);

	// Locations belonging to this area.
	const areaLocations: Location[] = useMemo(
		() => allLocations.filter(l => (l.area || 'Unassigned') === area),
		[allLocations, area]
	);
	const areaLocIds = useMemo(
		() => new Set(areaLocations.map(l => l.id)),
		[areaLocations]
	);

	// Devices whose location is in this area.
	const areaDevices: readDeviceType[] = useMemo(
		() =>
			allDevices.filter(
				d => d.location?.area === area || areaLocIds.has(d.location_id)
			),
		[allDevices, area, areaLocIds]
	);

	const stats = useMemo(() => {
		const onlineDev = areaDevices.filter(d => d.is_reachable).length;
		const onlineLoc = areaLocations.filter(l => l.status === 'online').length;
		const offlineLoc = areaLocations.filter(l => l.status === 'offline').length;
		const totalDev = areaDevices.length;
		return {
			totalLocations: areaLocations.length,
			onlineLocations: onlineLoc,
			offlineLocations: offlineLoc,
			totalDevices: totalDev,
			onlineDevices: onlineDev,
			offlineDevices: totalDev - onlineDev,
			health: totalDev > 0 ? Math.round((onlineDev / totalDev) * 100) : 0,
		};
	}, [areaDevices, areaLocations]);

	const devicesByLoc = useMemo(() => {
		const m = new Map<number, { total: number; online: number }>();
		for (const d of allDevices) {
			const cur = m.get(d.location_id) || { total: 0, online: 0 };
			cur.total += 1;
			if (d.is_reachable) cur.online += 1;
			m.set(d.location_id, cur);
		}
		return m;
	}, [allDevices]);

	const accent = statusColor(
		stats.offlineDevices > 0 && stats.onlineDevices === 0
			? 'offline'
			: stats.health >= 80
			? 'online'
			: stats.health >= 50
			? 'partial'
			: 'offline'
	);

	if (loading && allLocations.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full w-full gap-3 fade-in">
				<div
					className="h-9 w-9 rounded-full border-2 spinner"
					style={{ borderColor: 'rgba(34,211,238,0.25)', borderTopColor: 'var(--brand)' }}
				/>
				<span className="text-sm" style={{ color: 'var(--text-mid)' }}>
					Loading area details…
				</span>
			</div>
		);
	}

	const kpis = [
		{ label: 'Locations', value: stats.totalLocations, icon: <MapPin size={16} />, color: 'var(--text-hi)' },
		{ label: 'Devices', value: stats.totalDevices, icon: <Server size={16} />, color: 'var(--text-hi)' },
		{ label: 'Devices Online', value: stats.onlineDevices, icon: <Wifi size={16} />, color: 'var(--status-online)' },
		{ label: 'Devices Offline', value: stats.offlineDevices, icon: <WifiOff size={16} />, color: 'var(--status-offline)' },
		{ label: 'Loc. Online', value: stats.onlineLocations, icon: <Wifi size={16} />, color: 'var(--status-online)' },
		{ label: 'Loc. Offline', value: stats.offlineLocations, icon: <WifiOff size={16} />, color: 'var(--status-offline)' },
		{ label: 'Health', value: `${stats.health}%`, icon: <Activity size={16} />, color: accent },
	];

	return (
		<div
			className="flex flex-col w-full min-h-full fade-in"
			style={{ background: 'var(--bg-app)', color: 'var(--text-hi)' }}
		>
			{/* Header */}
			<div
				className="flex items-center gap-3 px-6 py-4 border-b"
				style={{ borderColor: 'var(--border-soft)' }}
			>
				<button
					type="button"
					onClick={() => navigate('/')}
					title="Back"
					aria-label="Back"
					className="inline-flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-panel)] text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--border-brand)] transition-colors"
					style={{ width: 34, height: 34, cursor: 'pointer' }}
				>
					<ArrowLeft size={16} />
				</button>
				<div
					className="flex items-center justify-center rounded-lg shrink-0"
					style={{
						width: 40, height: 40,
						background: `color-mix(in oklab, ${accent} 16%, transparent)`,
						border: `1px solid color-mix(in oklab, ${accent} 34%, transparent)`,
						color: accent,
					}}
				>
					<Layers size={20} />
				</div>
				<div className="min-w-0">
					<div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>
						Area Details
					</div>
					<h1 className="text-xl font-bold tracking-tight truncate" style={{ color: 'var(--text-hi)' }}>
						{area || 'Unknown Area'}
					</h1>
				</div>
			</div>

			<div className="flex-1 px-6 py-5 flex flex-col gap-6">
				{/* KPI / metrics */}
				<div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
					{kpis.map(k => (
						<div
							key={k.label}
							className="rounded-xl p-3 flex flex-col gap-1"
							style={{
								background: 'linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.92) 100%)',
								border: '1px solid var(--border-soft)',
							}}
						>
							<span style={{ color: 'var(--text-lo)' }}>{k.icon}</span>
							<span className="text-2xl font-bold tabular-nums leading-none" style={{ color: k.color }}>
								{k.value}
							</span>
							<span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-lo)' }}>
								{k.label}
							</span>
						</div>
					))}
				</div>

				<div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
					{/* Locations list */}
					<Section title={`Locations · ${areaLocations.length}`} icon={<MapPin size={15} />}>
						{areaLocations.length === 0 ? (
							<Empty label="No locations in this area" />
						) : (
							areaLocations.map(l => {
								const dc = devicesByLoc.get(l.id) || { total: 0, online: 0 };
								return (
									<Row
										key={l.id}
										title={l.name}
										subtitle={typeName(l.location_type_id)}
										status={l.status}
										right={`${dc.online}/${dc.total} dev`}
									/>
								);
							})
						)}
					</Section>

					{/* Devices list */}
					<Section title={`Devices · ${areaDevices.length}`} icon={<Server size={15} />}>
						{areaDevices.length === 0 ? (
							<Empty label="No devices in this area" />
						) : (
							areaDevices.map(d => (
								<Row
									key={d.id}
									title={d.display || d.hostname}
									subtitle={`${d.hostname} · ${d.device_type?.name ?? 'Unknown'}`}
									status={d.is_reachable ? 'online' : 'offline'}
									right={d.location?.name ?? ''}
								/>
							))
						)}
					</Section>
				</div>
			</div>
		</div>
	);
}

function Section({
	title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
	return (
		<div
			className="rounded-xl flex flex-col overflow-hidden"
			style={{
				background: 'linear-gradient(180deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.85) 100%)',
				border: '1px solid var(--border-soft)',
			}}
		>
			<div
				className="flex items-center gap-2 px-4 py-3 border-b text-sm font-semibold"
				style={{ borderColor: 'var(--border-soft)', color: 'var(--text-hi)' }}
			>
				<span style={{ color: 'var(--brand)' }}>{icon}</span>
				{title}
			</div>
			<div className="max-h-[420px] overflow-y-auto">{children}</div>
		</div>
	);
}

function Row({
	title, subtitle, status, right,
}: { title: string; subtitle: string; status: string; right: string }) {
	const c = statusColor(status);
	return (
		<div
			className="flex items-center gap-3 px-4 py-2.5 border-b"
			style={{ borderColor: 'var(--border-soft)' }}
		>
			<span
				className="w-2 h-2 rounded-full shrink-0"
				style={{ background: c, boxShadow: `0 0 6px ${c}` }}
			/>
			<div className="min-w-0 flex-1">
				<div className="text-sm font-semibold truncate" style={{ color: 'var(--text-hi)' }} title={title}>
					{title}
				</div>
				<div className="text-[11px] truncate" style={{ color: 'var(--text-lo)' }}>
					{subtitle}
				</div>
			</div>
			<span
				className="text-[10px] font-bold uppercase tracking-[0.1em] shrink-0"
				style={{ color: c }}
			>
				{status}
			</span>
			{right && (
				<span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--text-mid)' }}>
					{right}
				</span>
			)}
		</div>
	);
}

function Empty({ label }: { label: string }) {
	return (
		<div className="py-12 text-center text-sm" style={{ color: 'var(--text-lo)' }}>
			{label}
		</div>
	);
}
