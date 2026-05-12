'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Filter, MoreVertical, Search, Activity, Camera, X, ChevronRight,
} from 'lucide-react';

/* ─── Types — unchanged contract ───────────────────────────────────────── */
interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown' | 'partial';
  // project: string;
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
  /** OPTIONAL — flat device list to populate the detail panel. */
  devices?: ClusterDevice[];
}

/* ─── Status palette ───────────────────────────────────────────────────── */
const STATUS_PALETTE = {
  online:  { ring: '#3ea7ff', accent: '#9cc8ff', label: 'ONLINE',   text: '#cfe5ff' },
  offline: { ring: '#f25c5c', accent: '#ffb8b8', label: 'OFFLINE',  text: '#ffd6d6' },
  partial: { ring: '#f5a623', accent: '#ffd58a', label: 'DEGRADED', text: '#ffe6b8' },
  unknown: { ring: '#6b7a8d', accent: '#9aa8bd', label: 'UNKNOWN',  text: '#bdc7d6' },
} as const;
const getPalette = (s: string) =>
  STATUS_PALETTE[s as keyof typeof STATUS_PALETTE] || STATUS_PALETTE.unknown;

/* ─── Seeded RNG (stable layout) ───────────────────────────────────────── */
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* ─── Word wrap ≤ 2 lines ──────────────────────────────────────────────── */
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

/* ─── Cluster sizing ───────────────────────────────────────────────────── */
function sizeFor(loc: Location): number {
  const c = loc.device_count ?? 0;
  const min = 30, max = 50;
  return min + Math.min(1, c / 30) * (max - min);
}
/** Approximate label box width in px from text content */
function labelWidth(name: string): number {
  const wrapped = wrapText(name, 18);
  const longest = wrapped.reduce((m, l) => Math.max(m, l.length), 0);
  return Math.min(longest * 7 + 8, 160); // ~7px per char, capped
}
/** Total footprint dimensions for a cluster (rings + label area) */
function footprint(loc: Location) {
  const r = sizeFor(loc) * 1.05;     // outer ring radius
  const lw = labelWidth(loc.name);   // label half-width on each side
  const lh = wrapText(loc.name, 18).length * 13 + 18; // label height + gap
  return {
    halfW: Math.max(r, lw / 2),
    topR: r,            // rings extend upward this much
    bottomR: r + lh,    // rings + label extend downward this much
  };
}

