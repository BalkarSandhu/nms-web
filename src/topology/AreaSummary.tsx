'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Activity, ChevronRight, Search, RefreshCw,
  Wifi, WifiOff, AlertTriangle, LayoutGrid, Server, ArrowLeft, Map as MapIcon,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchLocationsforMap } from '@/store/locationsSlice';
import AreaMapView, { buildAreaMarkers, type AreaMarker } from './AreaMapView';

interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown' | 'partial';
  project?: string;
  area: string;
  description?: string;
  device_count?: number;
  online_device_count?: number;
  offline_device_count?: number;
  health_percentage?: number;
  children?: Location[];
}

interface AreaSummaryProps {
  allLocations: Location[];
  onAreaSelect: (area: string) => void;
  onOpenCluster?: (area: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  lastUpdated?: Date | null;
}

/* Online-% → card colour.
   100 green · ≥80 dark green · ≥60 amber (orange→green) ·
   ≥50 orange · ≥40 orange→red · <40 red. */
function onlinePctColor(pct: number): string {
  if (pct >= 100) return '#22C55E'; // green
  if (pct >= 80)  return '#15803D'; // dark green
  if (pct >= 60)  return '#EAB308'; // amber (orange→green)
  if (pct >= 50)  return '#F59E0B'; // orange
  if (pct >= 40)  return '#F97316'; // orange→red
  return '#EF4444';                 // red
}

const AreaSummary: React.FC<AreaSummaryProps> = ({
  allLocations,
  onAreaSelect,
  onOpenCluster,
  onRefresh,
  loading = false,
  lastUpdated = null,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'grid'>('map');

  // Use Redux locations for lat/lng since the topology tree response may not include them.
  const reduxLocations = useAppSelector((state) => state.locations.locations) || [];

  useEffect(() => {
    if (reduxLocations.length === 0) {
      dispatch(fetchLocationsforMap());
    }
  }, [dispatch, reduxLocations.length]);

  // Merge: topology data (status, device_count, health) keyed by id with Redux geo (lat/lng)
  const mergedLocations = useMemo(() => {
    const geoById = new Map(reduxLocations.map((l: any) => [l.id, l]));
    return allLocations.map((l) => {
      const geo = geoById.get(l.id);
      return {
        id: l.id,
        name: l.name,
        area: l.area || (geo?.area ?? 'Unassigned'),
        status: l.status as 'online' | 'offline' | 'unknown' | 'partial',
        latitude: geo?.latitude,
        longitude: geo?.longitude,
        device_count: l.device_count,
        online_device_count: l.online_device_count,
        offline_device_count: l.offline_device_count,
        health_percentage: l.health_percentage,
      };
    });
  }, [allLocations, reduxLocations]);

  const allAreaMarkers: AreaMarker[] = useMemo(
    () => buildAreaMarkers(mergedLocations),
    [mergedLocations]
  );

  const visibleAreas = useMemo(
    () =>
      searchTerm
        ? allAreaMarkers.filter((a) =>
            a.area.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allAreaMarkers,
    [allAreaMarkers, searchTerm]
  );

  const globalStats = useMemo(() => {
    return {
      areas: allAreaMarkers.length,
      locations: allAreaMarkers.reduce((s, a) => s + a.total, 0),
      devices: allAreaMarkers.reduce((s, a) => s + a.totalDevices, 0),
      onlineDevices: allAreaMarkers.reduce((s, a) => s + a.onlineDevices, 0),
      offlineDevices: allAreaMarkers.reduce((s, a) => s + a.offlineDevices, 0),
      avgHealth: Math.round(
        allAreaMarkers.reduce((s, a) => s + a.avgHealth, 0) /
          Math.max(allAreaMarkers.length, 1)
      ),
    };
  }, [allAreaMarkers]);

  const selected = selectedArea
    ? allAreaMarkers.find((a) => a.area === selectedArea) ?? null
    : null;

  const healthColor = (h: number) =>
    h >= 80 ? 'var(--status-online)' : h >= 50 ? 'var(--status-warning)' : 'var(--status-offline)';

  const accentForArea = (a: AreaMarker) => {
    if (a.offline > 0) return 'var(--status-offline)';
    if (a.partial > 0) return 'var(--status-warning)';
    if (a.online > 0) return 'var(--status-online)';
    return 'var(--text-dim)';
  };

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-app)',
        color: 'var(--text-hi)',
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 px-6 py-4 border-b"
        style={{
          background: 'rgba(11,18,32,0.85)',
          borderColor: 'var(--border-soft)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              title="Back to Dashboard"
              className="inline-flex items-center gap-2 rounded-md transition-colors"
              style={{
                padding: '7px 12px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-mid)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              Dashboard
            </button>
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: 42, height: 42,
                background: 'var(--brand-soft)',
                border: '1px solid var(--border-brand)',
                color: 'var(--brand)',
              }}
            >
              <LayoutGrid size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-semibold tracking-wide" style={{ color: 'var(--text-hi)' }}>
                  Network Topology
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--brand)' }}>
                  Area Overview
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-lo)' }}>
                Click an area on the map to inspect its topology · {globalStats.areas} areas monitored
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Map / Grid toggle */}
            <div
              className="flex rounded-md p-0.5"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {(['map', 'grid'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="inline-flex items-center gap-1.5 rounded transition-colors"
                  style={{
                    padding: '5px 11px',
                    background: view === v ? 'var(--brand-soft)' : 'transparent',
                    color: view === v ? 'var(--brand)' : 'var(--text-mid)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                  }}
                >
                  {v === 'map' ? <MapIcon size={12} /> : <LayoutGrid size={12} />}
                  {v.toUpperCase()}
                </button>
              ))}
            </div>

            {lastUpdated && (
              <span className="nms-chip nms-chip-live hidden md:inline-flex">
                <span style={{ color: 'var(--text-mid)' }}>
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md border transition-colors"
                style={{
                  width: 34, height: 34,
                  background: 'var(--bg-panel)',
                  borderColor: 'var(--border-soft)',
                  color: 'var(--text-mid)',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
                title="Refresh"
              >
                <RefreshCw size={14} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }} />
              </button>
            )}
          </div>
        </div>

        {/* Global KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
          {[
            { label: 'AREAS', value: globalStats.areas, color: 'var(--brand)', icon: <LayoutGrid size={14} /> },
            { label: 'LOCATIONS', value: globalStats.locations, color: 'var(--text-hi)', icon: <MapPin size={14} /> },
            { label: 'DEVICES', value: globalStats.devices, color: 'var(--text-hi)', icon: <Server size={14} /> },
            { label: 'ONLINE', value: globalStats.onlineDevices, color: 'var(--status-online)', icon: <Wifi size={14} /> },
            { label: 'OFFLINE', value: globalStats.offlineDevices, color: 'var(--status-offline)', icon: <WifiOff size={14} /> },
            { label: 'HEALTH', value: `${globalStats.avgHealth}%`, color: healthColor(globalStats.avgHealth), icon: <Activity size={14} /> },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div
                className="flex items-center justify-center rounded-md shrink-0"
                style={{
                  width: 28, height: 28,
                  background: `color-mix(in oklab, ${s.color} 14%, transparent)`,
                  color: s.color,
                  border: `1px solid color-mix(in oklab, ${s.color} 30%, transparent)`,
                }}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-none tabular-nums" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] mt-1" style={{ color: 'var(--text-lo)' }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Search bar */}
      <div
        className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            placeholder="Search areas…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md outline-none transition-colors"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-hi)',
              padding: '7px 12px 7px 34px',
              fontSize: 13,
            }}
          />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-lo)' }}>
          {visibleAreas.length} {visibleAreas.length === 1 ? 'area' : 'areas'}
        </span>
      </div>

      {/* Body */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {view === 'map' ? (
          <>
            <div className="flex-1 min-w-0 relative">
              <AreaMapView
                areas={visibleAreas}
                selectedArea={selectedArea}
                onAreaSelect={(a) => setSelectedArea(a)}
                onAreaOpenTopology={(a) => onAreaSelect(a)}
              />
              {visibleAreas.length === 0 && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
                  style={{ color: 'var(--text-lo)' }}
                >
                  <MapIcon size={42} style={{ opacity: 0.3 }} />
                  <p className="text-sm">No areas to plot</p>
                </div>
              )}
            </div>

            {/* Side panel — selected area details */}
            <aside
              style={{
                width: 340,
                borderLeft: '1px solid var(--border-soft)',
                background: 'linear-gradient(180deg, rgba(30,41,59,0.4) 0%, rgba(11,18,32,0.85) 100%)',
                display: 'flex', flexDirection: 'column',
                flexShrink: 0,
              }}
              className="hidden lg:flex"
            >
              {selected ? (
                <AreaDetailPanel
                  area={selected}
                  onClose={() => setSelectedArea(null)}
                  onOpenTopology={() => onAreaSelect(selected.area)}
                  onOpenCluster={onOpenCluster ? () => onOpenCluster(selected.area) : undefined}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ color: 'var(--text-lo)' }}>
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 64, height: 64,
                      background: 'var(--brand-soft)',
                      border: '1px solid var(--border-brand)',
                      color: 'var(--brand)',
                    }}
                  >
                    <MapPin size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
                      Select an area
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-lo)' }}>
                      Click a marker on the map to see its stats and open the topology.
                    </p>
                  </div>
                  {allAreaMarkers.length > 0 && (
                    <div className="w-full mt-4 flex flex-col gap-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-left" style={{ color: 'var(--text-lo)' }}>
                        Quick Pick
                      </div>
                      {allAreaMarkers.slice(0, 6).map((a) => (
                        <button
                          key={a.area}
                          onClick={() => setSelectedArea(a.area)}
                          className="w-full flex items-center justify-between rounded-md transition-colors"
                          style={{
                            padding: '7px 10px',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-soft)',
                            color: 'var(--text-mid)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: accentForArea(a) }}
                            />
                            <span className="truncate">{a.area}</span>
                          </span>
                          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-lo)' }}>
                            {a.total} loc
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </aside>
          </>
        ) : (
          /* Grid view */
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {visibleAreas.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-full gap-3"
                style={{ color: 'var(--text-lo)' }}
              >
                <LayoutGrid size={42} style={{ opacity: 0.3 }} />
                <p className="text-sm">No areas match your search</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleAreas.map((s) => (
                  <AreaCard
                    key={s.area}
                    marker={s}
                    onOpenTopology={() => onAreaSelect(s.area)}
                    onOpenCluster={onOpenCluster ? () => onOpenCluster(s.area) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

/* ─── Side detail panel ─────────────────────────────── */
const AreaDetailPanel: React.FC<{
  area: AreaMarker;
  onClose: () => void;
  onOpenTopology: () => void;
  onOpenCluster?: () => void;
}> = ({ area, onOpenTopology, onOpenCluster }) => {
  const onlinePct = area.totalDevices > 0
    ? Math.round((area.onlineDevices / area.totalDevices) * 100)
    : 0;
  const box = onlinePctColor(onlinePct);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 38, height: 38,
              background: `color-mix(in oklab, ${box} 16%, transparent)`,
              color: box,
              border: `1px solid color-mix(in oklab, ${box} 32%, transparent)`,
            }}
          >
            <MapPin size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-lo)' }}
            >
              AREA
            </div>
            <div className="text-base font-semibold truncate" style={{ color: 'var(--text-hi)' }}>
              {area.area}
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] shrink-0"
            style={{
              background: `color-mix(in oklab, ${box} 14%, transparent)`,
              color: box,
              border: `1px solid color-mix(in oklab, ${box} 34%, transparent)`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: box, boxShadow: `0 0 6px ${box}` }}
            />
            {onlinePct}% online
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Devices online bar */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-lo)' }}
            >
              Devices Online
            </span>
            <span className="text-base font-bold tabular-nums" style={{ color: box }}>
              {onlinePct}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(148,163,184,0.1)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${onlinePct}%`,
                background: box,
                boxShadow: `0 0 10px ${box}66`,
              }}
            />
          </div>
        </section>

        {/* Devices quad — totals */}
        <section
          className="grid grid-cols-4 gap-2 rounded-lg p-3"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid var(--border-soft)',
          }}
        >
          {[
            { label: 'Locations', value: area.total, color: 'var(--text-hi)' },
            { label: 'Devices', value: area.totalDevices, color: 'var(--text-hi)' },
            { label: 'Online', value: area.onlineDevices, color: 'var(--status-online)' },
            { label: 'Offline', value: area.offlineDevices, color: 'var(--status-offline)' },
          ].map((c) => (
            <div key={c.label} className="text-center">
              <div className="text-xl font-bold leading-none tabular-nums" style={{ color: c.color }}>
                {c.value}
              </div>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.12em] mt-1"
                style={{ color: 'var(--text-lo)' }}
              >
                {c.label}
              </div>
            </div>
          ))}
        </section>

        {/* Location status */}
        <section>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
            style={{ color: 'var(--text-lo)' }}
          >
            Locations · {area.total}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Online', value: area.online, color: 'var(--status-online)', icon: <Wifi size={12} /> },
              { label: 'Partial', value: area.partial, color: 'var(--status-warning)', icon: <AlertTriangle size={12} /> },
              { label: 'Offline', value: area.offline, color: 'var(--status-offline)', icon: <WifiOff size={12} /> },
            ].map((ind) => (
              <div
                key={ind.label}
                className="flex items-center gap-2 rounded-md px-2.5 py-2"
                style={{
                  background: 'rgba(148,163,184,0.04)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <span style={{ color: ind.color }}>{ind.icon}</span>
                <div className="min-w-0">
                  <div
                    className="text-sm font-bold tabular-nums leading-none"
                    style={{ color: 'var(--text-hi)' }}
                  >
                    {ind.value}
                  </div>
                  <div
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: 'var(--text-lo)' }}
                  >
                    {ind.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div
        className="p-4 flex gap-2"
        style={{ borderTop: '1px solid var(--border-soft)' }}
      >
        <button
          onClick={onOpenTopology}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2.5 px-3"
          style={{
            background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)',
            color: '#04121A',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: '0 6px 16px -8px rgba(6,182,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          Open Topology
          <ChevronRight size={14} />
        </button>
        {onOpenCluster && (
          <button
            onClick={onOpenCluster}
            className="inline-flex items-center justify-center gap-1.5 rounded-md py-2.5 px-3"
            style={{
              background: 'rgba(148,163,184,0.06)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-mid)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Open Cluster View"
          >
            <LayoutGrid size={13} />
            Cluster
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Grid card ───────────────────────────────── */
const AreaCard: React.FC<{
  marker: AreaMarker;
  onOpenTopology: () => void;
  onOpenCluster?: () => void;
}> = ({ marker: s, onOpenTopology, onOpenCluster }) => {
  const onlinePct = s.totalDevices > 0
    ? Math.round((s.onlineDevices / s.totalDevices) * 100)
    : 0;
  const box = onlinePctColor(onlinePct);

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all stagger-item"
      style={{
        background: `linear-gradient(180deg, color-mix(in oklab, ${box} 22%, rgba(15,23,42,0.92)) 0%, rgba(15,23,42,0.96) 100%)`,
        border: `1px solid color-mix(in oklab, ${box} 45%, var(--border-soft))`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0"
        style={{ height: 3, background: box }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(420px 90px at 100% 0%, color-mix(in oklab, ${box} 20%, transparent), transparent 65%)`,
        }}
      />

      <div className="relative p-4 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex items-center justify-center rounded-md shrink-0"
              style={{
                width: 30, height: 30,
                background: `color-mix(in oklab, ${box} 16%, transparent)`,
                color: box,
                border: `1px solid color-mix(in oklab, ${box} 32%, transparent)`,
              }}
            >
              <MapPin size={15} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-hi)' }}>
                {s.area}
              </h3>
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-lo)' }}
              >
                {s.total} location{s.total !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] shrink-0"
            style={{
              background: `color-mix(in oklab, ${box} 14%, transparent)`,
              color: box,
              border: `1px solid color-mix(in oklab, ${box} 34%, transparent)`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: box, boxShadow: `0 0 6px ${box}` }}
            />
            {onlinePct}% online
          </span>
        </div>

        <div
          className="grid grid-cols-4 gap-2 rounded-lg p-2.5"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid var(--border-soft)',
          }}
        >
          {[
            { label: 'Locations', value: s.total, color: 'var(--text-hi)' },
            { label: 'Devices', value: s.totalDevices, color: 'var(--text-hi)' },
            { label: 'Online', value: s.onlineDevices, color: 'var(--status-online)' },
            { label: 'Offline', value: s.offlineDevices, color: 'var(--status-offline)' },
          ].map((cell) => (
            <div key={cell.label} className="text-center">
              <div className="text-lg font-bold leading-none tabular-nums" style={{ color: cell.color }}>
                {cell.value}
              </div>
              <div
                className="text-[9px] font-semibold uppercase tracking-[0.12em] mt-1"
                style={{ color: 'var(--text-lo)' }}
              >
                {cell.label}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-lo)' }}
            >
              Devices Online
            </span>
            <span className="text-xs font-bold tabular-nums" style={{ color: box }}>
              {onlinePct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${onlinePct}%`,
                background: box,
                boxShadow: `0 0 10px ${box}66`,
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onOpenTopology}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 px-3"
            style={{
              background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)',
              color: '#04121A',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              boxShadow: '0 6px 16px -8px rgba(6,182,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            Open Topology
            <ChevronRight size={13} />
          </button>
          {onOpenCluster && (
            <button
              onClick={onOpenCluster}
              className="inline-flex items-center justify-center gap-1.5 rounded-md py-2 px-3"
              style={{
                background: 'rgba(148,163,184,0.06)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-mid)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Cluster"
            >
              <LayoutGrid size={12} />
              Cluster
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AreaSummary;
