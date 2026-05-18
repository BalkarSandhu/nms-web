'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Search, Activity, X, ChevronRight, 
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown' | 'partial';
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
}

export interface ClusterDevice {
  id: number;
  hostname?: string;
  display?: string;
  ip?: string;
  is_reachable?: boolean;
  location_id: number;
}

interface ClusterViewProps {
  allLocations: Location[];
  selectedArea: string;
  onBack: () => void;
  onNodeSelect: (location: Location) => void;
  devices?: ClusterDevice[];
}

/* ─── Status palette (aligned to dashboard tokens) ─────────────────────── */
const STATUS_PALETTE = {
  online:  { ring: '#10B981', accent: '#34D399', label: 'ONLINE',   text: '#A7F3D0' },
  offline: { ring: '#EF4444', accent: '#F87171', label: 'OFFLINE',  text: '#FECACA' },
  partial: { ring: '#F59E0B', accent: '#FBBF24', label: 'DEGRADED', text: '#FDE68A' },
  unknown: { ring: '#64748B', accent: '#94A3B8', label: 'UNKNOWN',  text: '#CBD5E1' },
} as const;
const BRAND = '#22D3EE';
const getPalette = (s: string) =>
  STATUS_PALETTE[s as keyof typeof STATUS_PALETTE] || STATUS_PALETTE.unknown;

/* ─── Seeded RNG ───────────────────────────────────────────────────────── */
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* ─── Word wrap ────────────────────────────────────────────────────────── */
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

/* ─── Sizing helpers ───────────────────────────────────────────────────── */
function sizeFor(loc: Location): number {
  const c = loc.device_count ?? 0;
  const min = 30, max = 50;
  return min + Math.min(1, c / 30) * (max - min);
}
function labelWidth(name: string): number {
  const wrapped = wrapText(name, 18);
  const longest = wrapped.reduce((m, l) => Math.max(m, l.length), 0);
  return Math.min(longest * 7 + 8, 160);
}
function footprint(loc: Location) {
  const r = sizeFor(loc) * 1.05;
  const lw = labelWidth(loc.name);
  const lh = wrapText(loc.name, 18).length * 13 + 18;
  return {
    halfW: Math.max(r, lw / 2),
    topR: r,
    bottomR: r + lh,
  };
}

/* ─── Force-directed layout ────────────────────────────────────────────── */
function forceLayout(
  nodes: Location[],
  width: number,
  height: number,
  iterations = 260
): Map<number, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const cx = width / 2, cy = height / 2;
  const padX = 100, padTop = 80, padBottom = 60;
  const rng = makeRng(nodes.length * 31 + 7);

  type P = {
    id: number;
    x: number; y: number;
    vx: number; vy: number;
    halfW: number; topR: number; bottomR: number;
  };

  const meta = new Map<number, ReturnType<typeof footprint>>();
  for (const n of nodes) meta.set(n.id, footprint(n));

  const positions: P[] = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(width, height) * 0.25 * (0.7 + rng() * 0.6);
    const fp = meta.get(n.id)!;
    return {
      id: n.id,
      x: cx + Math.cos(a) * r + (rng() - 0.5) * 60,
      y: cy + Math.sin(a) * r + (rng() - 0.5) * 60,
      vx: 0, vy: 0,
      halfW: fp.halfW,
      topR: fp.topR,
      bottomR: fp.bottomR,
    };
  });
  const idx = new Map(positions.map(p => [p.id, p]));

  const edges: [number, number][] = [];
  for (const n of nodes) {
    if (n.parent_id !== null && idx.has(n.parent_id)) {
      edges.push([n.id, n.parent_id]);
    }
  }

  const linkLen = 220;
  const linkK = 0.025;
  const centerK = 0.004;
  const damping = 0.86;

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];
      let fx = 0, fy = 0;

      for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;
        const b = positions[j];

        const dy = a.y - b.y;
        const dx = a.x - b.x;

        const verticalNeed =
          dy > 0
            ? a.topR + b.bottomR + 14
            : a.bottomR + b.topR + 14;

        const horizontalNeed = a.halfW + b.halfW + 18;

        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        const overlapX = horizontalNeed - adx;
        const overlapY = verticalNeed - ady;

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const sign = dx >= 0 ? 1 : -1;
            fx += sign * overlapX * 0.15;
          } else {
            const sign = dy >= 0 ? 1 : -1;
            fy += sign * overlapY * 0.18;
          }
        } else {
          const d2 = adx * adx + ady * ady + 1;
          const d = Math.sqrt(d2);
          if (d < 260) {
            const f = 1500 / d2;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }
      }

      fx += (cx - a.x) * centerK;
      fy += (cy - a.y) * centerK;

      a.vx = (a.vx + fx) * damping;
      a.vy = (a.vy + fy) * damping;
    }

    for (const [from, to] of edges) {
      const a = idx.get(from)!;
      const b = idx.get(to)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - linkLen) * linkK;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }

    for (const a of positions) {
      a.x += a.vx;
      a.y += a.vy;
      a.x = Math.max(padX + a.halfW * 0.5, Math.min(width - padX - a.halfW * 0.5, a.x));
      a.y = Math.max(padTop + a.topR, Math.min(height - padBottom - a.bottomR, a.y));
    }
  }

  return new Map(positions.map(p => [p.id, { x: p.x, y: p.y }]));
}

