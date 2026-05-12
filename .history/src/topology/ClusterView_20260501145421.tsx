'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Search, Filter, X, ChevronRight, Activity,
} from 'lucide-react';

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
}

/* Optional in-panel device list shape — supply if you want the actual
   device rows. Component still works without it. */
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
  devices?: ClusterDevice[]; // OPTIONAL — pass to populate panel device list
}

/* ─── Status palette ───────────────────────────────────────────────────── */
const STATUS_PALETTE = {
  online:  { ring: '#3ea7ff', text: '#cfe5ff', label: 'ONLINE'   },
  offline: { ring: '#f25c5c', text: '#ffd6d6', label: 'OFFLINE'  },
  partial: { ring: '#f5a623', text: '#ffe6b8', label: 'DEGRADED' },
  unknown: { ring: '#6b7a8d', text: '#bdc7d6', label: 'UNKNOWN'  },
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

/* ─── Smaller node sizing ──────────────────────────────────────────────── */
function sizeFor(loc: Location): number {
  const c = loc.device_count ?? 0;
  const min = 18, max = 28; // roughly 1/3 of the previous size
  return min + Math.min(1, c / 30) * (max - min);
}

/* ─── Force-directed layout ────────────────────────────────────────────── */
function forceLayout(
  nodes: Location[],
  width: number,
  height: number,
  iterations = 220
): Map<number, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const cx = width / 2, cy = height / 2;
  const pad = 70;
  const rng = makeRng(nodes.length * 31 + 7);

  type P = { id: number; x: number; y: number; vx: number; vy: number };
  const positions: P[] = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(width, height) * 0.22 * (0.7 + rng() * 0.5);
    return {
      id: n.id,
      x: cx + Math.cos(a) * r + (rng() - 0.5) * 50,
      y: cy + Math.sin(a) * r + (rng() - 0.5) * 50,
      vx: 0, vy: 0,
    };
  });

  const idx = new Map(positions.map(p => [p.id, p]));
  const edges: [number, number][] = [];
  for (const n of nodes) {
    if (n.parent_id !== null && idx.has(n.parent_id)) {
      edges.push([n.id, n.parent_id]);
    }
  }

  // Tighter values, since the nodes are smaller
  const repel    = 9000;
  const linkK    = 0.04;
  const linkLen  = 130;
  const centerK  = 0.005;
  const damping  = 0.85;

  for (let it = 0; it < iterations; it++) {
    for (const a of positions) {
      let fx = 0, fy = 0;
      for (const b of positions) {
        if (a.id === b.id) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = Math.max(50, dx * dx + dy * dy);
        const d = Math.sqrt(d2);
        const f = repel / d2;
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }
      fx += (cx - a.x) * centerK;
      fy += (cy - a.y) * centerK;
      a.vx = (a.vx + fx) * damping;
      a.vy = (a.vy + fy) * damping;
    }
    for (const [from, to] of edges) {
      const a = idx.get(from)!, b = idx.get(to)!;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - linkLen) * linkK;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    for (const a of positions) {
      a.x += a.vx; a.y += a.vy;
      a.x = Math.max(pad, Math.min(width - pad, a.x));
      a.y = Math.max(pad + 20, Math.min(height - pad, a.y));
    }
  }

  return new Map(positions.map(p => [p.id, { x: p.x, y: p.y }]));
}

