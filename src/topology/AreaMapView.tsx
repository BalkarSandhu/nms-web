'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Map as MapGL, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { ChevronRight } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Register PMTiles protocol (idempotent across hot-reloads)
const protocol = new Protocol();
try {
  maplibregl.addProtocol('pmtiles', protocol.tile);
} catch {
  /* already registered */
}

export interface AreaMarker {
  area: string;
  centroid: [number, number]; // [lng, lat]
  total: number;
  online: number;
  offline: number;
  partial: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  avgHealth: number;
}

interface AreaMapViewProps {
  areas: AreaMarker[];
  selectedArea?: string | null;
  onAreaSelect: (area: string) => void;
  onAreaOpenTopology?: (area: string) => void;
  className?: string;
}

const BRAND = '#22D3EE';

function healthColor(h: number) {
  if (h >= 80) return '#10B981';
  if (h >= 50) return '#F59E0B';
  return '#EF4444';
}

function accentForArea(a: AreaMarker) {
  if (a.offline > 0) return '#EF4444';
  if (a.partial > 0) return '#F59E0B';
  if (a.online > 0) return '#10B981';
  return '#64748B';
}

const pmtilesUrl =
  (import.meta as any).env?.VITE_MAP_SOURCE ||
  'https://build.protomaps.com/20230901.pmtiles';

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.1766, 8.4],
  [97.4025, 37.6],
];

const baseMapStyle = {
  version: 8 as const,
  glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/dark',
  sources: {
    'india-tiles': {
      type: 'vector' as const,
      url: `pmtiles://${pmtilesUrl}`,
      attribution:
        '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'earth',
      type: 'fill' as const,
      source: 'india-tiles',
      'source-layer': 'earth',
      paint: { 'fill-color': '#0B1220', 'fill-opacity': 1 },
    },
    {
      id: 'water',
      type: 'fill' as const,
      source: 'india-tiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#0F172A', 'fill-opacity': 0.85 },
    },
    {
      id: 'landuse',
      type: 'fill' as const,
      source: 'india-tiles',
      'source-layer': 'landuse',
      paint: {
        'fill-color': '#111B2E',
        'fill-opacity': 0.5,
      },
    },
    {
      id: 'landcover',
      type: 'fill' as const,
      source: 'india-tiles',
      'source-layer': 'landcover',
      paint: { 'fill-color': '#142036', 'fill-opacity': 0.6 },
    },
    {
      id: 'boundaries',
      type: 'line' as const,
      source: 'india-tiles',
      'source-layer': 'boundaries',
      paint: {
        'line-color': 'rgba(34,211,238,0.25)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 8, 1.4, 12, 2.2] as any,
        'line-dasharray': [2, 2] as any,
        'line-opacity': 0.8,
      },
    },
    {
      id: 'roads-major',
      type: 'line' as const,
      source: 'india-tiles',
      'source-layer': 'roads',
      filter: ['in', 'class', 'primary', 'secondary'] as any,
      paint: {
        'line-color': 'rgba(148,163,184,0.18)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 10, 1.2, 14, 3] as any,
      },
    },
    {
      id: 'places',
      type: 'symbol' as const,
      source: 'india-tiles',
      'source-layer': 'places',
      layout: {
        'text-field': ['get', 'name'] as any,
        'text-font': ['Noto Sans Regular'] as any,
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 8, 12, 12, 16] as any,
        'text-anchor': 'center' as const,
      },
      paint: {
        'text-color': 'rgba(203,213,225,0.55)',
        'text-halo-color': '#0B1220',
        'text-halo-width': 1.5,
      },
    },
  ],
};