/* ─── Cluster node SVG ─────────────────────────────────────────────────── */
const ClusterNode: React.FC<{
  location: Location;
  x: number; y: number; size: number;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
  index: number;
}> = ({ location, x, y, size, hovered, selected, dimmed, onClick, onHover, index }) => {
  const palette = getPalette(location.status);
  const count = location.device_count ?? 0;
  const wrapped = wrapText(location.name, 18);
  const active = hovered || selected;

  const rings = [
    { r: size * 0.55, op: active ? 0.85 : 0.6 },
    { r: size * 0.78, op: active ? 0.55 : 0.3 },
    { r: size * 1.05, op: active ? 0.35 : 0.16 },
  ];
  const begin = `${(index * 0.18) % 3}s`;

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer', opacity: dimmed ? 0.3 : 1, transition: 'opacity .25s' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="cv-cluster"
    >
      {/* Pulse */}
      <circle cx={0} cy={0} r={size * 0.55} fill="none"
              stroke={palette.ring} strokeWidth={1} opacity={0}>
        <animate attributeName="r"
                 values={`${size * 0.55};${size * 1.45}`}
                 dur="3.2s" begin={begin} repeatCount="indefinite" />
        <animate attributeName="opacity"
                 values={active ? '0.85;0' : '0.4;0'}
                 dur="3.2s" begin={begin} repeatCount="indefinite" />
      </circle>

      {rings.map((ring, i) => (
        <circle key={i} cx={0} cy={0} r={ring.r}
                fill="none" stroke={palette.ring} strokeWidth={1}
                opacity={ring.op} />
      ))}

      <circle cx={0} cy={0} r={size * 0.40}
              fill={palette.ring} opacity={active ? 0.18 : 0.1} />

      <circle cx={0} cy={0} r={size * 0.34}
              fill="rgba(15, 23, 42, 0.96)"
              stroke={palette.ring}
              strokeWidth={selected ? 2 : 1.3} />

      <text x={0} y={1}
            textAnchor="middle" dominantBaseline="middle"
            fill={palette.text}
            fontSize={size * 0.32}
            fontWeight={500}
            fontFamily="'Inter', system-ui, sans-serif"
            style={{ pointerEvents: 'none', letterSpacing: '0.04em' }}>
        {String(count).padStart(2, '0')}
      </text>

      <g transform={`translate(0, ${size * 1.12 + 14})`}>
        {wrapped.map((line, i) => (
          <text key={i}
                x={0} y={i * 13}
                textAnchor="middle"
                fill={selected ? '#F8FAFC' : '#CBD5E1'}
                fontSize={11}
                fontWeight={selected ? 600 : 500}
                fontFamily="'Inter', system-ui, sans-serif"
                stroke="#0B1220"
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
                style={{ pointerEvents: 'none' }}>
            {line}
          </text>
        ))}
      </g>
    </g>
  );
};

/* ─── Info Row ─────────────────────────────────────────────────────────── */
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="cv-info-row">
    <span className="cv-info-lbl">{label}</span>
    <span className="cv-info-val" title={value}>{value}</span>
  </div>
);