/* ─── Force-directed layout that respects labels ───────────────────────── */
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

  // Pre-compute footprints
  const meta = new Map<number, ReturnType<typeof footprint>>();
  for (const n of nodes) meta.set(n.id, footprint(n));

  // Initial scatter
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
    // Pairwise label-aware repulsion
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i];
      let fx = 0, fy = 0;

      for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;
        const b = positions[j];

        // Required minimum separation depends on which side is closer
        const dy = a.y - b.y;
        const dx = a.x - b.x;

        // Vertical: label of upper extends down, rings of lower extend up
        const verticalNeed =
          dy > 0
            ? a.topR + b.bottomR + 14   // a is below b → a.top vs b.bottom (b's label)
            : a.bottomR + b.topR + 14;  // a is above b → a.bottom (a's label) vs b.top

        const horizontalNeed = a.halfW + b.halfW + 18;

        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        // Soft-AABB repulsion: only push if boxes overlap (or nearly do)
        const overlapX = horizontalNeed - adx;
        const overlapY = verticalNeed - ady;

        if (overlapX > 0 && overlapY > 0) {
          // Push along the smaller-overlap axis (separating axis)
          if (overlapX < overlapY) {
            const sign = dx >= 0 ? 1 : -1;
            fx += sign * overlapX * 0.15;
          } else {
            const sign = dy >= 0 ? 1 : -1;
            fy += sign * overlapY * 0.18;
          }
        } else {
          // Mild radial repulsion at intermediate distances to encourage spread
          const d2 = adx * adx + ady * ady + 1;
          const d = Math.sqrt(d2);
          if (d < 260) {
            const f = 1500 / d2;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }
      }

      // Center pull
      fx += (cx - a.x) * centerK;
      fy += (cy - a.y) * centerK;

      a.vx = (a.vx + fx) * damping;
      a.vy = (a.vy + fy) * damping;
    }

    // Spring along parent edges
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

    // Integrate + clamp using actual footprint
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
    { r: size * 0.55, op: active ? 0.8 : 0.55 },
    { r: size * 0.78, op: active ? 0.55 : 0.32 },
    { r: size * 1.05, op: active ? 0.35 : 0.18 },
  ];
  const begin = `${(index * 0.18) % 3}s`;

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer', opacity: dimmed ? 0.32 : 1, transition: 'opacity .25s' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="cv-cluster"
    >
      {/* Pulse ring — runs always, gentle */}
      <circle cx={0} cy={0} r={size * 0.55} fill="none"
              stroke={palette.ring} strokeWidth={1} opacity={0}>
        <animate attributeName="r"
                 values={`${size * 0.55};${size * 1.45}`}
                 dur="3.2s" begin={begin} repeatCount="indefinite" />
        <animate attributeName="opacity"
                 values={active ? '0.85;0' : '0.45;0'}
                 dur="3.2s" begin={begin} repeatCount="indefinite" />
      </circle>

      {/* Static rings */}
      {rings.map((ring, i) => (
        <circle key={i} cx={0} cy={0} r={ring.r}
                fill="none" stroke={palette.ring} strokeWidth={1}
                opacity={ring.op} />
      ))}

      {/* Inner glow */}
      <circle cx={0} cy={0} r={size * 0.40}
              fill={palette.ring} opacity={active ? 0.18 : 0.10} />

      {/* Inner solid disk */}
      <circle cx={0} cy={0} r={size * 0.34}
              fill="rgba(8, 18, 30, 0.95)"
              stroke={palette.ring}
              strokeWidth={selected ? 1.8 : 1.3} />

      {/* Count */}
      <text x={0} y={1}
            textAnchor="middle" dominantBaseline="middle"
            fill={palette.text}
            fontSize={size * 0.34}
            fontWeight={300}
            fontFamily="'JetBrains Mono','Fira Code',monospace"
            style={{ pointerEvents: 'none', letterSpacing: '0.5px' }}>
        {String(count).padStart(2, '0')}
      </text>

      {/* Label — with paint-order halo so it stays readable on grazing */}
      <g transform={`translate(0, ${size * 1.12 + 14})`}>
        {wrapped.map((line, i) => (
          <text key={i}
                x={0} y={i * 13}
                textAnchor="middle"
                fill={selected ? '#f0f6ff' : '#cdd9e8'}
                fontSize={11}
                fontWeight={selected ? 600 : 500}
                fontFamily="'Inter',system-ui,sans-serif"
                stroke="#060d18"
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
              {/* {location.project && (
                <span className="cv-panel-meta-pill">{location.project}</span>
              )} */}
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
          {/* <InfoRow label="Project"  value={location.project || '—'} /> */}
          <InfoRow label="Area"     value={location.area    || '—'} />
          <InfoRow label="Parent"   value={parent ? parent.name : 'None'} />
          <InfoRow label="Children" value={String(childLocations.length)} />
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
                  <span className="cv-dev-dot"
                        style={{ background: d.is_reachable ? '#22d3a5' : '#f25c5c' }} />
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
  const SVG_H = Math.max(420, dims.h - 110);
  const positions = useMemo(
    () => forceLayout(filtered, SVG_W, SVG_H),
    [filtered, SVG_W, SVG_H]
  );

  // Connected lookup for dim/highlight
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

  // Edges
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
          <button className="cv-back" onClick={onBack} title="Back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="cv-area-tag">CLUSTER · AREA</div>
            <div className="cv-area-name">{selectedArea}</div>
          </div>
          {stats.offline > 0 && (
            <span className="cv-malicious-badge">
              <span className="cv-malicious-dot" />
              CRITICAL ALERT
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

          <div className="cv-stat">
            <span className="cv-stat-val" style={{ color: '#9cc8ff' }}>{stats.total}</span>
            <span className="cv-stat-lbl">TOTAL</span>
          </div>
          <div className="cv-stat">
            <span className="cv-stat-val" style={{ color: '#22d3a5' }}>{stats.online}</span>
            <span className="cv-stat-lbl">UP</span>
          </div>
          <div className="cv-stat">
            <span className="cv-stat-val" style={{ color: '#f25c5c' }}>{stats.offline}</span>
            <span className="cv-stat-lbl">DOWN</span>
          </div>
          <div className="cv-stat">
            <span className="cv-stat-val" style={{ color: '#f5a623' }}>{stats.partial}</span>
            <span className="cv-stat-lbl">DEG</span>
          </div>

          <button className="cv-icon-btn" title="Filter">
            <Filter size={14} />
          </button>
          <button className="cv-icon-btn" title="More">
            <MoreVertical size={14} />
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
              <stop offset="0%" stopColor="#13243b" />
              <stop offset="60%" stopColor="#0a1626" />
              <stop offset="100%" stopColor="#060d18" />
            </radialGradient>
          </defs>

          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#cv-bg)" />

          {/* Edges */}
          {edges.map((e) => (
            <line
              key={`e-${e.id}`}
              x1={e.from.x} y1={e.from.y}
              x2={e.to.x}   y2={e.to.y}
              stroke={getPalette(e.status).ring}
              strokeWidth={e.involvesSelected ? 1.5 : 0.8}
              opacity={
                selectedId === null ? 0.18 :
                e.involvesSelected ? 0.6 : 0.05
              }
              style={{ transition: 'opacity .25s, stroke-width .25s' }}
            />
          ))}

          {/* Cluster nodes */}
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

        <div className="cv-camera">
          <Camera size={18} />
        </div>
      </div>

      {/* Styles */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .cv-root {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          background: #060d18;
          color: #c8d6e5;
          font-family: 'JetBrains Mono','Fira Code',ui-monospace,monospace;
          overflow: hidden; position: relative;
        }

        .cv-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 12px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(8,18,30,0.65);
          backdrop-filter: blur(6px);
          flex-shrink: 0; z-index: 5;
        }
        .cv-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
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
        .cv-area-tag { font-size: 9px; letter-spacing: 1.5px; color: #4a5568; margin-bottom: 1px; }
        .cv-area-name { font-size: 16px; font-weight: 600; color: #f0f6ff; letter-spacing: 0.3px; }

        .cv-malicious-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(90deg, #ff3a6e, #d6244e);
          color: #fff;
          padding: 4px 11px;
          border-radius: 99px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
          box-shadow: 0 0 14px rgba(255,58,110,0.35);
        }
        .cv-malicious-dot {
          width: 5px; height: 5px;
          background: #fff; border-radius: 50%;
          animation: cvBlink 1.5s ease-in-out infinite;
        }

        .cv-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .cv-search { position: relative; display: flex; align-items: center; }
        .cv-search svg { position: absolute; left: 9px; color: #4a5568; pointer-events: none; }
        .cv-search input {
          padding: 6px 10px 6px 28px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          color: #c5cdd8;
          font-family: inherit; font-size: 11px;
          width: 180px;
          transition: border-color .2s;
        }
        .cv-search input::placeholder { color: #3a4556; }
        .cv-search input:focus { outline: none; border-color: rgba(62,167,255,0.4); }

        .cv-stat {
          display: flex; flex-direction: column; align-items: center;
          padding: 0 10px;
          border-left: 1px solid rgba(255,255,255,0.06);
        }
        .cv-stat:first-of-type { border-left: none; }
        .cv-stat-val { font-size: 14px; font-weight: 700; line-height: 1; }
        .cv-stat-lbl { font-size: 9px; color: #4a5568; letter-spacing: 1px; margin-top: 2px; }

        .cv-icon-btn {
          width: 28px; height: 28px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          color: #6b7a8d;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .cv-icon-btn:hover { color: #c5cdd8; }

        .cv-chips {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          flex-shrink: 0; z-index: 4;
        }
        .cv-chip {
          padding: 4px 11px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          color: #6b7a8d;
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.8px;
          cursor: pointer;
          transition: all .2s;
        }
        .cv-chip:hover { color: #c5cdd8; border-color: rgba(255,255,255,0.18); }
        .cv-chip-spacer { flex: 1; }
        .cv-result-count { font-size: 10px; color: #4a5568; letter-spacing: 0.5px; }

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
          color: #4a5568;
          text-align: center;
          pointer-events: none;
        }
        .cv-empty-title { font-size: 14px; color: #6b7a8d; }
        .cv-empty-sub   { font-size: 11px; color: #4a5568; }

        .cv-camera {
          position: absolute;
          left: 18px; bottom: 18px;
          width: 40px; height: 40px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #8892a4;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background .2s, color .2s;
        }
        .cv-camera:hover { background: rgba(255,255,255,0.08); color: #c5cdd8; }

        /* ── Detail Panel ── */
        .cv-panel {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 340px;
          background: linear-gradient(180deg, rgba(12,23,38,0.97) 0%, rgba(8,18,30,0.97) 100%);
          backdrop-filter: blur(12px);
          border-left: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          box-shadow: -8px 0 32px rgba(0,0,0,0.5);
          animation: cvPanelIn .3s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 20;
          font-family: 'Inter', system-ui, sans-serif;
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
        .cv-panel-meta-pill {
          padding: 1px 6px;
          background: rgba(255,255,255,0.04);
          border-radius: 3px;
          color: #6b7a8d;
          letter-spacing: 0.3px;
          margin-left: 4px;
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
          .cv-search input { width: 130px; }
          .cv-stat { padding: 0 7px; }
          .cv-stat-val { font-size: 12px; }
          .cv-panel { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;