/* ─── Cluster node ─────────────────────────────────────────────────────── */
const ClusterNode: React.FC<{
  location: Location;
  x: number; y: number; size: number;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}> = ({ location, x, y, size, hovered, selected, dimmed, onClick, onHover }) => {
  const palette = getPalette(location.status);
  const count = location.device_count ?? 0;
  const wrapped = wrapText(location.name, 18);
  const active = hovered || selected;
  const baseOpacity = dimmed ? 0.35 : 1;

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer', opacity: baseOpacity, transition: 'opacity .25s' }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Outer ring */}
      <circle
        cx={0} cy={0} r={size * 1.0}
        fill="none"
        stroke={palette.ring}
        strokeWidth={1}
        opacity={active ? 0.5 : 0.18}
      />
      {/* Mid ring */}
      <circle
        cx={0} cy={0} r={size * 0.72}
        fill="none"
        stroke={palette.ring}
        strokeWidth={1}
        opacity={active ? 0.7 : 0.32}
      />
      {/* Glow halo (only when active) */}
      {active && (
        <circle cx={0} cy={0} r={size * 0.6} fill={palette.ring} opacity={0.12} />
      )}
      {/* Inner solid disk */}
      <circle
        cx={0} cy={0} r={size * 0.5}
        fill="rgba(8, 18, 30, 0.95)"
        stroke={palette.ring}
        strokeWidth={selected ? 1.6 : 1.2}
      />

      {/* Pulse — only when active. No constant animation. */}
      {active && (
        <circle
          cx={0} cy={0} r={size * 0.55}
          fill="none"
          stroke={palette.ring}
          strokeWidth={1}
          opacity={0}
        >
          <animate attributeName="r"
            values={`${size * 0.55};${size * 1.4}`}
            dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            values="0.7;0"
            dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Count */}
      <text
        x={0} y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={palette.text}
        fontSize={size * 0.55}
        fontWeight={300}
        fontFamily="'JetBrains Mono','Fira Code',monospace"
        style={{ pointerEvents: 'none', letterSpacing: '0.5px' }}
      >
        {String(count).padStart(2, '0')}
      </text>

      {/* Label */}
      <g transform={`translate(0, ${size + 14})`}>
        {wrapped.map((line, i) => (
          <text
            key={i}
            x={0}
            y={i * 13}
            textAnchor="middle"
            fill={selected ? '#f0f6ff' : '#9aa8bd'}
            fontSize={11}
            fontWeight={selected ? 600 : 500}
            fontFamily="'Inter',system-ui,sans-serif"
            style={{ pointerEvents: 'none' }}
          >
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
      {/* Head */}
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

      {/* Body */}
      <div className="cv-panel-body">
        {/* Health */}
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

        {/* Stats */}
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

        {/* Information */}
        <section className="cv-panel-section">
          <div className="cv-panel-section-title">INFORMATION</div>
          <InfoRow label="Project"  value={location.project || '—'} />
          <InfoRow label="Area"     value={location.area    || '—'} />
          <InfoRow label="Parent"   value={parent ? parent.name : 'None'} />
          <InfoRow label="Children" value={String(childLocations.length)} />
          {location.status_reason && (
            <InfoRow label="Reason" value={location.status_reason} />
          )}
        </section>

        {/* Devices */}
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

        {/* Sub-locations */}
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

      {/* Footer */}
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
      allLocations.filter(
        (l) =>
          l.area === selectedArea &&
          (filterStatus === 'all' || l.status === filterStatus) &&
          (!searchTerm || l.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [allLocations, selectedArea, filterStatus, searchTerm]
  );

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

  const SVG_W = dims.w;
  const SVG_H = Math.max(420, dims.h - 110);
  const positions = useMemo(
    () => forceLayout(filtered, SVG_W, SVG_H),
    [filtered, SVG_W, SVG_H]
  );

  const edges = useMemo(() => {
    const list: { id: string; from: { x: number; y: number };
                  to: { x: number; y: number };
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
    ? filtered.find((l) => l.id === selectedId) : null;
  const selectedParent = selectedLocation && selectedLocation.parent_id !== null
    ? allLocations.find((l) => l.id === selectedLocation.parent_id) || null
    : null;
  const selectedChildren = selectedLocation
    ? allLocations.filter((l) => l.parent_id === selectedLocation.id)
    : [];
  const selectedDevices = useMemo(() => {
    if (!selectedLocation) return [];
    return devices.filter((d) => d.location_id === selectedLocation.id);
  }, [selectedLocation, devices]);

  const hasDevicesProp = devices.length > 0;

  const handleClusterClick = (loc: Location) => {
    // Toggle: clicking the open one closes the panel
    setSelectedId(prev => prev === loc.id ? null : loc.id);
  };

  // Set of ids connected to the selection — used to keep their nodes bright
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
        <span className="cv-result-count">{filtered.length} shown</span>
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
            // Clicking on the SVG background closes any open panel
            const target = e.target as SVGElement;
            if (target.tagName === 'rect' || target.tagName === 'svg') {
              setSelectedId(null);
            }
          }}
        >
          <defs>
            <radialGradient id="cv-bg" cx="50%" cy="50%" r="75%">
              <stop offset="0%"   stopColor="#13243b" />
              <stop offset="60%"  stopColor="#0a1626" />
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
                e.involvesSelected ? 0.6 : 0.06
              }
              style={{ transition: 'opacity .25s, stroke-width .25s' }}
            />
          ))}

          {/* Cluster nodes */}
          {filtered.map((loc) => {
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
          background: rgba(8, 18, 30, 0.65);
          backdrop-filter: blur(6px);
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
        }
        .cv-icon-btn:hover { color: #c5cdd8; }

        /* Chips */
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

        /* Canvas */
        .cv-canvas-wrap { flex: 1; position: relative; overflow: hidden; }

        /* Empty */
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

        /* Panel */
        .cv-panel {
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 340px;
          background: linear-gradient(180deg, #0c1726 0%, #08121e 100%);
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
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cv-panel-head-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .cv-panel-num {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 1.5px solid;
          display: flex; align-items: center; justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 300;
          background: rgba(8, 18, 30, 0.7);
          flex-shrink: 0;
          letter-spacing: 0.5px;
        }
        .cv-panel-name {
          font-size: 15px;
          font-weight: 600;
          color: #f0f6ff;
          line-height: 1.3;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cv-panel-substatus {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.8px;
          font-weight: 600;
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
          cursor: pointer;
          flex-shrink: 0;
          transition: all .2s;
        }
        .cv-panel-close:hover { color: #c5cdd8; background: rgba(255,255,255,0.05); }

        .cv-panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }
        .cv-panel-body::-webkit-scrollbar { width: 4px; }
        .cv-panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .cv-panel-section {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cv-panel-section:last-child { border-bottom: none; }
        .cv-panel-section-title {
          font-size: 9px;
          color: #4a5568;
          letter-spacing: 1.5px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .cv-panel-health-row {
          display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 6px;
        }
        .cv-panel-health-label {
          font-size: 9px;
          color: #4a5568;
          letter-spacing: 1.5px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }
        .cv-panel-health-val {
          font-size: 18px;
          font-weight: 700;
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
          height: 100%;
          border-radius: 99px;
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
          font-size: 18px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1;
          margin-bottom: 4px;
        }
        .cv-panel-stat-lbl {
          font-size: 9px;
          color: #4a5568;
          letter-spacing: 1px;
          font-family: 'JetBrains Mono', monospace;
        }

        .cv-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          font-size: 12px;
          gap: 10px;
        }
        .cv-info-lbl {
          color: #4a5568;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.8px;
          flex-shrink: 0;
        }
        .cv-info-val {
          color: #c5cdd8;
          font-weight: 500;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cv-panel-devices, .cv-panel-children {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 240px;
          overflow-y: auto;
        }
        .cv-panel-devices::-webkit-scrollbar,
        .cv-panel-children::-webkit-scrollbar { width: 4px; }
        .cv-panel-devices::-webkit-scrollbar-thumb,
        .cv-panel-children::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
        }
        .cv-dev-row, .cv-child-row {
          display: flex;
          align-items: center;
          gap: 8px;
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
          color: #c5cdd8;
          font-weight: 500;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cv-dev-ip {
          color: #6b7a8d;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          flex-shrink: 0;
        }
        .cv-panel-empty {
          font-size: 11px;
          color: #4a5568;
          padding: 12px 0 4px;
          text-align: center;
          font-style: italic;
        }
        .cv-panel-empty-summary {
          color: #8892a4;
          font-style: normal;
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
          font-size: 11px;
          letter-spacing: 0.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
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
      `}</style>'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Map as MapGL, Marker, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowLeft, Search, Filter, X, ChevronRight, Activity,
} from 'lucide-react';

/* ─── PMTiles protocol (same setup as MapViewer) ───────────────────────── */
const protocol = new Protocol();
// Guard against double-registration if MapViewer already registered it
if (typeof maplibregl.removeProtocol === 'function') {
  try { maplibregl.removeProtocol('pmtiles'); } catch { /* noop */ }
}
maplibregl.addProtocol('pmtiles', protocol.tile);

/* ─── Types — same shape MapViewer uses ────────────────────────────────── */
export interface PopupData {
  indicatorColour: 'red' | 'blue' | 'white' | 'green';
  headerLeft: { field: string; value: string };
  headerRight: { field: string; value: string };
  sideLabel: { field: string; value: string };
  data: { field: string; value: string; colour: 'red' | 'blue' | 'white' | 'green' }[];
}

export interface MapDataPoint {
  id: string | number;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  value: number;
  category: 'red' | 'azul' | 'green';
  popupData?: PopupData;
  additionalData?: Record<string, any>;
  location?: string; // location NAME — used to group into clusters
}

interface ClusterViewProps {
  /** Same data shape as MapViewer's `data` prop. Devices grouped by `location` name. */
  data: MapDataPoint[];
  /** Used as the area title in the header. */
  selectedArea: string;
  onBack: () => void;
  /** Fired when "View Full Details" is clicked in the panel — receives the cluster's location name. */
  onClusterSelect?: (locationName: string, devices: MapDataPoint[]) => void;
  /** Fired when an individual device row in the panel is clicked. */
  onDeviceSelect?: (device: MapDataPoint) => void;

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

/* ─── Cluster (a location-name group of devices) ───────────────────────── */
interface Cluster {
  id: string;                 // location name (or coords-fallback)
  name: string;               // display name
  coordinates: [number, number];
  devices: MapDataPoint[];
  total: number;
  online: number;
  offline: number;
  status: ClusterStatus;
}

/* Group devices by `location` name. Mirrors MapViewer's groupDevicesByLocation
   but groups on the LOCATION FIELD only (not name+coords), and produces a
   cluster for every group (size 1 included, since we want every location
   on the map). */
function groupByLocation(data: MapDataPoint[]): Cluster[] {
  const map = new Map<string, MapDataPoint[]>();

  for (const d of data) {
    // Use the explicit `location` if set, else fall back to coord key,
    // else fall back to device name. This matches the spirit of MapViewer.
    const key =
      (d.location && d.location.trim()) ||
      (Array.isArray(d.coordinates)
        ? `@${d.coordinates[0].toFixed(5)},${d.coordinates[1].toFixed(5)}`
        : d.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }

  const clusters: Cluster[] = [];
  for (const [key, devices] of map.entries()) {
    if (devices.length === 0) continue;
    const online = devices.filter((d) => d.category === 'green').length;
    const offline = devices.filter((d) => d.category === 'red').length;
    const total = devices.length;

    let status: ClusterStatus = 'unknown';
    if (offline > 0 && online > 0) status = 'mixed';
    else if (offline > 0) status = 'red';
    else if (online > 0) status = 'green';
    else status = 'azul';

    clusters.push({
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
  return clusters;
}

/* ─── Mean center / zoom — same logic as MapViewer ─────────────────────── */
function calculateMeanCenter(
  data: { coordinates: [number, number] }[]
): { center: [number, number]; zoom: number } | null {
  if (data.length === 0) return null;
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

  let zoomLevel: number;
  if (maxSpan > 10) zoomLevel = 5;
  else if (maxSpan > 5) zoomLevel = 6;
  else if (maxSpan > 2) zoomLevel = 7;
  else if (maxSpan > 1) zoomLevel = 8;
  else if (maxSpan > 0.5) zoomLevel = 9;
  else if (maxSpan > 0.2) zoomLevel = 10;
  else if (maxSpan > 0.1) zoomLevel = 11;
  else zoomLevel = 12;

  return { center: [meanLon, meanLat], zoom: zoomLevel };
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
      <span
        className="cv-ring-outer"
        style={{ width: outerSize, height: outerSize, borderColor: palette.ring }}
      />
      <span
        className="cv-ring-mid"
        style={{ width: outerSize * 0.72, height: outerSize * 0.72, borderColor: palette.ring }}
      />
      {active && (
        <span
          className="cv-ring-glow"
          style={{ width: innerSize * 1.4, height: innerSize * 1.4, background: palette.ring }}
        />
      )}
      {active && (
        <span
          className="cv-ring-pulse"
          style={{ width: innerSize, height: innerSize, borderColor: palette.ring }}
        />
      )}
      <span
        className="cv-ring-inner"
        style={{ width: innerSize, height: innerSize, borderColor: palette.ring, color: palette.text }}
      >
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
  onDeviceSelect?: (device: MapDataPoint) => void;
}> = ({ cluster, onClose, onViewFull, onDeviceSelect }) => {
  const palette = getPalette(cluster.status);
  const health = cluster.total > 0 ? Math.round((cluster.online / cluster.total) * 100) : 0;
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
          <InfoRow label="Devices" value={String(cluster.total)} />
        </section>

        <section className="cv-panel-section">
          <div className="cv-panel-section-title">DEVICES · {cluster.devices.length}</div>
          <div className="cv-panel-devices">
            {cluster.devices.map((d) => (
              <div
                key={d.id}
                className="cv-dev-row"
                onClick={() => onDeviceSelect?.(d)}
                style={{ cursor: onDeviceSelect ? 'pointer' : 'default' }}
              >
                <span
                  className="cv-dev-dot"
                  style={{ background: STATUS_COLOR[d.category]?.ring || '#6b7a8d' }}
                />
                <span className="cv-dev-name">{d.name}</span>
                {d.additionalData?.ip && (
                  <span className="cv-dev-ip">{d.additionalData.ip}</span>
                )}
              </div>
            ))}
          </div>
        </section>
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
  selectedArea,
  onBack,
  onClusterSelect,
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

  /* Filter devices then group into clusters (same shape MapViewer uses) */
  const filteredData = useMemo(() => {
    let out = data;
    if (filterStatus === 'online') out = out.filter((p) => p.category === 'green');
    else if (filterStatus === 'offline') out = out.filter((p) => p.category === 'red');

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      out = out.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [data, filterStatus, searchTerm]);

  const clusters = useMemo(() => groupByLocation(filteredData), [filteredData]);

  /* Stats over the full dataset (ignore search/filter, like MapViewer) */
  const stats = useMemo(() => ({
    total: data.length,
    online: data.filter((p) => p.category === 'green').length,
    offline: data.filter((p) => p.category === 'red').length,
  }), [data]);

  /* Mean center for auto-zoom — based on clusters, not raw points */
  const meanCenter = useMemo(() => {
    if (!autoZoomToDensity || clusters.length === 0) return null;
    return calculateMeanCenter(clusters);
  }, [clusters, autoZoomToDensity]);

  const initialViewState = useMemo(() => {
    if (autoZoomToDensity && meanCenter) {
      return {
        longitude: meanCenter.center[0],
        latitude: meanCenter.center[1],
        zoom: meanCenter.zoom,
      };
    }
    return {
      longitude: centerCoordinates[0],
      latitude: centerCoordinates[1],
      zoom,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Map style — same PMTiles config as MapViewer.mapConfig */
  const mapConfig = useMemo(() => {
    const pmtilesUrl = (import.meta as any).env?.VITE_MAP_SOURCE ||
      'https://build.protomaps.com/20230901.pmtiles';

    const customLayers: any[] = [
      {
        id: 'earth',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'earth',
        paint: {
          'fill-color': mapFlavor === 'dark' ? '#1a1a1a' : '#f8f8f8',
          'fill-opacity': 1,
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'water',
        paint: {
          'fill-color': mapFlavor === 'dark' ? '#0d47a1' : '#a8d8f0',
          'fill-opacity': 0.2,
        },
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'landuse',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            'residential', mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8',
            'commercial', mapFlavor === 'dark' ? '#3a2a2a' : '#f0e8e8',
            'industrial', mapFlavor === 'dark' ? '#3a3a2a' : '#e8e8f0',
            'park', mapFlavor === 'dark' ? '#1a4d2e' : '#c8e6c9',
            mapFlavor === 'dark' ? '#2a2a2a' : '#e8e8e8',
          ],
          'fill-opacity': 0.3,
        },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'india-tiles',
        'source-layer': 'landcover',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            'grass', mapFlavor === 'dark' ? '#2a4d2e' : '#d8e6c9',
            'wood', mapFlavor === 'dark' ? '#1a3d2e' : '#b8d6b9',
            'scrub', mapFlavor === 'dark' ? '#2a3d2e' : '#c8d6c9',
            mapFlavor === 'dark' ? '#2a3d2e' : '#c8d6c9',
          ],
          'fill-opacity': 0.4,
        },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'roads',
        filter: ['in', 'class', 'minor', 'service'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#3a3a3a' : '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 2, 18, 4],
          'line-opacity': 0.7,
        },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'roads',
        filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
        paint: {
          'line-color': mapFlavor === 'dark' ? '#4a4a4a' : '#ffd700',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 3, 16, 8],
          'line-opacity': 0.8,
        },
      },
      {
        id: 'boundaries',
        type: 'line',
        source: 'india-tiles',
        'source-layer': 'boundaries',
        paint: {
          'line-color': mapFlavor === 'dark' ? '#666666' : '#999999',
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 8, 2, 12, 3],
          'line-dasharray': [3, 2],
          'line-opacity': 0.7,
        },
      },
      {
        id: 'places',
        type: 'symbol',
        source: 'india-tiles',
        'source-layer': 'places',
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
        },
      },
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

  /* Auto-zoom to mean center, like MapViewer */
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
      mapRef.current.flyTo({
        center: c.coordinates,
        duration: 600,
      });
    }
  };

  const refit = useCallback(() => {
    if (!mapRef.current || clusters.length === 0) return;
    const mc = calculateMeanCenter(clusters);
    if (!mc) return;
    mapRef.current.flyTo({
      center: mc.center,
      zoom: mc.zoom,
      duration: 800,
    });
  }, [clusters]);

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
            <b>{stats.total}</b> devices
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#22d3a5' }}>{stats.online}</b> up
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#f25c5c' }}>{stats.offline}</b> down
            <span className="cv-summary-dot">·</span>
            <b style={{ color: '#9cc8ff' }}>{clusters.length}</b> sites
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
          const lbl = s.toUpperCase();
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
        <span className="cv-result-count">{clusters.length} sites shown</span>
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
          {/* Optional spokes — when a cluster is selected, draw a line to each
              of its devices (placed in a small circle around the cluster).
              Mirrors the topology spokes in MapViewer. */}
          {selectedCluster && selectedCluster.devices.length > 1 && (
            <Source
              id="cv-spokes"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: selectedCluster.devices.map((d, i, arr) => {
                  const r = 0.0015;
                  const a = (i / arr.length) * Math.PI * 2;
                  const lng = selectedCluster.coordinates[0] + Math.cos(a) * r;
                  const lat = selectedCluster.coordinates[1] + Math.sin(a) * r;
                  return {
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: [selectedCluster.coordinates, [lng, lat]],
                    },
                    properties: {
                      color: STATUS_COLOR[d.category]?.ring || '#6b7a8d',
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

          {/* Ring markers — one per cluster */}
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

          {/* Selected — small device dots arranged around the cluster center */}
          {selectedCluster && selectedCluster.devices.length > 1 &&
            selectedCluster.devices.map((d, i, arr) => {
              const r = 0.0015;
              const a = (i / arr.length) * Math.PI * 2;
              const lng = selectedCluster.coordinates[0] + Math.cos(a) * r;
              const lat = selectedCluster.coordinates[1] + Math.sin(a) * r;
              return (
                <Marker key={`spoke-${d.id}`} longitude={lng} latitude={lat} anchor="center">
                  <div
                    className="cv-dev-marker"
                    style={{
                      background: STATUS_COLOR[d.category]?.ring || '#6b7a8d',
                    }}
                    title={d.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeviceSelect?.(d);
                    }}
                  />
                </Marker>
              );
            })}
        </MapGL>

        {clusters.length === 0 && (
          <div className="cv-empty">
            <Activity size={36} style={{ opacity: 0.25 }} />
            <div className="cv-empty-title">No data</div>
            <div className="cv-empty-sub">
              {searchTerm ? 'No devices match your search' : 'No devices to display'}
            </div>
          </div>
        )}

        {selectedCluster && (
          <DetailPanel
            cluster={selectedCluster}
            onClose={() => setSelectedId(null)}
            onViewFull={() => onClusterSelect?.(selectedCluster.name, selectedCluster.devices)}
            onDeviceSelect={onDeviceSelect}
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
          background: rgba(8,18,30,0.85);
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

        /* Ring marker */
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
          position: relative;
          z-index: 2;
          border: 1.2px solid;
          border-radius: 50%;
          background: rgba(8, 18, 30, 0.95);
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
        .cv-ring.is-active .cv-ring-inner   { transform: scale(1.05); }
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

        /* Device dot (when a cluster is opened) */
        .cv-dev-marker {
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          cursor: pointer;
          transition: transform .15s;
        }
        .cv-dev-marker:hover { transform: scale(1.2); }

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

        /* Detail panel */
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
    </div>
  );
};

export default ClusterView;