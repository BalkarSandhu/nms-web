'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Map as MapGL, Marker, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowLeft, Search, Filter, X, ChevronRight, Activity, MapPin,
} from 'lucide-react';

/* ─── PMTiles protocol — re-register safely ────────────────────────────── */
const protocol = new Protocol();
try {
  if (typeof maplibregl.removeProtocol === 'function') {
    maplibregl.removeProtocol('pmtiles');
  }
} catch { /* noop */ }
maplibregl.addProtocol('pmtiles', protocol.tile);

/* ─── Types — match MapViewer's MapDataPoint shape ─────────────────────── */
export interface MapDataPoint {
  id: string | number;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  value?: number;
  category: 'red' | 'azul' | 'green';
  location?: string;
  additionalData?: Record<string, any>;
}

/* Loose Location shape — what TopologyEditor currently passes.
   We don't know the exact fields, so accept all the common possibilities. */
export interface ClusterLocationLoose {
  id: number | string;
  name: string;
  parent_id?: number | string | null;
  status?: string;
  project?: string;
  area?: string;
  device_count?: number;
  online_device_count?: number;
  offline_device_count?: number;
  health_percentage?: number;
  // Coordinates — any of these may be set
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number];
  // Optional embedded device list — used if present
  devices?: Array<{
    id: number | string;
    name?: string;
    hostname?: string;
    display?: string;
    ip?: string;
    is_reachable?: boolean;
    category?: 'red' | 'azul' | 'green';
  }>;
  [key: string]: any;
}

interface ClusterViewProps {
  /** Preferred — MapDataPoint[], same shape as MapViewer. */
  data?: MapDataPoint[];
  /** Backward-compatible — array of Location-like objects.
   *  Each becomes one cluster on the map. */
  allLocations?: ClusterLocationLoose[];
  /** Optional flat device list — mapped to clusters via location_id. */
  devices?: Array<{
    id: number | string;
    name?: string;
    hostname?: string;
    display?: string;
    ip?: string;
    is_reachable?: boolean;
    location_id?: number | string;
    category?: 'red' | 'azul' | 'green';
  }>;

  selectedArea?: string;
  onBack: () => void;
  /** Fired when a cluster's "View Full Details" is pressed. */
  onClusterSelect?: (cluster: { name: string; devices: any[]; raw?: any }) => void;
  /** Backward compat — old prop name. Forwarded the location-like raw object. */
  onNodeSelect?: (raw: any) => void;
  /** Fired when a device row in the detail panel is clicked. */
  onDeviceSelect?: (device: any) => void;

  centerCoordinates?: [number, number];
  zoom?: number;
  bounds?: {
    minLongitude: number;
    maxLongitude: number;
    minLatitude: number;
    maxLatitude: number;
  };
  mapFlavor?: 'dark' | 'light';
  autoZoomToDensity?: boolean;
}

/* ─── Status palette ───────────────────────────────────────────────────── */
const STATUS_COLOR = {
  green:   { ring: '#4CB944', text: '#cdfac4', label: 'ONLINE'   },
  red:     { ring: '#D52941', text: '#ffd6d6', label: 'OFFLINE'  },
  azul:    { ring: '#246EB9', text: '#cfe5ff', label: 'INFO'     },
  mixed:   { ring: '#FFA500', text: '#ffe6b8', label: 'PARTIAL'  },
  unknown: { ring: '#6b7a8d', text: '#bdc7d6', label: 'UNKNOWN'  },
} as const;
type ClusterStatus = keyof typeof STATUS_COLOR;
const getPalette = (s: ClusterStatus) => STATUS_COLOR[s] || STATUS_COLOR.unknown;

/* ─── Cluster type ─────────────────────────────────────────────────────── */
interface Cluster {
  id: string;
  name: string;
  coordinates: [number, number];
  devices: any[];
  total: number;
  online: number;
  offline: number;
  status: ClusterStatus;
  raw?: any; // original location object (for onNodeSelect)
}

/* ─── Coordinate extraction — try every common field name ─────────────── */
function extractCoords(obj: any): [number, number] | null {
  if (!obj || typeof obj !== 'object') return null;

  // Tuple form
  if (Array.isArray(obj.coordinates) && obj.coordinates.length === 2) {
    const [a, b] = obj.coordinates;
    if (typeof a === 'number' && typeof b === 'number') return [a, b];
  }

  // lat/lng
  if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
    return [obj.lng, obj.lat];
  }
  // latitude/longitude
  if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
    return [obj.longitude, obj.latitude];
  }
  // string variants — some APIs return numbers as strings
  const tryNum = (v: any) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && !Number.isNaN(n) ? n : null;
  };
  const lat = tryNum(obj.lat) ?? tryNum(obj.latitude);
  const lng = tryNum(obj.lng) ?? tryNum(obj.longitude);
  if (lat !== null && lng !== null) return [lng, lat];

  return null;
}

