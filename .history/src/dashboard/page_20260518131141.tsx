import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Server, Wifi, WifiOff } from 'lucide-react';

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLocationsforMap, fetchLocationTypes, type Location } from "@/store/locationsSlice";
import { fetchAllDevices } from "@/store/deviceSlice";
import type { readDeviceType } from "@/contexts/read-Types";
import { useOverviewMode, type OverviewMode } from "@/contexts/OverviewModeContext";

/* One aggregated row per area. Device counts are derived by joining the
   devices list (location_id + is_reachable) onto each location's area —
   the location records themselves return device_count = 0. */
interface AreaSummaryRow {
	area: string;
	totalLocations: number;
	onlineLocations: number;
	offlineLocations: number;
	totalDevices: number;
	onlineDevices: number;
}

function aggregateByArea(
	locations: Location[],
	devices: readDeviceType[]
): AreaSummaryRow[] {
	const areaByLocId = new Map<number, string>();
	const acc = new Map<
		string,
		{ totalLoc: number; onlineLoc: number; offlineLoc: number; totalDev: number; onlineDev: number }
	>();
	const get = (area: string) => {
		let v = acc.get(area);
		if (!v) {
			v = { totalLoc: 0, onlineLoc: 0, offlineLoc: 0, totalDev: 0, onlineDev: 0 };
			acc.set(area, v);
		}
		return v;
	};

	for (const l of locations) {
		const area = l.area || 'Unassigned';
		areaByLocId.set(l.id, area);
		const v = get(area);
		v.totalLoc += 1;
		if (l.status === 'online') v.onlineLoc += 1;
		else if (l.status === 'offline') v.offlineLoc += 1;
	}

	for (const d of devices) {
		const area = areaByLocId.get(d.location_id);
		if (!area) continue;
		const v = get(area);
		v.totalDev += 1;
		if (d.is_reachable) v.onlineDev += 1;
	}

	return Array.from(acc.entries())
		.map(([area, v]) => ({
			area,
			totalLocations: v.totalLoc,
			onlineLocations: v.onlineLoc,
			offlineLocations: v.offlineLoc,
			totalDevices: v.totalDev,
			onlineDevices: v.onlineDev,
		}))
		.sort((a, b) => a.area.localeCompare(b.area));
}

/* Pick the metric set the cards display, based on the header toggle. */
interface AreaMetrics {
	pct: number; // % online (devices or locations)
	total: number;
	online: number;
	offline: number;
	caption: string;
	totalLabel: string;
}
function metricsFor(a: AreaSummaryRow, mode: OverviewMode): AreaMetrics {
	if (mode === 'links') {
		const total = a.totalLocations;
		const online = a.onlineLocations;
		return {
			total,
			online,
			offline: a.offlineLocations,
			pct: total > 0 ? Math.round((online / total) * 100) : 0,
			caption: 'Locations Online',
			totalLabel: 'Total Loc',
		};
	}
	const total = a.totalDevices;
	const online = a.onlineDevices;
	return {
		total,
		online,
		offline: total - online,
		pct: total > 0 ? Math.round((online / total) * 100) : 0,
		caption: 'Devices Online',
		totalLabel: 'Total ',
	};
}

/* ─── Role helpers ──────────────────────────────────────────────────────
   role === 'admin'  → can see every area (one card per area)
   any other role    → that value IS the user's single area; show only it
──────────────────────────────────────────────────────────────────────── */
function isAdminRole(role?: string | null): boolean {
	if (!role) return true; // no user (e.g. auth-bypass dev) → treat as admin
	return role.trim().toLowerCase().includes('admin');
}

/* Card colour is driven purely by the active % online. */
function accentFor(total: number, pct: number): string {
	if (total === 0) return 'var(--text-dim)';
	if (pct >= 80) return 'var(--status-online)';
	if (pct >= 50) return 'var(--status-warning)';
	return 'var(--status-offline)';
}