const AreaMapView: React.FC<AreaMapViewProps> = ({
  areas,
  selectedArea,
  onAreaSelect,
  onAreaOpenTopology,
  className = '',
}) => {
  const mapRef = useRef<MapRef>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [fitted, setFitted] = useState(false);

  const initialView = useMemo(() => {
    if (areas.length === 0) {
      return { longitude: 78.9629, latitude: 22.0, zoom: 4.2 };
    }
    const lats = areas.map((a) => a.centroid[1]);
    const lngs = areas.map((a) => a.centroid[0]);
    const cx = lngs.reduce((s, v) => s + v, 0) / lngs.length;
    const cy = lats.reduce((s, v) => s + v, 0) / lats.length;
    return { longitude: cx, latitude: cy, zoom: 4.4 };
  }, [areas]);

  // Auto-fit to area bounds once data is loaded
  useEffect(() => {
    if (fitted || areas.length === 0 || !mapRef.current) return;
    const map = mapRef.current.getMap();

    const doFit = () => {
      const lats = areas.map((a) => a.centroid[1]);
      const lngs = areas.map((a) => a.centroid[0]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      if (
        Math.abs(maxLng - minLng) < 0.001 &&
        Math.abs(maxLat - minLat) < 0.001
      ) {
        map.flyTo({ center: [minLng, minLat], zoom: 6, duration: 1100 });
      } else {
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 80, duration: 1100, maxZoom: 7 }
        );
      }
      setFitted(true);
    };

    if (map.loaded()) doFit();
    else map.once('load', doFit);
  }, [areas, fitted]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ background: 'var(--bg-app)' }}>
      <MapGL
        ref={mapRef}
        initialViewState={initialView}
        mapStyle={baseMapStyle as any}
        maxBounds={INDIA_BOUNDS}
        minZoom={3.5}
        maxZoom={11}
        attributionControl={false}
        cursor="default"
      >
        {areas.map((a) => {
          const isSelected = selectedArea === a.area;
          const isHovered = hovered === a.area;
          const accent = accentForArea(a);
          const hc = healthColor(a.avgHealth);
          const active = isSelected || isHovered;
          const size = Math.min(64, 38 + Math.log10(Math.max(1, a.totalDevices)) * 10);

          return (
            <Marker
              key={a.area}
              longitude={a.centroid[0]}
              latitude={a.centroid[1]}
              anchor="center"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onAreaSelect(a.area); }}
                onMouseEnter={() => setHovered(a.area)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'relative',
                  width: size,
                  height: size,
                  cursor: 'pointer',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform .2s cubic-bezier(.4,0,.2,1)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {/* Outermost pulsing ring */}
                <span
                  style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: '50%',
                    border: `1px solid ${accent}`,
                    opacity: active ? 0.5 : 0.25,
                    animation: 'amv-pulse 3s ease-out infinite',
                  }}
                />
                {/* Mid ring */}
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `1.5px solid ${accent}`,
                    opacity: 0.55,
                  }}
                />
                {/* Inner solid disk */}
                <span
                  style={{
                    position: 'absolute',
                    inset: '22%',
                    borderRadius: '50%',
                    background: 'rgba(15,23,42,0.96)',
                    border: `1.5px solid ${accent}`,
                    boxShadow: active
                      ? `0 0 18px ${accent}aa, inset 0 0 12px ${accent}44`
                      : `0 0 10px ${accent}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: hc, lineHeight: 1, letterSpacing: '0.02em' }}>
                    {a.avgHealth}%
                  </span>
                </span>

                {/* Label below */}
                <span
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translate(-50%, 6px)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: active ? '#F8FAFC' : '#CBD5E1',
                    background: 'rgba(11,18,32,0.88)',
                    border: `1px solid ${active ? accent : 'rgba(148,163,184,0.15)'}`,
                    padding: '2px 8px',
                    borderRadius: 99,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  {a.area}
                </span>

                {/* Tooltip on hover */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 12px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      minWidth: 200,
                      background: 'linear-gradient(180deg, rgba(30,41,59,0.97) 0%, rgba(15,23,42,0.98) 100%)',
                      border: `1px solid ${accent}55`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{a.area}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 99,
                          color: accent,
                          background: `color-mix(in oklab, ${accent} 14%, transparent)`,
                          border: `1px solid ${accent}55`,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {a.offline > 0 ? 'CRITICAL' : a.partial > 0 ? 'DEGRADED' : a.online > 0 ? 'HEALTHY' : 'IDLE'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 10.5 }}>
                      <span style={{ color: '#94A3B8' }}>Locations</span>
                      <span style={{ color: '#F8FAFC', textAlign: 'right', fontWeight: 600 }}>{a.total}</span>
                      <span style={{ color: '#94A3B8' }}>Devices</span>
                      <span style={{ color: '#F8FAFC', textAlign: 'right', fontWeight: 600 }}>{a.totalDevices}</span>
                      <span style={{ color: '#94A3B8' }}>Online</span>
                      <span style={{ color: '#10B981', textAlign: 'right', fontWeight: 600 }}>{a.onlineDevices}</span>
                      <span style={{ color: '#94A3B8' }}>Offline</span>
                      <span style={{ color: '#EF4444', textAlign: 'right', fontWeight: 600 }}>{a.offlineDevices}</span>
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        color: BRAND,
                        fontWeight: 600,
                      }}
                    >
                      Click to open topology <ChevronRight size={11} />
                    </div>
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </MapGL>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid var(--border-soft)',
          borderRadius: 10,
          padding: '8px 12px',
          display: 'flex',
          gap: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 10,
          color: 'var(--text-mid)',
          backdropFilter: 'blur(8px)',
          letterSpacing: '0.04em',
        }}
      >
        {[
          { label: 'Healthy', color: '#10B981' },
          { label: 'Degraded', color: '#F59E0B' },
          { label: 'Critical', color: '#EF4444' },
          { label: 'Idle', color: '#64748B' },
        ].map((it) => (
          <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: it.color,
                boxShadow: `0 0 6px ${it.color}`,
              }}
            />
            <span style={{ fontWeight: 600 }}>{it.label}</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes amv-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%      { transform: scale(1.25); opacity: 0.15; }
        }
        .maplibregl-canvas:focus { outline: none; }
      `}</style>
    </div>
  );
};