/* ─── Detail Panel ─────────────────────────────────────────────────────── */
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
    health >= 80 ? '#10B981' :
    health >= 50 ? '#F59E0B' : '#EF4444';

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
              <span className="cv-panel-dot" style={{ background: palette.ring, boxShadow: `0 0 6px ${palette.ring}` }} />
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
                 style={{ width: `${health}%`, background: healthColor, boxShadow: `0 0 10px ${healthColor}66` }} />
          </div>
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-stats">
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#F8FAFC' }}>{total}</div>
              <div className="cv-panel-stat-lbl">DEVICES</div>
            </div>
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#10B981' }}>{online}</div>
              <div className="cv-panel-stat-lbl">ONLINE</div>
            </div>
            <div className="cv-panel-stat">
              <div className="cv-panel-stat-num" style={{ color: '#EF4444' }}>{offline}</div>
              <div className="cv-panel-stat-lbl">OFFLINE</div>
            </div>
          </div>
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-section-title">INFORMATION</div>
          <InfoRow label="Area"     value={location.area    || '—'} />
          <InfoRow label="Parent"   value={parent ? parent.name : 'None'} />
          <InfoRow label="Children" value={String(childLocations.length)} />
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-section-title">
            DEVICES {hasDevicesProp ? `· ${devices.length}` : `· ${total}`}
          </div>

          {hasDevicesProp && devices.length > 0 ? (
            <div className="cv-panel-devices">
              {devices.map(d => (
                <div key={d.id} className="cv-dev-row">
                  <span className="cv-dev-dot"
                        style={{ background: d.is_reachable ? '#10B981' : '#EF4444' }} />
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
                  <span className="cv-dev-dot"
                        style={{ background: getPalette(c.status).ring }} />
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
          Open in Topology
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDims({ w: Math.max(700, r.width), h: Math.max(500, r.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(
    () =>
      (allLocations || []).filter(
        (l) =>
          l.area === selectedArea &&
          (filterStatus === 'all' || l.status === filterStatus) &&
          (!searchTerm || l.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [allLocations, selectedArea, filterStatus, searchTerm]
  );

  const stats = useMemo(() => {
    const a = (allLocations || []).filter((l) => l.area === selectedArea);
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

  const SVG_W = dims.w;
  const SVG_H = Math.max(420, dims.h - 130);
  const positions = useMemo(
    () => forceLayout(filtered, SVG_W, SVG_H),
    [filtered, SVG_W, SVG_H]
  );

  const connectedToSelected = useMemo(() => {
    const set = new Set<number>();
    if (selectedId === null) return set;
    set.add(selectedId);
    for (const n of filtered) {
      if (n.id === selectedId && n.parent_id !== null) set.add(n.parent_id);
      if (n.parent_id === selectedId) set.add(n.id);
    }
    return set;
  }, [filtered, selectedId]);

  const edges = useMemo(() => {
    const list: { id: string; from: { x: number; y: number }; to: { x: number; y: number };
                  status: string; involvesSelected: boolean }[] = [];
    for (const n of filtered) {
      if (n.parent_id !== null) {
        const a = positions.get(n.id);
        const b = positions.get(n.parent_id);
        if (a && b) {
          list.push({
            id: `${n.id}-${n.parent_id}`,
            from: a, to: b, status: n.status,
            involvesSelected: selectedId !== null &&
              (n.id === selectedId || n.parent_id === selectedId),
          });
        }
      }
    }
    return list;
  }, [filtered, positions, selectedId]);

  const selectedLocation = selectedId !== null
    ? filtered.find((l) => l.id === selectedId) || null : null;
  const selectedParent = selectedLocation && selectedLocation.parent_id !== null
    ? (allLocations || []).find((l) => l.id === selectedLocation.parent_id) || null : null;
  const selectedChildren = selectedLocation
    ? (allLocations || []).filter((l) => l.parent_id === selectedLocation.id) : [];
  const selectedDevices = useMemo(() => {
    if (!selectedLocation) return [];
    return devices.filter((d) => d.location_id === selectedLocation.id);
  }, [selectedLocation, devices]);

  const hasDevicesProp = devices.length > 0;

  const handleClusterClick = (loc: Location) => {
    setSelectedId(prev => prev === loc.id ? null : loc.id);
  };

  return (
    <div className="cv-root" ref={containerRef}>
      {/* Header */}
      <header className="cv-header">
        <div className="cv-left">
          <button className="cv-back" onClick={onBack} title="Back to Areas">
            <ArrowLeft size={15} />
          </button>
          <div>
            <div className="cv-area-tag">CLUSTER · AREA</div>
            <div className="cv-area-name">{selectedArea}</div>
          </div>
          {stats.offline > 0 && (
            <span className="cv-critical-badge">
              <span className="cv-critical-dot" />
              {stats.offline} CRITICAL
            </span>
          )}
        </div>

        <div className="cv-right">
          <div className="cv-search">
            <Search size={13} />
            <input
              placeholder="Search nodes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="cv-stats-strip">
            <div className="cv-stat">
              <span className="cv-stat-val" style={{ color: '#F8FAFC' }}>{stats.total}</span>
              <span className="cv-stat-lbl">TOTAL</span>
            </div>
            <div className="cv-stat">
              <span className="cv-stat-val" style={{ color: '#10B981' }}>{stats.online}</span>
              <span className="cv-stat-lbl">UP</span>
            </div>
            <div className="cv-stat">
              <span className="cv-stat-val" style={{ color: '#EF4444' }}>{stats.offline}</span>
              <span className="cv-stat-lbl">DOWN</span>
            </div>
            <div className="cv-stat">
              <span className="cv-stat-val" style={{ color: '#F59E0B' }}>{stats.partial}</span>
              <span className="cv-stat-lbl">DEG</span>
            </div>
          </div>
        </div>
      </header>

      {/* Filter chips */}
      <div className="cv-chips">
        {(['all', 'online', 'partial', 'offline'] as const).map((s) => {
          const lbl = s === 'all' ? 'ALL' : getPalette(s).label;
          const active = filterStatus === s;
          const color = s === 'all' ? BRAND : getPalette(s).ring;
          return (
            <button
              key={s}
              className={`cv-chip ${active ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
              style={
                active
                  ? {
                      borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                      color,
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                    }
                  : undefined
              }
            >
              {lbl}
            </button>
          );
        })}
        <span className="cv-chip-spacer" />
        <span className="cv-result-count">
          {filtered.length} node{filtered.length !== 1 ? 's' : ''} · avg health {stats.avgHealth}%
        </span>
      </div>

      {/* Canvas */}
      <div className="cv-canvas-wrap">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
          onClick={(e) => {
            const t = e.target as SVGElement;
            if (t.tagName === 'rect' || t.tagName === 'svg') {
              setSelectedId(null);
            }
          }}
        >
          <defs>
            <radialGradient id="cv-bg" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="60%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#0B1220" />
            </radialGradient>
            <pattern id="cv-dots" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="0" cy="0" r="0.8" fill="rgba(148,163,184,0.06)" />
              <circle cx="32" cy="0" r="0.8" fill="rgba(148,163,184,0.06)" />
              <circle cx="0" cy="32" r="0.8" fill="rgba(148,163,184,0.06)" />
              <circle cx="32" cy="32" r="0.8" fill="rgba(148,163,184,0.06)" />
            </pattern>
          </defs>

          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#cv-bg)" />
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#cv-dots)" />

          {edges.map((e) => (
            <line
              key={`e-${e.id}`}
              x1={e.from.x} y1={e.from.y}
              x2={e.to.x}   y2={e.to.y}
              stroke={getPalette(e.status).ring}
              strokeWidth={e.involvesSelected ? 1.6 : 0.9}
              opacity={
                selectedId === null ? 0.2 :
                e.involvesSelected ? 0.65 : 0.06
              }
              style={{ transition: 'opacity .25s, stroke-width .25s' }}
            />
          ))}

          {filtered.map((loc, i) => {
            const p = positions.get(loc.id);
            if (!p) return null;
            const isSelected = selectedId === loc.id;
            const isHovered = hoveredId === loc.id;
            const isDimmed = selectedId !== null && !connectedToSelected.has(loc.id);
            return (
              <ClusterNode
                key={loc.id}
                location={loc}
                x={p.x}
                y={p.y}
                size={sizeFor(loc)}
                hovered={isHovered}
                selected={isSelected}
                dimmed={isDimmed}
                onClick={() => handleClusterClick(loc)}
                onHover={(h) => setHoveredId(h ? loc.id : null)}
                index={i}
              />
            );
          })}
        </svg>

        {filtered.length === 0 && (
          <div className="cv-empty">
            <Activity size={36} style={{ opacity: 0.25 }} />
            <div className="cv-empty-title">No nodes match</div>
            <div className="cv-empty-sub">
              {searchTerm ? 'Try a different search term' : 'Adjust the filter to see nodes'}
            </div>
          </div>
        )}

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
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          background: var(--bg-app);
          color: var(--text-hi);
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden; position: relative;
        }

        .cv-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 12px 22px;
          border-bottom: 1px solid var(--border-soft);
          background: rgba(11,18,32,0.85);
          backdrop-filter: blur(12px);
          flex-shrink: 0; z-index: 5;
          flex-wrap: wrap;
        }
        .cv-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .cv-back {
          width: 34px; height: 34px;
          border-radius: 8px;
          border: 1px solid var(--border-soft);
          background: var(--bg-panel);
          color: var(--text-mid);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .2s, color .2s, border-color .2s;
        }
        .cv-back:hover {
          color: var(--text-hi);
          background: var(--bg-raised);
          border-color: var(--border-strong);
        }
        .cv-area-tag {
          font-size: 9px; letter-spacing: 0.18em; color: var(--text-lo);
          margin-bottom: 1px; font-weight: 700;
        }
        .cv-area-name {
          font-size: 16px; font-weight: 600; color: var(--text-hi);
          letter-spacing: 0.01em;
        }

        .cv-critical-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(239,68,68,0.12);
          color: var(--status-offline);
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          border: 1px solid rgba(239,68,68,0.35);
        }
        .cv-critical-dot {
          width: 5px; height: 5px;
          background: var(--status-offline); border-radius: 50%;
          box-shadow: 0 0 6px var(--status-offline);
          animation: cvBlink 1.5s ease-in-out infinite;
        }

        .cv-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .cv-search { position: relative; display: flex; align-items: center; }
        .cv-search svg {
          position: absolute; left: 10px;
          color: var(--text-dim); pointer-events: none;
        }
        .cv-search input {
          padding: 7px 12px 7px 30px;
          background: var(--bg-panel);
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          color: var(--text-hi);
          font-family: inherit; font-size: 12px;
          width: 200px;
          transition: border-color .2s;
        }
        .cv-search input::placeholder { color: var(--text-dim); }
        .cv-search input:focus {
          outline: none;
          border-color: var(--border-brand);
        }

        .cv-stats-strip {
          display: flex; gap: 0;
          background: var(--bg-panel);
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          overflow: hidden;
        }
        .cv-stat {
          display: flex; flex-direction: column; align-items: center;
          padding: 6px 14px;
          border-left: 1px solid var(--border-soft);
        }
        .cv-stat:first-of-type { border-left: none; }
        .cv-stat-val { font-size: 15px; font-weight: 700; line-height: 1; }
        .cv-stat-lbl {
          font-size: 9px; color: var(--text-lo);
          letter-spacing: 0.12em; margin-top: 3px; font-weight: 600;
        }

        .cv-chips {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 22px;
          border-bottom: 1px solid var(--border-soft);
          background: rgba(15,23,42,0.4);
          flex-shrink: 0; z-index: 4;
        }
        .cv-chip {
          padding: 4px 12px;
          background: var(--bg-panel);
          border: 1px solid var(--border-soft);
          border-radius: 99px;
          color: var(--text-lo);
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all .15s;
        }
        .cv-chip:hover {
          color: var(--text-mid);
          border-color: var(--border-strong);
        }
        .cv-chip-spacer { flex: 1; }
        .cv-result-count {
          font-size: 10.5px; color: var(--text-lo);
          letter-spacing: 0.04em;
        }

        .cv-canvas-wrap { flex: 1; position: relative; overflow: hidden; }

        .cv-cluster text { user-select: none; }

        @keyframes cvBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        .cv-empty {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px;
          color: var(--text-lo);
          text-align: center;
          pointer-events: none;
        }
        .cv-empty-title { font-size: 14px; color: var(--text-mid); font-weight: 500; }
        .cv-empty-sub   { font-size: 11px; color: var(--text-lo); }

        /* ── Detail Panel ── */
        .cv-panel {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 340px;
          background: linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.97) 100%);
          backdrop-filter: blur(16px);
          border-left: 1px solid var(--border-soft);
          display: flex; flex-direction: column;
          box-shadow: -8px 0 32px rgba(0,0,0,0.45);
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
          border-bottom: 1px solid var(--border-soft);
        }
        .cv-panel-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        .cv-panel-num {
          width: 46px; height: 46px;
          border-radius: 50%;
          border: 1.5px solid;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 600;
          background: rgba(15, 23, 42, 0.7);
          flex-shrink: 0; letter-spacing: 0.02em;
        }
        .cv-panel-name {
          font-size: 15px; font-weight: 600;
          color: var(--text-hi); line-height: 1.3;
          margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cv-panel-substatus {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px;
          letter-spacing: 0.1em; font-weight: 700;
        }
        .cv-panel-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          animation: cvBlink 2s ease-in-out infinite;
        }
        .cv-panel-close {
          width: 28px; height: 28px;
          border-radius: 6px;
          border: 1px solid var(--border-soft);
          background: rgba(148,163,184,0.04);
          color: var(--text-mid);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
          transition: all .2s;
        }
        .cv-panel-close:hover {
          color: var(--text-hi);
          background: rgba(148,163,184,0.1);
        }

        .cv-panel-body { flex: 1; overflow-y: auto; padding: 4px 0; }
        .cv-panel-body::-webkit-scrollbar { width: 4px; }
        .cv-panel-body::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.15);
          border-radius: 2px;
        }
        .cv-panel-section {
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-soft);
        }
        .cv-panel-section:last-child { border-bottom: none; }
        .cv-panel-section-title {
          font-size: 9.5px; color: var(--text-lo);
          letter-spacing: 0.14em;
          font-weight: 700; margin-bottom: 10px;
        }
        .cv-panel-health-row {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 6px;
        }
        .cv-panel-health-label {
          font-size: 9.5px; color: var(--text-lo);
          letter-spacing: 0.14em; font-weight: 700;
        }
        .cv-panel-health-val {
          font-size: 18px; font-weight: 700;
          letter-spacing: -0.01em;
        }
        .cv-panel-bar {
          height: 5px;
          background: rgba(148,163,184,0.1);
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
          background: rgba(148,163,184,0.04);
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          padding: 10px 8px;
          text-align: center;
        }
        .cv-panel-stat-num {
          font-size: 18px; font-weight: 700;
          line-height: 1; margin-bottom: 4px;
        }
        .cv-panel-stat-lbl {
          font-size: 9px; color: var(--text-lo);
          letter-spacing: 0.12em; font-weight: 600;
        }

        .cv-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 0; font-size: 12px; gap: 10px;
        }
        .cv-info-lbl {
          color: var(--text-lo);
          font-size: 10px; letter-spacing: 0.08em;
          flex-shrink: 0; font-weight: 600;
        }
        .cv-info-val {
          color: var(--text-mid); font-weight: 500;
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
          background: rgba(148,163,184,0.15);
          border-radius: 2px;
        }
        .cv-dev-row, .cv-child-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          background: rgba(148,163,184,0.03);
          border: 1px solid var(--border-soft);
          border-radius: 6px;
          font-size: 11.5px;
          transition: background .15s, border-color .15s;
        }
        .cv-dev-row:hover, .cv-child-row:hover {
          background: rgba(148,163,184,0.07);
          border-color: var(--border-strong);
        }
        .cv-dev-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cv-dev-name {
          color: var(--text-mid); font-weight: 500;
          flex: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cv-dev-ip {
          color: var(--text-lo);
          font-size: 10px;
          flex-shrink: 0;
        }
        .cv-panel-empty {
          font-size: 11px; color: var(--text-lo);
          padding: 12px 0 4px;
          text-align: center; font-style: italic;
        }
        .cv-panel-empty-summary {
          color: var(--text-mid); font-style: normal;
          letter-spacing: 0.04em;
        }

        .cv-panel-foot {
          padding: 12px 18px;
          border-top: 1px solid var(--border-soft);
          background: rgba(11,18,32,0.4);
        }
        .cv-panel-cta {
          width: 100%;
          padding: 10px 14px;
          background: linear-gradient(180deg, ${BRAND} 0%, #06B6D4 100%);
          border: none;
          border-radius: 8px;
          color: #04121A;
          font-size: 12px; letter-spacing: 0.04em; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: all .2s;
          box-shadow: 0 6px 16px -8px rgba(6,182,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .cv-panel-cta:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .cv-search input { width: 130px; }
          .cv-stat { padding: 6px 10px; }
          .cv-stat-val { font-size: 13px; }
          .cv-panel { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;