/* ─── Map a status string → category ──────────────────────────────────── */
function statusToCategory(status?: string): 'red' | 'azul' | 'green' {
  switch ((status || '').toLowerCase()) {
    case 'online':  return 'green';
    case 'offline': return 'red';
    default:        return 'azul';
  }
}

/* ─── Build clusters from MapDataPoint[] (group by location name) ─────── */
function clustersFromDataPoints(data: MapDataPoint[]): Cluster[] {
  const map = new Map<string, MapDataPoint[]>();
  for (const d of data) {
    if (!d || !Array.isArray(d.coordinates)) continue;
    const key =
      (d.location && d.location.trim()) ||
      `@${d.coordinates[0].toFixed(5)},${d.coordinates[1].toFixed(5)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }

  const out: Cluster[] = [];
  for (const [key, devices] of map.entries()) {
    if (devices.length === 0) continue;
    const online = devices.filter((d) => d.category === 'green').length;
    const offline = devices.filter((d) => d.category === 'red').length;
    const total = devices.length;
    let status: ClusterStatus = 'azul';
    if (offline > 0 && online > 0) status = 'mixed';
    else if (offline > 0) status = 'red';
    else if (online > 0) status = 'green';
    out.push({
      id: key,
      name: devices[0].location || devices[0].name || key,
      coordinates: devices[0].coordinates,
      devices,
      total,
      online,
      offline,
      status,
    });
  }
  return out;
}

/* ─── Build clusters from Location-like array (one cluster per location) ─ */
function clustersFromLocations(
  locs: ClusterLocationLoose[],
  flatDevices?: ClusterViewProps['devices'],
  area?: string
): Cluster[] {
  const out: Cluster[] = [];

  // Filter to selected area if both are provided
  const inArea = area
    ? locs.filter((l) => !l.area || l.area === area)
    : locs;

  for (const l of inArea) {
    const coords = extractCoords(l);
    if (!coords) continue; // skip un-geocoded locations

    // Find or build a device list
    let deviceList: any[] = [];
    if (Array.isArray(l.devices) && l.devices.length > 0) {
      deviceList = l.devices;
    } else if (Array.isArray(flatDevices)) {
      deviceList = flatDevices.filter((d) => d.location_id === l.id);
    }

    // Counts — prefer the location's own counts; otherwise compute from list
    const total = l.device_count ?? deviceList.length;
    const online =
      l.online_device_count ??
      deviceList.filter((d) => d.is_reachable === true).length;
    const offline =
      l.offline_device_count ??
      deviceList.filter((d) => d.is_reachable === false).length;

    // Status — derive from counts if not explicit
    let status: ClusterStatus;
    if ((l.status || '').toLowerCase() === 'partial' || (online > 0 && offline > 0)) {
      status = 'mixed';
    } else if ((l.status || '').toLowerCase() === 'offline' || (offline > 0 && online === 0)) {
      status = 'red';
    } else if ((l.status || '').toLowerCase() === 'online' || online > 0) {
      status = 'green';
    } else {
      status = 'azul';
    }

    out.push({
      id: String(l.id),
      name: l.name || `Location ${l.id}`,
      coordinates: coords,
      devices: deviceList,
      total: total ?? 0,
      online: online ?? 0,
      offline: offline ?? 0,
      status,
      raw: l,
    });
  }
  return out;
}

/* ─── Mean center / zoom — same logic as MapViewer ─────────────────────── */
function calculateMeanCenter(
  data: { coordinates: [number, number] }[]
): { center: [number, number]; zoom: number } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  if (data.length === 1) return { center: data[0].coordinates, zoom: 12 };

  let sumLon = 0, sumLat = 0;
  let minLon = data[0].coordinates[0], maxLon = data[0].coordinates[0];
  let minLat = data[0].coordinates[1], maxLat = data[0].coordinates[1];

  for (const p of data) {
    sumLon += p.coordinates[0];
    sumLat += p.coordinates[1];
    minLon = Math.min(minLon, p.coordinates[0]);
    maxLon = Math.max(maxLon, p.coordinates[0]);
    minLat = Math.min(minLat, p.coordinates[1]);
    maxLat = Math.max(maxLat, p.coordinates[1]);
  }

  const meanLon = sumLon / data.length;
  const meanLat = sumLat / data.length;
  const maxSpan = Math.max(maxLon - minLon, maxLat - minLat);

  let z: number;
  if (maxSpan > 10) z = 5;
  else if (maxSpan > 5) z = 6;
  else if (maxSpan > 2) z = 7;
  else if (maxSpan > 1) z = 8;
  else if (maxSpan > 0.5) z = 9;
  else if (maxSpan > 0.2) z = 10;
  else if (maxSpan > 0.1) z = 11;
  else z = 12;

  return { center: [meanLon, meanLat], zoom: z };
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function wrapText(text: string, max: number): string[] {
  const words = (text || '').split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = (cur + ' ' + w).trim();
    if (next.length > max && cur) { lines.push(cur); cur = w; }
    else { cur = next; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}
function sizeFor(c: Cluster): number {
  const min = 36, max = 56;
  return min + Math.min(1, c.total / 30) * (max - min);
}

/* ─── Ring marker ──────────────────────────────────────────────────────── */
const RingMarker: React.FC<{
  cluster: Cluster;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}> = ({ cluster, hovered, selected, dimmed, onClick, onHover }) => {
  const palette = getPalette(cluster.status);
  const wrapped = wrapText(cluster.name, 18);
  const active = hovered || selected;
  const innerSize = sizeFor(cluster);
  const outerSize = innerSize * 2.2;

  return (
    <div
      className={`cv-ring ${active ? 'is-active' : ''} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{ width: outerSize, height: outerSize }}
    >
      <span className="cv-ring-outer"
            style={{ width: outerSize, height: outerSize, borderColor: palette.ring }} />
      <span className="cv-ring-mid"
            style={{ width: outerSize * 0.72, height: outerSize * 0.72, borderColor: palette.ring }} />
      {active && (
        <span className="cv-ring-glow"
              style={{ width: innerSize * 1.4, height: innerSize * 1.4, background: palette.ring }} />
      )}
      {active && (
        <span className="cv-ring-pulse"
              style={{ width: innerSize, height: innerSize, borderColor: palette.ring }} />
      )}
      <span className="cv-ring-inner"
            style={{ width: innerSize, height: innerSize, borderColor: palette.ring, color: palette.text }}>
        {String(cluster.total).padStart(2, '0')}
      </span>
      <span className="cv-ring-label">
        {wrapped.map((line, i) => (
          <span key={i} className="cv-ring-label-line">{line}</span>
        ))}
      </span>
    </div>
  );
};