export default function Dashboard() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { mode } = useOverviewMode();

	const { locations: reduxLocations = [], loading } = useAppSelector(state => state.locations);
	const { devices: reduxDevices = [] } = useAppSelector(state => state.devices);
	const user = useAppSelector(state => state.auth.user);

	useEffect(() => {
		dispatch(fetchLocationsforMap());
		dispatch(fetchLocationTypes());
		dispatch(fetchAllDevices());
	}, [dispatch]);

	const activeLocations = Array.isArray(reduxLocations) ? reduxLocations : [];
	const activeDevices = Array.isArray(reduxDevices) ? reduxDevices : [];

	// One row per area, with device + location counts.
	const allAreas: AreaSummaryRow[] = useMemo(
		() => aggregateByArea(activeLocations, activeDevices),
		[activeLocations, activeDevices]
	);

	// Admin → all areas. Single-area user → only the card whose area
	// matches their role (case-insensitive).
	const admin = isAdminRole(user?.role);
	const visibleAreas = useMemo(() => {
		if (admin) return allAreas;
		const myArea = (user?.role ?? '').trim().toLowerCase();
		return allAreas.filter(a => a.area.trim().toLowerCase() === myArea);
	}, [allAreas, admin, user?.role]);

	const openArea = (area: string) =>
		navigate(`/topology?area=${encodeURIComponent(area)}`);

	if (loading && allAreas.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full w-full gap-3 fade-in">
				<div
					className="h-9 w-9 rounded-full border-2 spinner"
					style={{ borderColor: 'rgba(34,211,238,0.25)', borderTopColor: 'var(--brand)' }}
				/>
				<span className="text-sm" style={{ color: 'var(--text-mid)' }}>
					Synchronising network state…
				</span>
			</div>
		);
	}

	return (
		<div
			className="flex flex-col w-full min-h-full fade-in"
			style={{ background: 'var(--bg-app)', color: 'var(--text-hi)' }}
		>
			{/* ── Area card grid ─────────────────────────────────────── */}
			<div className="flex-1 px-6 py-6">
				{visibleAreas.length === 0 ? (
					<div
						className="flex flex-col items-center justify-center gap-3 py-24"
						style={{ color: 'var(--text-lo)' }}
					>
						<MapPin size={42} style={{ opacity: 0.35 }} />
						<p className="text-sm">
							{admin
								? 'No areas available yet.'
								: `No area assigned for "${user?.role}".`}
						</p>
					</div>
				) : (
					<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
						{visibleAreas.map(a => {
							const m = metricsFor(a, mode);
							const accent = accentFor(m.total, m.pct);
							return (
								<button
									key={a.area}
									type="button"
									onClick={() => openArea(a.area)}
									className="group relative rounded-xl overflow-hidden text-left transition-all hover:-translate-y-0.5 stagger-item"
									style={{
										background:
											'linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.92) 100%)',
										border: `1px solid color-mix(in oklab, ${accent} 35%, var(--border-soft))`,
										boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 8%, transparent), var(--shadow-card)`,
										minHeight: 110,
										cursor: 'pointer',
									}}
								>
									<span
										aria-hidden
										className="absolute top-0 left-0 right-0"
										style={{
											height: 3,
											background: `linear-gradient(90deg, ${accent}, transparent)`,
										}}
									/>
									<span
										aria-hidden
										className="pointer-events-none absolute inset-0"
										style={{
											background: `radial-gradient(460px 130px at 100% 0%, color-mix(in oklab, ${accent} 14%, transparent), transparent 65%)`,
										}}
									/>

									<div className="relative h-full flex flex-col p-3">
										{/* Top row: status pill (left) · AREA NAME (right) */}
										<div className="flex items-center">
											<span
												className="flex-1 min-w-0 text-base font-bold tracking-tight truncate text-left"
												style={{ color: 'var(--text-hi)' }}
												title={a.area}
											>
												{a.area}
											</span>
										</div>

										{/* Center: % online — the focal point */}
										<div className="flex-1 flex flex-col items-center justify-center py-1">
											<span
												className="text-3xl font-bold tabular-nums leading-none"
												style={{ color: accent }}
											>
												{m.pct}
												<span className="text-base align-top">%</span>
											</span>
											<span
												className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em]"
												style={{ color: 'var(--text-lo)' }}
											>
												{m.caption}
											</span>
										</div>

										{/* Footer stats */}
										<div
											className="grid grid-cols-3 gap-2 pt-2"
											style={{ borderTop: '1px solid var(--border-soft)' }}
										>
											{[
												{
													icon:
														mode === 'links' ? (
															<MapPin size={13} />
														) : (
															<Server size={13} />
														),
													label: m.totalLabel,
													value: m.total,
													color: 'var(--text-hi)',
												},
												{
													icon: <Wifi size={13} />,
													label: 'Online',
													value: m.online,
													color: 'var(--status-online)',
												},
												{
													icon: <WifiOff size={13} />,
													label: 'Offline',
													value: m.offline,
													color: 'var(--status-offline)',
												},
											].map(stat => (
												<div
													key={stat.label}
													className="flex flex-col items-center gap-0.5"
												>
													<span style={{ color: 'var(--text-lo)' }}>{stat.icon}</span>
													<span
														className="text-sm font-bold leading-none tabular-nums"
														style={{ color: stat.color }}
													>
														{stat.value}
													</span>
													<span
														className="text-[9px] font-semibold uppercase tracking-[0.1em]"
														style={{ color: 'var(--text-lo)' }}
													>
														{stat.label}
													</span>
												</div>
											))}
										</div>

										{/* Hover CTA */}
										<div
											className="absolute inset-x-0 bottom-0 px-5 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity"
											style={{
												background:
													'linear-gradient(180deg, transparent, rgba(6,182,212,0.16))',
												color: 'var(--brand)',
											}}
										>
											Open Topology
											<ChevronRight size={13} />
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
