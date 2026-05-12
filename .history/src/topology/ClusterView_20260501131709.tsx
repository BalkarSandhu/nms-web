'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Map as MapGL, Marker, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef, StyleSpecification } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowLeft, Search, Filter, X, ChevronRight, Activity, MapPin,
} from 'lucide-react';

const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
/* ─── PMTiles protocol (same setup MapViewer uses) ─────────────────────── */
// const protocol = new Protocol();
// if (!maplibregl.getProtocol?.('pmtiles')) {
//   maplibregl.addProtocol('pmtiles', protocol.tile);
// }

/* ─── Types ────────────────────────────────────────────────────────────── */
interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown' | 'partial';
  project: string;
  area: string;
  description?: string;
  device_count?: number;
  online_device_count?: number;
  offline_device_count?: number;
  health_percentage?: number;
  children?: Location[];
  worker_id?: string;
  created_at?: string;
  updated_at?: string;
  status_reason?: string;
  /* NEW — optional. Locations without coordinates are listed under
     "Unmapped" and don't render on the map. */
  lat?: number;
  lng?: number;
}

export interface ClusterDevice {
  id: number;
  hostname?: string;
  display?: string;
  ip?: string;
  protocol?: string;
  is_reachable?: boolean;
  location_id: number;
}

interface ClusterViewProps {
  allLocations: Location[];
  selectedArea: string;
  onBack: () => void;
  onNodeSelect: (location: Location) => void;
  /** Optional — pass devices to populate the panel device list. */
  devices?: ClusterDevice[];
  /** Optional — override basemap. Defaults to CartoDB Dark Matter raster.
   *  Pass your MapViewer config here to match the rest of the app. */
  mapStyle?: StyleSpecification | string;
}

/* ─── Default basemap (CartoDB Dark Matter raster) ─────────────────────── */
const DEFAULT_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#060d18' } },
    { id: 'carto', type: 'raster', source: 'carto-dark', paint: { 'raster-opacity': 0.92 } },
  ],
};

/* ─── Status palette ───────────────────────────────────────────────────── */
const STATUS_PALETTE = {
  online:  { ring: '#3ea7ff', text: '#cfe5ff', label: 'ONLINE'   },
  offline: { ring: '#f25c5c', text: '#ffd6d6', label: 'OFFLINE'  },
  partial: { ring: '#f5a623', text: '#ffe6b8', label: 'DEGRADED' },
  unknown: { ring: '#6b7a8d', text: '#bdc7d6', label: 'UNKNOWN'  },
} as const;