export default AreaMapView;

/* ─── Helper: aggregate locations into AreaMarkers ───────────────────── */
export interface AreaLocation {
  id: number;
  name: string;
  area: string;
  status: 'online' | 'offline' | 'unknown' | 'partial';
  latitude?: number;
  longitude?: number;
  device_count?: number;
  online_device_count?: number;
  offline_device_count?: number;
  health_percentage?: number;
}

export function buildAreaMarkers(locations: AreaLocation[]): AreaMarker[] {
  const byArea = new Map<string, AreaLocation[]>();
  for (const l of locations) {
    const key = l.area || 'Unassigned';
    if (!byArea.has(key)) byArea.set(key, []);
    byArea.get(key)!.push(l);
  }

  const out: AreaMarker[] = [];
  byArea.forEach((locs, area) => {
    const geo = locs.filter(
      (l) =>
        Number.isFinite(l.latitude) &&
        Number.isFinite(l.longitude) &&
        l.latitude !== 0 &&
        l.longitude !== 0
    );
    let centroid: [number, number];
    if (geo.length > 0) {
      const cx = geo.reduce((s, l) => s + (l.longitude as number), 0) / geo.length;
      const cy = geo.reduce((s, l) => s + (l.latitude as number), 0) / geo.length;
      centroid = [cx, cy];
    } else {
      // Fallback to India centroid; areas without geo won't be displayed on the map well
      centroid = [78.9629, 22.0];
    }

    const online = locs.filter((l) => l.status === 'online').length;
    const offline = locs.filter((l) => l.status === 'offline').length;
    const partial = locs.filter((l) => l.status === 'partial').length;
    const totalDevices = locs.reduce((s, l) => s + (l.device_count ?? 0), 0);
    const onlineDevices = locs.reduce((s, l) => s + (l.online_device_count ?? 0), 0);
    const offlineDevices = locs.reduce((s, l) => s + (l.offline_device_count ?? 0), 0);
    const avgHealth = Math.round(
      locs.reduce((s, l) => s + (l.health_percentage ?? 0), 0) / Math.max(locs.length, 1)
    );

    out.push({
      area,
      centroid,
      total: locs.length,
      online,
      offline,
      partial,
      totalDevices,
      onlineDevices,
      offlineDevices,
      avgHealth,
    });
  });

  return out.sort((a, b) => a.area.localeCompare(b.area));
}