/* ─── Detail Panel ─────────────────────────────────────────────────────── */
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="cv-info-row">
    <span className="cv-info-lbl">{label}</span>
    <span className="cv-info-val" title={value}>{value}</span>
  </div>
);

const DetailPanel: React.FC<{
  cluster: Cluster;
  onClose: () => void;
  onViewFull: () => void;
  onDeviceSelect?: (d: any) => void;
}> = ({ cluster, onClose, onViewFull, onDeviceSelect }) => {
  const palette = getPalette(cluster.status);
  const health = cluster.total > 0
    ? Math.round((cluster.online / cluster.total) * 100) : 0;
  const healthColor =
    health >= 80 ? '#22d3a5' :
    health >= 50 ? '#f5a623' : '#f25c5c';

  return (
    <aside className="cv-panel">
      <div className="cv-panel-head">
        <div className="cv-panel-head-left">
          <div className="cv-panel-num"
               style={{ borderColor: palette.ring, color: palette.text }}>
            {String(cluster.total).padStart(2, '0')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="cv-panel-name" title={cluster.name}>{cluster.name}</div>
            <div className="cv-panel-substatus">
              <span className="cv-panel-dot" style={{ background: palette.ring }} />
              <span style={{ color: palette.ring }}>{palette.label}</span>
            </div>
          </div>
        </div>
        <button className="cv-panel-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
      </div>

      <div className="cv-panel-body">
        <section className="cv-panel-section">
          <div className="cv-panel-health-row">
            <span className="cv-panel-health-label">HEALTH</span>
            <span className="cv-panel-health-val" style={{ color: healthColor }}>{health}%</span>
          </div>
          <div className="cv-panel-bar">
            <div className="cv-panel-bar-fill"
                 style={{ width: `${health}%`, background: healthColor }} />
          </div>
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-stats">
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#cfe5ff' }}>{cluster.total}</div>
              <div className="cv-panel-stat-lbl">DEVICES</div>
            </div>
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#22d3a5' }}>{cluster.online}</div>
              <div className="cv-panel-stat-lbl">ONLINE</div>
            </div>
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#f25c5c' }}>{cluster.offline}</div>
              <div className="cv-panel-stat-lbl">OFFLINE</div>
            </div>
          </div>
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-section-title">INFORMATION</div>
          <InfoRow label="Coords"
                   value={`${cluster.coordinates[1].toFixed(4)}, ${cluster.coordinates[0].toFixed(4)}`} />
          <InfoRow label="Status" value={getPalette(cluster.status).label} />
          {cluster.raw?.project && <InfoRow label="Project" value={cluster.raw.project} />}
          {cluster.raw?.area && <InfoRow label="Area" value={cluster.raw.area} />}
        </section>

        {cluster.devices.length > 0 && (
          <section className="cv-panel-section">
            <div className="cv-panel-section-title">DEVICES · {cluster.devices.length}</div>
            <div className="cv-panel-devices">
              {cluster.devices.map((d: any, i: number) => {
                const reachable =
                  typeof d.is_reachable === 'boolean'
                    ? d.is_reachable
                    : d.category === 'green';
                const ip = d.ip || d.additionalData?.ip;
                const label =
                  d.display || d.hostname || d.name || `Device #${d.id ?? i}`;
                return (
                  <div
                    key={d.id ?? i}
                    className="cv-dev-row"
                    onClick={() => onDeviceSelect?.(d)}
                    style={{ cursor: onDeviceSelect ? 'pointer' : 'default' }}
                  >
                    <span
                      className="cv-dev-dot"
                      style={{ background: reachable ? '#22d3a5' : '#f25c5c' }}
                    />
                    <span className="cv-dev-name">{label}</span>
                    {ip && <span className="cv-dev-ip">{ip}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="cv-panel-foot">
        <button className="cv-panel-cta" onClick={onViewFull}>
          View Full Details
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
  );
};

/* ─── Main ─────────────────────────────────────────────────────────────── */
const ClusterView: React.FC<ClusterViewProps> = ({
  data,
  allLocations,
  devices,
  selectedArea,
  onBack,
  onClusterSelect,
  onNodeSelect,
  onDeviceSelect,
  centerCoordinates = [78.9629, 20.5937],
  zoom = 4,
  bounds = {
    minLongitude: 68.1766,
    maxLongitude: 97.4025,
    minLatitude: 8.4,
    maxLatitude: 37.6,
  },
  mapFlavor = 'dark',
  autoZoomToDensity = true,
}) => {
  const mapRef = useRef<MapRef>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);

  /* Build clusters defensively from whichever input was provided */
  const allClusters = useMemo<Cluster[]>(() => {
    // Prefer MapDataPoint data, but fall back to allLocations
    if (Array.isArray(data) && data.length > 0) {
      return clustersFromDataPoints(data);
    }
    if (Array.isArray(allLocations) && allLocations.length > 0) {
      return clustersFromLocations(allLocations, devices, selectedArea);
    }
    return [];
  }, [data, allLocations, devices, selectedArea]);

  /* Diagnostics counter — how many locations had no coords */
  const unmappedCount = useMemo(() => {
    if (!Array.isArray(allLocations)) return 0;
    const inArea = selectedArea
      ? allLocations.filter((l) => !l.area || l.area === selectedArea)
      : allLocations;
    return inArea.length - allClusters.length;
  }, [allLocations, allClusters.length, selectedArea]);

  /* Apply filter + search */
  const clusters = useMemo<Cluster[]>(() => {
    let out = allClusters;
    if (filterStatus !== 'all') {
      const target =
        filterStatus === 'online'  ? 'green' :
        filterStatus === 'offline' ? 'red'   :
        filterStatus === 'partial' ? 'mixed' : null;
      if (target) out = out.filter((c) => c.status === target);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      out = out.filter((c) => c.name.toLowerCase().includes(q));
    }
    return out;
  }, [allClusters, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    sites: allClusters.length,
    online: allClusters.reduce((s, c) => s + c.online, 0),
    offline: allClusters.reduce((s, c) => s + c.offline, 0),
    devices: allClusters.reduce((s, c) => s + c.total, 0),
  }), [allClusters]);

  /* Mean center for auto-zoom */
  const meanCenter = useMemo(() => {
    if (!autoZoomToDensity || clusters.length === 0) return null;
    return calculateMeanCenter(clusters);
  }, [clusters, autoZoomToDensity]);

  const initialViewState = useMemo(() => {
    const mc = autoZoomToDensity ? calculateMeanCenter(allClusters) : null;
    if (mc) return { longitude: mc.center[0], latitude: mc.center[1], zoom: mc.zoom };
    return { longitude: centerCoordinates[0], latitude: centerCoordinates[1], zoom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Map style — same PMTiles config as MapViewer */
  const mapConfig = useMemo(() => {
    const pmtilesUrl =
      (import.meta as any).env?.VITE_MAP_SOURCE ||
      'https://build.protomaps.com/20230901.pmtiles';

    const customLayers: any[] = [
      { id: 'earth', type: 'fill', source: 'india-tiles', 'source-layer': 'earth',
        paint: { 'fill-color': mapFlavor === 'dark' ? '#1a1a1a' : '#f8f8f8', 'fill-opacity': 1 } },
      { id: 'water', type: 'fill', source: 'india-tiles', 'source-layer': 'water',
        paint: { 'fill-color': mapFlavor === 'dark' ? '#0d47a1' : '#a8d8f0', 'fill-opacity': 0.2 } },
      { id: 'landuse', type: 'fill', source: 'india-tiles', 'source-layer': 'landuse',
        paint: {
          'fill-color': ['match', ['get', 'class'],
            'residential', mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8',
            'commercial',  mapFlavor === 'dark' ? '#3a2a2a' : '#f0e8e8',
            'industrial',  mapFlavor === 'dark' ? '#3a3a2a' : '#e8e8f0',
            'park',        mapFlavor === 'dark' ? '#1a4d2e' : '#c8e6c9',
            mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8',
          ],
          'fill-opacity': 0.3,
        } },
      { id: 'landcover', type: 'fill', source: 'india-tiles', 'source-layer': 'landcover',
        paint: {
          'fill-color': ['match', ['get', 'class'],
            'grass', mapFlavor === 'dark' ? '#2a4d2e' : '#d8e6c9',
            'wood',  mapFlavor === 'dark' ? '#1a3d2e' : '#b8d6b9',
            'scrub', mapFlavor === 'dark' ? '#2a3d2e' : '#c8d6c9',
            mapFlavor === 'dark' ? '#2a3d2e' : '#c8d6c9',
          ],
          'fill-opacity': 0.4,
        } },
      { id: 'roads-minor', type: 'line', source: 'india-tiles', 'source-layer': 'roads',
        filter: ['in', 'class', 'minor', 'service'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#3a3a3a' : '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 2, 18, 4],
          'line-opacity': 0.7,
        } },
      { id: 'roads-major', type: 'line', source: 'india-tiles', 'source-layer': 'roads',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#4a4a4a' : '#ffd700',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 3, 16, 8],
          'line-opacity': 0.8,
        } },
      { id: 'boundaries', type: 'line', source: 'india-tiles', 'source-layer': 'boundaries',
        paint: {
          'line-color': mapFlavor === 'dark' ? '#666666' : '#999999',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 8, 2, 12, 3],
          'line-dasharray': [3, 2],
          'line-opacity': 0.7,
        } },
      { id: 'places', type: 'symbol', source: 'india-tiles', 'source-layer': 'places',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 14, 12, 18],
          'text-anchor': 'center',
          'text-offset': [0, 1.5],
        },
        paint: {
          'text-color': mapFlavor === 'dark' ? '#ffffff' : '#000000',
          'text-halo-color': mapFlavor === 'dark' ? '#000000' : '#ffffff',
          'text-halo-width': 2,
        } },
    ];

    return {
      version: 8 as const,
      glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
      sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${mapFlavor}`,
      sources: {
        'india-tiles': {
          type: 'vector' as const,
          url: `pmtiles://${pmtilesUrl}`,
          attribution:
            '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
        },
      },
      layers: customLayers,
    };
  }, [mapFlavor]);

  const maxBounds: [[number, number], [number, number]] = useMemo(
    () => [
      [bounds.minLongitude, bounds.minLatitude],
      [bounds.maxLongitude, bounds.maxLatitude],
    ],
    [bounds]
  );

  /* Auto-zoom once the map has loaded */
  useEffect(() => {
    if (
      mapRef.current &&
      meanCenter &&
      autoZoomToDensity &&
      !hasAutoZoomed &&
      clusters.length > 0
    ) {
      const map = mapRef.current.getMap();
      const performZoom = () => {
        setTimeout(() => {
          map.flyTo({
            center: meanCenter.center,
            zoom: meanCenter.zoom,
            duration: 1500,
            essential: true,
          });
          setHasAutoZoomed(true);
        }, 600);
      };
      if (map.loaded()) performZoom();
      else map.once('load', performZoom);
    }
  }, [meanCenter, autoZoomToDensity, hasAutoZoomed, clusters.length]);

  /* Selected lookup */
  const selectedCluster = selectedId
    ? clusters.find((c) => c.id === selectedId) || null
    : null;

  const handleClusterClick = (c: Cluster) => {
    const goingToOpen = selectedId !== c.id;
    setSelectedId(goingToOpen ? c.id : null);
    if (goingToOpen && mapRef.current) {
      mapRef.current.flyTo({ center: c.coordinates, duration: 600 });
    }
  };

  const refit = useCallback(() => {
    if (!mapRef.current || clusters.length === 0) return;
    const mc = calculateMeanCenter(clusters);
    if (!mc) return;
    mapRef.current.flyTo({ center: mc.center, zoom: mc.zoom, duration: 800 });
  }, [clusters]);

  const handleViewFull = (c: Cluster) => {
    if (onClusterSelect) {
      onClusterSelect({ name: c.name, devices: c.devices, raw: c.raw });
    } else if (onNodeSelect) {
      // Backward-compat — old callback gets the raw location object
      onNodeSelect(c.raw ?? { name: c.name, devices: c.devices });
    }
  };

  return (
    <div className="cv-root">
      {/* Header */}
      <header className="cv-header">
        <div className="cv-left">
          <button className="cv-back" onClick={onBack} title="Back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="cv-area-tag">CLUSTER {selectedArea ? '· AREA' : ''}</div>
            <div className="cv-area-name">{selectedArea || 'Network'}</div>
          </div>
        </div>

        <div className="cv-right">
          <span className="cv-summary">
            <b>{stats.sites}</b> sites
            <span className="cv-summary-dot">·</span>
            <b>{stats.devices}</b> devices
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#22d3a5' }}>{stats.online}</b> up
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#f25c5c' }}>{stats.offline}</b> down
          </span>
          <div className="cv-search">
            <Search size={13} />
            <input
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="cv-icon-btn" title="Filter">
            <Filter size={14} />
          </button>
          <button className="cv-icon-btn cv-icon-btn-text" title="Refit" onClick={refit}>
            FIT
          </button>
        </div>
      </header>

      {/* Filter chips */}
      <div className="cv-chips">
        {(['all', 'online', 'partial', 'offline'] as const).map((s) => {
          const active = filterStatus === s;
          const color =
            s === 'all' ? '#9cc8ff' :
            s === 'online' ? '#4CB944' :
            s === 'offline' ? '#D52941' : '#FFA500';
          return (
            <button
              key={s}
              className={`cv-chip ${active ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
              style={
                active
                  ? { borderColor: color, color, background: `${color}1f` }
                  : undefined
              }
            >
              {s.toUpperCase()}
            </button>
          );
        })}
        <span className="cv-chip-spacer" />
        <span className="cv-result-count">{clusters.length} shown</span>
      </div>

      {/* Map */}
      <div className="cv-canvas-wrap">
        <MapGL
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapConfig as any}
          mapLib={maplibregl as any}
          maxBounds={maxBounds}
          attributionControl={false}
          dragRotate={false}
          boxZoom={false}
          onClick={() => setSelectedId(null)}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Spokes from selected cluster's center to each device */}
          {selectedCluster && selectedCluster.devices.length > 1 && (
            <Source
              id="cv-spokes"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: selectedCluster.devices.map((d: any, i: number, arr: any[]) => {
                  const r = 0.0015;
                  const a = (i / arr.length) * Math.PI * 2;
                  const lng = selectedCluster.coordinates[0] + Math.cos(a) * r;
                  const lat = selectedCluster.coordinates[1] + Math.sin(a) * r;
                  const isUp =
                    typeof d.is_reachable === 'boolean'
                      ? d.is_reachable
                      : d.category === 'green';
                  return {
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: [selectedCluster.coordinates, [lng, lat]],
                    },
                    properties: {
                      color: isUp ? '#4CB944' : '#D52941',
                    },
                  };
                }),
              }}
            >
              <Layer
                id="cv-spokes-line"
                type="line"
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 1.5,
                  'line-opacity': 0.85,
                  'line-dasharray': [2, 2],
                }}
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              />
            </Source>
          )}

          {/* Ring markers */}
          {clusters.map((c) => {
            const isSelected = selectedId === c.id;
            const isHovered = hoveredId === c.id;
            const isDimmed = selectedId !== null && !isSelected;
            return (
              <Marker
                key={c.id}
                longitude={c.coordinates[0]}
                latitude={c.coordinates[1]}
                anchor="center"
                style={{ zIndex: isSelected ? 5 : isHovered ? 4 : 1 }}
              >
                <RingMarker
                  cluster={c}
                  hovered={isHovered}
                  selected={isSelected}
                  dimmed={isDimmed}
                  onClick={() => handleClusterClick(c)}
                  onHover={(h) => setHoveredId(h ? c.id : null)}
                />
              </Marker>
            );
          })}

          {/* Device dots around selected cluster */}
          {selectedCluster && selectedCluster.devices.length > 1 &&
            selectedCluster.devices.map((d: any, i: number, arr: any[]) => {
              const r = 0.0015;
              const a = (i / arr.length) * Math.PI * 2;
              const lng = selectedCluster.coordinates[0] + Math.cos(a) * r;
              const lat = selectedCluster.coordinates[1] + Math.sin(a) * r;
              const isUp =
                typeof d.is_reachable === 'boolean'
                  ? d.is_reachable
                  : d.category === 'green';
              return (
                <Marker key={`spoke-${d.id ?? i}`} longitude={lng} latitude={lat} anchor="center">
                  <div
                    className="cv-dev-marker"
                    style={{ background: isUp ? '#4CB944' : '#D52941' }}
                    title={d.name || d.hostname}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeviceSelect?.(d);
                    }}
                  />
                </Marker>
              );
            })}
        </MapGL>

        {/* Empty state — also catches the "no data prop" case */}
        {clusters.length === 0 && (
          <div className="cv-empty">
            <Activity size={36} style={{ opacity: 0.25 }} />
            <div className="cv-empty-title">
              {!data && !allLocations
                ? 'No data passed to ClusterView'
                : 'No locations to display'}
            </div>
            <div className="cv-empty-sub">
              {!data && !allLocations
                ? 'Pass either `data` (MapDataPoint[]) or `allLocations` (Location[])'
                : searchTerm
                ? 'No sites match your search'
                : 'Try clearing filters'}
            </div>
          </div>
        )}

        {/* Unmapped pill */}
        {unmappedCount > 0 && (
          <div className="cv-unmapped">
            <MapPin size={12} />
            <span>
              <b>{unmappedCount}</b> location{unmappedCount !== 1 ? 's' : ''} without coordinates
            </span>
          </div>
        )}

        {/* Detail panel */}
        {selectedCluster && (
          <DetailPanel
            cluster={selectedCluster}
            onClose={() => setSelectedId(null)}
            onViewFull={() => handleViewFull(selectedCluster)}
            onDeviceSelect={onDeviceSelect}
          />
        )}
      </div>

      {/* Styles */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .cv-root {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          background: #060d18;
          color: #c8d6e5;
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden; position: relative;
        }

        .cv-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 12px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(8,18,30,0.85);
          backdrop-filter: blur(8px);
          flex-shrink: 0; z-index: 5;
        }
        .cv-left { display: flex; align-items: center; gap: 14px; }
        .cv-back {
          width: 32px; height: 32px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #8892a4;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .2s, color .2s;
        }
        .cv-back:hover { color: #c5cdd8; background: rgba(255,255,255,0.07); }
        .cv-area-tag {
          font-size: 9px; letter-spacing: 1.5px;
          color: #4a5568; margin-bottom: 1px;
          font-family: 'JetBrains Mono', monospace;
        }
        .cv-area-name {
          font-size: 16px; font-weight: 600;
          color: #f0f6ff; letter-spacing: 0.3px;
        }
        .cv-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .cv-summary {
          font-size: 11px; color: #6b7a8d;
          display: inline-flex; gap: 6px; align-items: center;
          font-family: 'JetBrains Mono', monospace;
        }
        .cv-summary b { color: #c5cdd8; font-weight: 600; }
        .cv-summary-dot { color: #2c3a52; }

        .cv-search { position: relative; display: flex; align-items: center; }
        .cv-search svg {
          position: absolute; left: 9px;
          color: #4a5568; pointer-events: none;
        }
        .cv-search input {
          padding: 6px 10px 6px 28px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          color: #c5cdd8;
          font-family: inherit;
          font-size: 11px;
          width: 180px;
          transition: border-color .2s;
        }
        .cv-search input::placeholder { color: #3a4556; }
        .cv-search input:focus { outline: none; border-color: rgba(62,167,255,0.4); }

        .cv-icon-btn {
          width: 28px; height: 28px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          color: #6b7a8d;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .cv-icon-btn-text { width: auto; padding: 0 8px; }
        .cv-icon-btn:hover { color: #c5cdd8; }

        .cv-chips {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          background: rgba(8,18,30,0.6);
          backdrop-filter: blur(6px);
          flex-shrink: 0; z-index: 4;
        }
        .cv-chip {
          padding: 4px 11px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          color: #6b7a8d;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.8px;
          cursor: pointer;
          transition: all .2s;
        }
        .cv-chip:hover { color: #c5cdd8; border-color: rgba(255,255,255,0.18); }
        .cv-chip-spacer { flex: 1; }
        .cv-result-count {
          font-size: 10px; color: #4a5568;
          letter-spacing: 0.5px;
          font-family: 'JetBrains Mono', monospace;
        }

        .cv-canvas-wrap { flex: 1; position: relative; overflow: hidden; }
        .cv-canvas-wrap .maplibregl-canvas { outline: none; }
        .cv-canvas-wrap .maplibregl-ctrl-attrib { display: none; }

        .cv-ring {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          opacity: 1; transition: opacity .25s;
          cursor: pointer;
        }
        .cv-ring.is-dimmed { opacity: 0.3; }

        .cv-ring-outer, .cv-ring-mid, .cv-ring-pulse, .cv-ring-glow {
          position: absolute;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
        }
        .cv-ring-outer { border: 1px solid; opacity: 0.18; transition: opacity .25s; }
        .cv-ring-mid   { border: 1px solid; opacity: 0.32; transition: opacity .25s; }
        .cv-ring.is-active .cv-ring-outer { opacity: 0.55; }
        .cv-ring.is-active .cv-ring-mid   { opacity: 0.75; }
        .cv-ring-glow  { opacity: 0.18; filter: blur(4px); }
        .cv-ring-pulse {
          border: 1px solid;
          opacity: 0;
          animation: cvPulse 1.8s ease-out infinite;
        }
        @keyframes cvPulse {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }

        .cv-ring-inner {
          position: relative; z-index: 2;
          border: 1.2px solid;
          border-radius: 50%;
          background: rgba(8, 18, 30, 0.95);
          display: flex; align-items: center; justify-content: center;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-weight: 300;
          font-size: 14px;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          transition: border-width .15s, transform .15s;
        }
        .cv-ring.is-active .cv-ring-inner   { transform: scale(1.05); }
        .cv-ring.is-selected .cv-ring-inner {
          border-width: 2px;
          box-shadow: 0 4px 18px rgba(62, 167, 255, 0.35);
        }

        .cv-ring-label {
          position: absolute;
          top: 100%; left: 50%;
          transform: translateX(-50%);
          margin-top: 6px;
          display: flex; flex-direction: column; align-items: center;
          gap: 1px;
          pointer-events: none;
          white-space: nowrap;
        }
        .cv-ring-label-line {
          font-size: 11px; font-weight: 500;
          color: #cdd9e8;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.7);
          line-height: 1.2;
        }
        .cv-ring.is-selected .cv-ring-label-line { color: #f0f6ff; font-weight: 600; }

        .cv-dev-marker {
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: transform .15s;
        }
        .cv-dev-marker:hover { transform: scale(1.2); }

        .cv-empty {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; color: #4a5568;
          text-align: center; pointer-events: none;
          z-index: 3;
        }
        .cv-empty-title { font-size: 14px; color: #6b7a8d; }
        .cv-empty-sub   { font-size: 11px; color: #4a5568; max-width: 320px; padding: 0 16px; }

        .cv-unmapped {
          position: absolute;
          left: 16px; bottom: 16px;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 11px;
          background: rgba(8, 18, 30, 0.85);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          font-size: 11px; color: #8892a4;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.3px;
          z-index: 6;
        }
        .cv-unmapped b { color: #f5a623; font-weight: 700; }

        .cv-panel {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 340px;
          background: linear-gradient(180deg, rgba(12,23,38,0.96) 0%, rgba(8,18,30,0.96) 100%);
          backdrop-filter: blur(12px);
          border-left: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          box-shadow: -8px 0 32px rgba(0,0,0,0.4);
          animation: cvPanelIn .3s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 20;
        }
        @keyframes cvPanelIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .cv-panel-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 10px; padding: 16px 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cv-panel-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        .cv-panel-num {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 1.5px solid;
          display: flex; align-items: center; justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px; font-weight: 300;
          background: rgba(8, 18, 30, 0.7);
          flex-shrink: 0; letter-spacing: 0.5px;
        }
        .cv-panel-name {
          font-size: 15px; font-weight: 600;
          color: #f0f6ff; line-height: 1.3;
          margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cv-panel-substatus {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.8px; font-weight: 600;
        }
        .cv-panel-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          animation: cvBlink 2s ease-in-out infinite;
        }
        @keyframes cvBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
        .cv-panel-close {
          width: 28px; height: 28px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.06);
          background: transparent;
          color: #6b7a8d;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
          transition: all .2s;
        }
        .cv-panel-close:hover { color: #c5cdd8; background: rgba(255,255,255,0.05); }

        .cv-panel-body { flex: 1; overflow-y: auto; padding: 4px 0; }
        .cv-panel-body::-webkit-scrollbar { width: 4px; }
        .cv-panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .cv-panel-section {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cv-panel-section:last-child { border-bottom: none; }
        .cv-panel-section-title {
          font-size: 9px; color: #4a5568;
          letter-spacing: 1.5px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700; margin-bottom: 10px;
        }

        .cv-panel-health-row {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 6px;
        }
        .cv-panel-health-label {
          font-size: 9px; color: #4a5568;
          letter-spacing: 1.5px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }
        .cv-panel-health-val {
          font-size: 18px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: -0.3px;
        }
        .cv-panel-bar {
          height: 4px;
          background: rgba(255,255,255,0.05);
          border-radius: 99px;
          overflow: hidden;
        }
        .cv-panel-bar-fill {
          height: 100%; border-radius: 99px;
          transition: width .6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cv-panel-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .cv-panel-stat {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 6px;
          padding: 10px 8px;
          text-align: center;
        }
        .cv-panel-stat-num {
          font-size: 18px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1; margin-bottom: 4px;
        }
        .cv-panel-stat-lbl {
          font-size: 9px; color: #4a5568;
          letter-spacing: 1px;
          font-family: 'JetBrains Mono', monospace;
        }

        .cv-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; font-size: 12px; gap: 10px;
        }
        .cv-info-lbl {
          color: #4a5568;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.8px;
          flex-shrink: 0;
        }
        .cv-info-val {
          color: #c5cdd8; font-weight: 500;
          text-align: right;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .cv-panel-devices {
          display: flex; flex-direction: column; gap: 4px;
          max-height: 280px; overflow-y: auto;
        }
        .cv-panel-devices::-webkit-scrollbar { width: 4px; }
        .cv-panel-devices::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .cv-dev-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 4px;
          font-size: 11px;
          transition: background .15s;
        }
        .cv-dev-row:hover { background: rgba(255,255,255,0.05); }
        .cv-dev-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cv-dev-name {
          color: #c5cdd8; font-weight: 500;
          flex: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cv-dev-ip {
          color: #6b7a8d;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          flex-shrink: 0;
        }

        .cv-panel-foot {
          padding: 12px 18px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.2);
        }
        .cv-panel-cta {
          width: 100%;
          padding: 9px 14px;
          background: linear-gradient(135deg, rgba(62,167,255,0.15), rgba(62,167,255,0.08));
          border: 1px solid rgba(62,167,255,0.35);
          border-radius: 6px;
          color: #9cc8ff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.5px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: all .2s;
        }
        .cv-panel-cta:hover {
          background: linear-gradient(135deg, rgba(62,167,255,0.25), rgba(62,167,255,0.15));
          border-color: rgba(62,167,255,0.55);
          color: #cfe5ff;
        }

        @media (max-width: 768px) {
          .cv-summary { display: none; }
          .cv-search input { width: 130px; }
          .cv-panel { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;