const getPalette = (s: string) =>
  STATUS_PALETTE[s as keyof typeof STATUS_PALETTE] || STATUS_PALETTE.unknown;

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function wrapText(text: string, max: number): string[] {
  const words = text.split(/\s+/);
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

function sizeFor(loc: Location): number {
  const c = loc.device_count ?? 0;
  const min = 38, max = 56; // diameter of inner disk in px
  return min + Math.min(1, c / 30) * (max - min);
}

const hasCoords = (l: Location): l is Location & { lat: number; lng: number } =>
  typeof l.lat === 'number' && typeof l.lng === 'number';

/* Fit bounds helper */
function computeBounds(coords: { lat: number; lng: number }[]):
  [[number, number], [number, number]] | null {
  if (coords.length === 0) return null;
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  // Add 5% padding around the bbox
  const padLat = Math.max((maxLat - minLat) * 0.1, 0.005);
  const padLng = Math.max((maxLng - minLng) * 0.1, 0.005);
  return [
    [minLng - padLng, minLat - padLat],
    [maxLng + padLng, maxLat + padLat],
  ];
}

/* ─── Ring marker (HTML/CSS, anchored via <Marker>) ────────────────────── */
const RingMarker: React.FC<{
  location: Location;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}> = ({ location, hovered, selected, dimmed, onClick, onHover }) => {
  const palette = getPalette(location.status);
  const count = location.device_count ?? 0;
  const wrapped = wrapText(location.name, 18);
  const active = hovered || selected;
  const innerSize = sizeFor(location);
  // Outermost decorative ring diameter
  const outerSize = innerSize * 2.2;

  return (
    <div
      className={`cv-ring ${active ? 'is-active' : ''} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{ width: outerSize, height: outerSize }}
    >
      {/* Outer ring */}
      <span
        className="cv-ring-outer"
        style={{
          width: outerSize,
          height: outerSize,
          borderColor: palette.ring,
        }}
      />
      {/* Mid ring */}
      <span
        className="cv-ring-mid"
        style={{
          width: outerSize * 0.72,
          height: outerSize * 0.72,
          borderColor: palette.ring,
        }}
      />
      {/* Glow halo (active only) */}
      {active && (
        <span
          className="cv-ring-glow"
          style={{
            width: innerSize * 1.4,
            height: innerSize * 1.4,
            background: palette.ring,
          }}
        />
      )}
      {/* Pulse ring (active only) */}
      {active && (
        <span
          className="cv-ring-pulse"
          style={{
            width: innerSize,
            height: innerSize,
            borderColor: palette.ring,
          }}
        />
      )}
      {/* Inner disk with count */}
      <span
        className="cv-ring-inner"
        style={{
          width: innerSize,
          height: innerSize,
          borderColor: palette.ring,
          color: palette.text,
        }}
      >
        {String(count).padStart(2, '0')}
      </span>
      {/* Label below */}
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
  location: Location;
  parent: Location | null;
  childLocations: Location[];
  devices: ClusterDevice[];
  hasDevicesProp: boolean;
  onClose: () => void;
  onViewFull: () => void;
}> = ({ location, parent, childLocations, devices, hasDevicesProp, onClose, onViewFull }) => {
  const palette = getPalette(location.status);
  const total = location.device_count ?? devices.length ?? 0;
  const online = location.online_device_count
    ?? devices.filter(d => d.is_reachable === true).length;
  const offline = location.offline_device_count
    ?? devices.filter(d => d.is_reachable === false).length;
  const health = location.health_percentage
    ?? (total > 0 ? Math.round((online / total) * 100) : 0);

  const healthColor =
    health >= 80 ? '#22d3a5' :
    health >= 50 ? '#f5a623' : '#f25c5c';

  return (
    <aside className="cv-panel">
      <div className="cv-panel-head">
        <div className="cv-panel-head-left">
          <div className="cv-panel-num"
               style={{ borderColor: palette.ring, color: palette.text }}>
            {String(total).padStart(2, '0')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="cv-panel-name" title={location.name}>{location.name}</div>
            <div className="cv-panel-substatus">
              <span className="cv-panel-dot" style={{ background: palette.ring }} />
              <span style={{ color: palette.ring }}>{palette.label}</span>
              {location.project && (
                <span className="cv-panel-meta-pill">{location.project}</span>
              )}
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
              <div className="cv-panel-stat-num" style={{ color: '#cfe5ff' }}>{total}</div>
              <div className="cv-panel-stat-lbl">DEVICES</div>
            </div>
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#22d3a5' }}>{online}</div>
              <div className="cv-panel-stat-lbl">ONLINE</div>
            </div>
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#f25c5c' }}>{offline}</div>
              <div className="cv-panel-stat-lbl">OFFLINE</div>
            </div>
          </div>
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-section-title">INFORMATION</div>
          <InfoRow label="Project"  value={location.project || '—'} />
          <InfoRow label="Area"     value={location.area    || '—'} />
          <InfoRow label="Parent"   value={parent ? parent.name : 'None'} />
          <InfoRow label="Children" value={String(childLocations.length)} />
          {hasCoords(location) && (
            <InfoRow
              label="Coords"
              value={`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
            />
          )}
          {location.status_reason && (
            <InfoRow label="Reason" value={location.status_reason} />
          )}
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-section-title">
            DEVICES {hasDevicesProp ? `· ${devices.length}` : `· ${total}`}
          </div>

          {hasDevicesProp && devices.length > 0 ? (
            <div className="cv-panel-devices">
              {devices.map(d => (
                <div key={d.id} className="cv-dev-row">
                  <span
                    className="cv-dev-dot"
                    style={{ background: d.is_reachable ? '#22d3a5' : '#f25c5c' }}
                  />
                  <span className="cv-dev-name">
                    {d.display || d.hostname || `Device #${d.id}`}
                  </span>
                  {d.ip && <span className="cv-dev-ip">{d.ip}</span>}
                </div>
              ))}
            </div>
          ) : hasDevicesProp ? (
            <div className="cv-panel-empty">No devices in this location</div>
          ) : (
            <div className="cv-panel-empty cv-panel-empty-summary">
              {online} online · {offline} offline
            </div>
          )}
        </section>

        {childLocations.length > 0 && (
          <section className="cv-panel-section">
            <div className="cv-panel-section-title">SUB-LOCATIONS</div>
            <div className="cv-panel-children">
              {childLocations.map(c => (
                <div key={c.id} className="cv-child-row">
                  <span
                    className="cv-dev-dot"
                    style={{ background: getPalette(c.status).ring }}
                  />
                  <span className="cv-dev-name">{c.name}</span>
                  <span className="cv-dev-ip">{c.device_count ?? 0} dev</span>
                </div>
              ))}
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
  allLocations,
  selectedArea,
  onBack,
  onNodeSelect,
  devices = [],
  mapStyle,
}) => {
  const mapRef = useRef<MapRef>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(
    () =>
      allLocations.filter(
        (l) =>
          l.area === selectedArea &&
          (filterStatus === 'all' || l.status === filterStatus) &&
          (!searchTerm || l.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [allLocations, selectedArea, filterStatus, searchTerm]
  );

  const mapped = useMemo(() => filtered.filter(hasCoords), [filtered]);
  const unmapped = filtered.length - mapped.length;

  const stats = useMemo(() => {
    const a = allLocations.filter((l) => l.area === selectedArea);
    return {
      total: a.length,
      online: a.filter((l) => l.status === 'online').length,
      offline: a.filter((l) => l.status === 'offline').length,
      partial: a.filter((l) => l.status === 'partial').length,
      avgHealth: Math.round(
        a.reduce((s, l) => s + (l.health_percentage ?? 0), 0) /
          Math.max(a.length, 1)
      ),
    };
  }, [allLocations, selectedArea]);

  // Initial view state (rough — refined by fitBounds onLoad)
  const initialViewState = useMemo(() => {
    if (mapped.length === 0) return { longitude: 78.96, latitude: 22.59, zoom: 4 };
    const lats = mapped.map(l => l.lat!);
    const lngs = mapped.map(l => l.lng!);
    return {
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitude:  (Math.min(...lats) + Math.max(...lats)) / 2,
      zoom: 5,
    };
    // intentionally not depending on `mapped` after first compute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit bounds when area changes or first mount completes
  const fittedFor = useRef<string | null>(null);
  const fitToBounds = useCallback(() => {
    if (!mapRef.current || mapped.length === 0) return;
    const bounds = computeBounds(mapped);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, {
      padding: { top: 100, right: selectedId ? 380 : 100, bottom: 100, left: 100 },
      duration: 800,
      maxZoom: 13,
    });
  }, [mapped, selectedId]);

  const handleMapLoad = () => {
    if (fittedFor.current !== selectedArea) {
      fitToBounds();
      fittedFor.current = selectedArea;
    }
  };

  useEffect(() => {
    if (fittedFor.current !== selectedArea) {
      fitToBounds();
      fittedFor.current = selectedArea;
    }
  }, [selectedArea, fitToBounds]);

  // Edges as GeoJSON (parent → child)
  const connectedToSelected = useMemo(() => {
    const set = new Set<number>();
    if (selectedId === null) return set;
    set.add(selectedId);
    for (const n of mapped) {
      if (n.id === selectedId && n.parent_id !== null) set.add(n.parent_id);
      if (n.parent_id === selectedId) set.add(n.id);
    }
    return set;
  }, [mapped, selectedId]);

  const edgesGeoJson = useMemo(() => {
    const features: any[] = [];
    const byId = new Map<number, Location & { lat: number; lng: number }>(
      mapped.map(l => [l.id, l])
    );
    for (const n of mapped) {
      if (n.parent_id !== null) {
        const p = byId.get(n.parent_id);
        if (p) {
          const involves = selectedId !== null &&
            (n.id === selectedId || n.parent_id === selectedId);
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[n.lng, n.lat], [p.lng, p.lat]],
            },
            properties: {
              color: getPalette(n.status).ring,
              involves,
            },
          });
        }
      }
    }
    return { type: 'FeatureCollection' as const, features };
  }, [mapped, selectedId]);

  // Selection lookups
  const selectedLocation = selectedId !== null
    ? filtered.find((l) => l.id === selectedId) || null : null;
  const selectedParent = selectedLocation && selectedLocation.parent_id !== null
    ? allLocations.find((l) => l.id === selectedLocation.parent_id) || null : null;
  const selectedChildren = selectedLocation
    ? allLocations.filter((l) => l.parent_id === selectedLocation.id) : [];
  const selectedDevices = useMemo(() => {
    if (!selectedLocation) return [];
    return devices.filter((d) => d.location_id === selectedLocation.id);
  }, [selectedLocation, devices]);

  const hasDevicesProp = devices.length > 0;

  const handleClusterClick = (loc: Location) => {
    setSelectedId(prev => prev === loc.id ? null : loc.id);
    // Pan the selected cluster into view (offset for the panel)
    if (mapRef.current && hasCoords(loc) && selectedId !== loc.id) {
      mapRef.current.flyTo({
        center: [loc.lng, loc.lat],
        duration: 600,
        // Zoom level kept stable; we just pan
      });
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
            <div className="cv-area-tag">CLUSTER · AREA</div>
            <div className="cv-area-name">{selectedArea}</div>
          </div>
        </div>

        <div className="cv-right">
          <span className="cv-summary">
            <b>{stats.total}</b> nodes
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#22d3a5' }}>{stats.online}</b> up
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#f25c5c' }}>{stats.offline}</b> down
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#9cc8ff' }}>{stats.avgHealth}%</b> avg
          </span>
          <div className="cv-search">
            <Search size={13} />
            <input
              placeholder="Search nodes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="cv-icon-btn" title="Filter">
            <Filter size={14} />
          </button>
          <button
            className="cv-icon-btn cv-icon-btn-text"
            title="Refit to bounds"
            onClick={fitToBounds}
          >
            FIT
          </button>
        </div>
      </header>

      {/* Filter chips */}
      <div className="cv-chips">
        {(['all', 'online', 'partial', 'offline'] as const).map((s) => {
          const lbl = s === 'all' ? 'ALL' : getPalette(s).label;
          const active = filterStatus === s;
          const color = s === 'all' ? '#9cc8ff' : getPalette(s).ring;
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
              {lbl}
            </button>
          );
        })}
        <span className="cv-chip-spacer" />
        <span className="cv-result-count">{mapped.length} mapped</span>
      </div>

      {/* Map canvas */}
      <div className="cv-canvas-wrap">
        <MapGL
          ref={mapRef}
          initialViewState={initialViewState}
          mapStyle={mapStyle ?? DEFAULT_MAP_STYLE}
          mapLib={maplibregl}
          attributionControl={false}
          dragRotate={false}
          boxZoom={false}
          onLoad={handleMapLoad}
          onClick={() => setSelectedId(null)}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Edges (parent → child) */}
          <Source id="cv-edges" type="geojson" data={edgesGeoJson}>
            <Layer
              id="cv-edges-glow"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['case', ['get', 'involves'], 4, 2],
                'line-opacity': ['case',
                  ['get', 'involves'], 0.45,
                  selectedId === null ? 0.18 : 0.06,
                ],
                'line-blur': 3,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
            <Layer
              id="cv-edges-line"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['case', ['get', 'involves'], 1.5, 0.9],
                'line-opacity': ['case',
                  ['get', 'involves'], 0.85,
                  selectedId === null ? 0.4 : 0.15,
                ],
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>

          {/* Ring markers */}
          {mapped.map((loc) => {
            const isSelected = selectedId === loc.id;
            const isHovered = hoveredId === loc.id;
            const isDimmed = selectedId !== null && !connectedToSelected.has(loc.id);
            return (
              <Marker
                key={loc.id}
                longitude={loc.lng}
                latitude={loc.lat}
                anchor="center"
                style={{ zIndex: isSelected ? 5 : isHovered ? 4 : 1 }}
              >
                <RingMarker
                  location={loc}
                  hovered={isHovered}
                  selected={isSelected}
                  dimmed={isDimmed}
                  onClick={() => handleClusterClick(loc)}
                  onHover={(h) => setHoveredId(h ? loc.id : null)}
                />
              </Marker>
            );
          })}
        </MapGL>

        {/* Empty / unmapped notices */}
        {filtered.length === 0 && (
          <div className="cv-empty">
            <Activity size={36} style={{ opacity: 0.25 }} />
            <div className="cv-empty-title">No nodes match</div>
            <div className="cv-empty-sub">
              {searchTerm ? 'Try a different search term' : 'Adjust the filter to see nodes'}
            </div>
          </div>
        )}

        {unmapped > 0 && (
          <div className="cv-unmapped">
            <MapPin size={12} />
            <span>
              <b>{unmapped}</b> location{unmapped !== 1 ? 's' : ''} without coordinates
            </span>
          </div>
        )}

        {/* Detail panel */}
        {selectedLocation && (
          <DetailPanel
            location={selectedLocation}
            parent={selectedParent}
            childLocations={selectedChildren}
            devices={selectedDevices}
            hasDevicesProp={hasDevicesProp}
            onClose={() => setSelectedId(null)}
            onViewFull={() => onNodeSelect(selectedLocation)}
          />
        )}
      </div>

      {/* Styles */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .cv-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #060d18;
          color: #c8d6e5;
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
          position: relative;
        }

        /* Header */
        .cv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(8,18,30,0.8);
          backdrop-filter: blur(8px);
          flex-shrink: 0;
          z-index: 5;
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
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #4a5568;
          margin-bottom: 1px;
          font-family: 'JetBrains Mono', monospace;
        }
        .cv-area-name {
          font-size: 16px;
          font-weight: 600;
          color: #f0f6ff;
          letter-spacing: 0.3px;
        }
        .cv-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .cv-summary {
          font-size: 11px;
          color: #6b7a8d;
          display: inline-flex;
          gap: 6px;
          align-items: center;
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

        /* Chips */
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
          font-size: 10px;
          color: #4a5568;
          letter-spacing: 0.5px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Map canvas */
        .cv-canvas-wrap { flex: 1; position: relative; overflow: hidden; }
        .cv-canvas-wrap .maplibregl-canvas { outline: none; }
        .cv-canvas-wrap .maplibregl-ctrl-attrib { display: none; }

        /* ── Ring marker ── */
        .cv-ring {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          opacity: 1;
          transition: opacity .25s;
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
        .cv-ring-outer {
          border: 1px solid;
          opacity: 0.18;
          transition: opacity .25s;
        }
        .cv-ring-mid {
          border: 1px solid;
          opacity: 0.32;
          transition: opacity .25s;
        }
        .cv-ring.is-active .cv-ring-outer { opacity: 0.55; }
        .cv-ring.is-active .cv-ring-mid { opacity: 0.75; }
        .cv-ring-glow {
          opacity: 0.18;
          filter: blur(4px);
        }
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
          position: relative;
          z-index: 2;
          border: 1.2px solid;
          border-radius: 50%;
          background: rgba(8, 18, 30, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-weight: 300;
          font-size: 14px;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          transition: border-width .15s, transform .15s;
        }
        .cv-ring.is-active .cv-ring-inner {
          transform: scale(1.05);
        }
        .cv-ring.is-selected .cv-ring-inner {
          border-width: 2px;
          box-shadow: 0 4px 18px rgba(62, 167, 255, 0.35);
        }

        .cv-ring-label {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          pointer-events: none;
          white-space: nowrap;
        }
        .cv-ring-label-line {
          font-size: 11px;
          font-weight: 500;
          color: #cdd9e8;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.7);
          line-height: 1.2;
        }
        .cv-ring.is-selected .cv-ring-label-line {
          color: #f0f6ff;
          font-weight: 600;
        }

        /* Empty */
        .cv-empty {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px;
          color: #4a5568;
          text-align: center;
          pointer-events: none;
          z-index: 3;
        }
        .cv-empty-title { font-size: 14px; color: #6b7a8d; }
        .cv-empty-sub   { font-size: 11px; color: #4a5568; }

        /* Unmapped pill */
        .cv-unmapped {
          position: absolute;
          left: 16px;
          bottom: 16px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px;
          background: rgba(8, 18, 30, 0.85);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          font-size: 11px;
          color: #8892a4;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.3px;
          z-index: 6;
        }
        .cv-unmapped b { color: #f5a623; font-weight: 700; }

        /* ── Detail Panel ── */
        .cv-panel {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 340px;
          background: linear-gradient(180deg, rgba(12,23,38,0.96) 0%, rgba(8,18,30,0.96) 100%);
          backdrop-filter: blur(12px);
          border-left: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
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
        .cv-panel-head-left {
          display: flex; align-items: center; gap: 12px;
          min-width: 0; flex: 1;
        }
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
        .cv-panel-meta-pill {
          padding: 1px 6px;
          background: rgba(255,255,255,0.04);
          border-radius: 3px;
          color: #6b7a8d;
          letter-spacing: 0.3px;
          margin-left: 4px;
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

        .cv-panel-devices, .cv-panel-children {
          display: flex; flex-direction: column; gap: 4px;
          max-height: 240px; overflow-y: auto;
        }
        .cv-panel-devices::-webkit-scrollbar,
        .cv-panel-children::-webkit-scrollbar { width: 4px; }
        .cv-panel-devices::-webkit-scrollbar-thumb,
        .cv-panel-children::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
        }
        .cv-dev-row, .cv-child-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 4px;
          font-size: 11px;
          transition: background .15s;
        }
        .cv-dev-row:hover, .cv-child-row:hover {
          background: rgba(255,255,255,0.05);
        }
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
        .cv-panel-empty {
          font-size: 11px; color: #4a5568;
          padding: 12px 0 4px;
          text-align: center; font-style: italic;
        }
        .cv-panel-empty-summary {
          color: #8892a4; font-style: normal;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.5px;
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