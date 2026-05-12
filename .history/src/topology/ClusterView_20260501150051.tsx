'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Filter, MoreVertical, Search, Activity, Camera,
} from 'lucide-react';

/* ─── Types (UNCHANGED from the previous ClusterView contract) ─────────── */
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

interface ClusterViewProps {
  allLocations: Location[];
  selectedArea: string;
  onBack: () => void;
  onNodeSelect: (location: Location) => void;
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

/* ─── Seeded RNG (stable layout across renders) ────────────────────────── */
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* ─── Word-wrap label into ≤ 2 short lines (matches the reference) ─────── */
function wrapText(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = (cur + ' ' + w).trim();
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

/* ─── Cluster size from device_count ───────────────────────────────────── */
function sizeFor(loc: Location): number {
  const c = loc.device_count ?? 0;
  const min = 30, max = 54;
  return min + Math.min(1, c / 30) * (max - min);
}

/* ─── Force-directed layout ────────────────────────────────────────────── */
function forceLayout(
  nodes: Location[],
  width: number,
  height: number,
  iterations = 200
): Map<number, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const cx = width / 2, cy = height / 2;
  const pad = 90;
  const rng = makeRng(nodes.length * 31 + 7);

  type P = { id: number; x: number; y: number; vx: number; vy: number };

  // Initial: scattered ring around center
  const positions: P[] = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    const r = Math.min(width, height) * 0.22 * (0.7 + rng() * 0.6);
    return {
      id: n.id,
      x: cx + Math.cos(a) * r + (rng() - 0.5) * 70,
      y: cy + Math.sin(a) * r + (rng() - 0.5) * 70,
      vx: 0, vy: 0,
    };
  });

  const idx = new Map(positions.map(p => [p.id, p]));

  // Parent → child edges from data
  const edges: [number, number][] = [];
  for (const n of nodes) {
    if (n.parent_id !== null && idx.has(n.parent_id)) {
      edges.push([n.id, n.parent_id]);
    }
  }

  const repel = 14000;
  const linkK = 0.045;
  const linkLen = 170;
  const centerK = 0.005;
  const damping = 0.85;

  for (let it = 0; it < iterations; it++) {
    // O(N²) repulsion
    for (const a of positions) {
      let fx = 0, fy = 0;
      for (const b of positions) {
        if (a.id === b.id) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = Math.max(60, dx * dx + dy * dy);
        const d = Math.sqrt(d2);
        const f = repel / d2;
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }
      // Center pull
      fx += (cx - a.x) * centerK;
      fy += (cy - a.y) * centerK;
      a.vx = (a.vx + fx) * damping;
      a.vy = (a.vy + fy) * damping;
    }
    // Spring attraction along parent edges
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
    // Integrate + clamp
    for (const a of positions) {
      a.x += a.vx;
      a.y += a.vy;
      a.x = Math.max(pad, Math.min(width - pad, a.x));
      a.y = Math.max(pad + 20, Math.min(height - pad, a.y));
    }
  }

  return new Map(positions.map(p => [p.id, { x: p.x, y: p.y }]));
}

/* ─── Generate halo dots around a cluster (the orange ones) ───────────── */
function dotsAround(
  cx: number, cy: number,
  count: number, ringR: number,
  rng: () => number
): { x: number; y: number; on: boolean }[] {
  const n = Math.min(Math.max(0, count), 6);
  const out: { x: number; y: number; on: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + rng() * 0.7;
    const r = ringR * (1.45 + rng() * 0.65);
    out.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      on: rng() > 0.35,
    });
  }
  return out;
}

/* ─── A single cluster node (sonar rings + count + label) ──────────────── */
const ClusterNode: React.FC<{
  location: Location;
  x: number;
  y: number;
  size: number;
  onClick: () => void;
  onHover: (h: boolean) => void;
  index: number;
}> = ({ location, x, y, size, onClick, onHover, index }) => {
  const palette = getPalette(location.status);
  const count = location.device_count ?? 0;
  const wrapped = wrapText(location.name, 18);

  // Static decorative rings
  const rings = [
    { r: size * 0.55, op: 0.55 },
    { r: size * 0.78, op: 0.32 },
    { r: size * 1.05, op: 0.18 },
  ];

  // Stagger SMIL animation per cluster
  const begin = `${(index * 0.18) % 3}s`;

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="cv-cluster"
    >
      {/* Animated outermost pulse ring (SMIL — universal browser support) */}
      <circle
        cx={0} cy={0}
        r={size * 0.55}
        fill="none"
        stroke={palette.ring}
        strokeWidth={1}
        opacity={0}
      >
        <animate
          attributeName="r"
          values={`${size * 0.55};${size * 1.5}`}
          dur="3.2s"
          begin={begin}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.55;0"
          dur="3.2s"
          begin={begin}
          repeatCount="indefinite"
        />
      </circle>

      {/* Static decorative rings */}
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={0} cy={0}
          r={ring.r}
          fill="none"
          stroke={palette.ring}
          strokeWidth={1}
          opacity={ring.op}
        />
      ))}

      {/* Soft inner glow */}
      <circle cx={0} cy={0} r={size * 0.40} fill={palette.ring} opacity={0.10} />

      {/* Inner solid disk */}
      <circle
        cx={0} cy={0}
        r={size * 0.34}
        fill="rgba(8, 18, 30, 0.92)"
        stroke={palette.ring}
        strokeWidth={1.3}
      />

      {/* Center number — zero-padded to 2 digits to match the reference */}
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={palette.text}
        fontSize={size * 0.34}
        fontWeight={300}
        fontFamily="'JetBrains Mono','Fira Code',monospace"
        style={{ pointerEvents: 'none', letterSpacing: '0.5px' }}
      >
        {String(count).padStart(2, '0')}
      </text>

      {/* Multi-line label below the rings */}
      <g transform={`translate(0, ${size * 1.35 + 12})`}>
        {wrapped.map((line, i) => (
          <text
            key={i}
            x={0}
            y={i * 13}
            textAnchor="middle"
            fill="#cdd9e8"
            fontSize={11}
            fontWeight={500}
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

/* ─── Main component ───────────────────────────────────────────────────── */
const ClusterView: React.FC<ClusterViewProps> = ({
  allLocations,
  selectedArea,
  onBack,
  onNodeSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Track canvas size
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

  // Filter
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

  // Stats (computed over the full area, ignoring search/filter)
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
      totalDevices: a.reduce((s, l) => s + (l.device_count ?? 0), 0),
    };
  }, [allLocations, selectedArea]);

  // Layout (run once per filter change)
  const SVG_W = dims.w;
  const SVG_H = Math.max(420, dims.h - 110);
  const positions = useMemo(
    () => forceLayout(filtered, SVG_W, SVG_H),
    [filtered, SVG_W, SVG_H]
  );

  // Cluster-to-cluster edges (parent links)
  const edges = useMemo(() => {
    const list: { from: { x: number; y: number }; to: { x: number; y: number }; status: string }[] = [];
    for (const n of filtered) {
      if (n.parent_id !== null) {
        const a = positions.get(n.id);
        const b = positions.get(n.parent_id);
        if (a && b) list.push({ from: a, to: b, status: n.status });
      }
    }
    return list;
  }, [filtered, positions]);

  // Halo dots
  const dotData = useMemo(() => {
    const rng = makeRng(filtered.length * 13 + 11);
    const out: { x: number; y: number; cx: number; cy: number; on: boolean }[] = [];
    for (const loc of filtered) {
      const p = positions.get(loc.id);
      if (!p) continue;
      const sz = sizeFor(loc);
      const dots = dotsAround(p.x, p.y, loc.device_count ?? 0, sz, rng);
      for (const d of dots) out.push({ x: d.x, y: d.y, cx: p.x, cy: p.y, on: d.on });
    }
    return out;
  }, [filtered, positions]);

  const hovered = hoveredId !== null ? filtered.find((l) => l.id === hoveredId) : null;
  const hoveredPos = hovered ? positions.get(hovered.id) : null;

  return (
    <div className="cv-root" ref={containerRef}>
      {/* ── Header ── */}
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

      {/* ── Filter chips ── */}
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

      {/* ── Canvas ── */}
      <div className="cv-canvas-wrap">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <defs>
            <radialGradient id="cv-bg" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#13243b" />
              <stop offset="60%" stopColor="#0a1626" />
              <stop offset="100%" stopColor="#060d18" />
            </radialGradient>
            <pattern id="cv-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.025)" />
            </pattern>
          </defs>

          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#cv-bg)" />
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#cv-grid)" />

          {/* Cluster-to-cluster edges */}
          {edges.map((e, i) => (
            <line
              key={`e-${i}`}
              x1={e.from.x} y1={e.from.y}
              x2={e.to.x}   y2={e.to.y}
              stroke={getPalette(e.status).ring}
              strokeWidth={1}
              opacity={0.22}
            />
          ))}

          {/* Dot → cluster spokes */}
          {dotData.map((d, i) => (
            <line
              key={`dl-${i}`}
              x1={d.x} y1={d.y}
              x2={d.cx} y2={d.cy}
              stroke="#3ea7ff"
              strokeWidth={0.7}
              opacity={0.16}
            />
          ))}

          {/* Halo dots */}
          {dotData.map((d, i) => (
            <circle
              key={`d-${i}`}
              cx={d.x} cy={d.y}
              r={3.2}
              fill={d.on ? '#f5a623' : '#6b7a8d'}
              opacity={d.on ? 0.95 : 0.45}
            />
          ))}

          {/* Cluster nodes */}
          {filtered.map((loc, i) => {
            const p = positions.get(loc.id);
            if (!p) return null;
            return (
              <ClusterNode
                key={loc.id}
                location={loc}
                x={p.x}
                y={p.y}
                size={sizeFor(loc)}
                onClick={() => onNodeSelect(loc)}
                onHover={(h) => setHoveredId(h ? loc.id : null)}
                index={i}
              />
            );
          })}
        </svg>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="cv-empty">
            <Activity size={36} style={{ opacity: 0.25 }} />
            <div className="cv-empty-title">No nodes match</div>
            <div className="cv-empty-sub">
              {searchTerm ? 'Try a different search term' : 'Adjust the filter to see nodes'}
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {hovered && hoveredPos && (
          <div
            className="cv-tooltip"
            style={{
              left: `${(hoveredPos.x / SVG_W) * 100}%`,
              top: `${(hoveredPos.y / SVG_H) * 100}%`,
            }}
          >
            <div className="cv-tt-name">{hovered.name}</div>
            <div className="cv-tt-row">
              <span
                className="cv-tt-badge"
                style={{
                  color: getPalette(hovered.status).ring,
                  borderColor: getPalette(hovered.status).ring,
                }}
              >
                {getPalette(hovered.status).label}
              </span>
              {hovered.project && <span className="cv-tt-meta">{hovered.project}</span>}
            </div>
            <div className="cv-tt-stats">
              <span>
                <b style={{ color: '#22d3a5' }}>{hovered.online_device_count ?? 0}</b> up
              </span>
              <span>
                <b style={{ color: '#f25c5c' }}>{hovered.offline_device_count ?? 0}</b> down
              </span>
              <span>
                <b style={{ color: '#9cc8ff' }}>{hovered.device_count ?? 0}</b> total
              </span>
              {hovered.health_percentage !== undefined && (
                <span>
                  <b
                    style={{
                      color:
                        hovered.health_percentage >= 80
                          ? '#22d3a5'
                          : hovered.health_percentage >= 50
                          ? '#f5a623'
                          : '#f25c5c',
                    }}
                  >
                    {hovered.health_percentage}%
                  </b>{' '}
                  health
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bottom-left camera icon (matches the reference) */}
        <div className="cv-camera">
          <Camera size={18} />
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .cv-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #060d18;
          color: #c8d6e5;
          font-family: 'JetBrains Mono','Fira Code',ui-monospace,monospace;
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
          background: rgba(8,18,30,0.65);
          backdrop-filter: blur(6px);
          flex-shrink: 0;
          z-index: 5;
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

        .cv-area-tag {
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #4a5568;
          margin-bottom: 1px;
        }
        .cv-area-name {
          font-size: 16px;
          font-weight: 600;
          color: #f0f6ff;
          letter-spacing: 0.3px;
        }

        .cv-malicious-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(90deg, #ff3a6e, #d6244e);
          color: #fff;
          padding: 4px 11px;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
          box-shadow: 0 0 14px rgba(255,58,110,0.35);
        }
        .cv-malicious-dot {
          width: 5px; height: 5px;
          background: #fff; border-radius: 50%;
          animation: cvBlink 1.5s ease-in-out infinite;
        }

        .cv-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

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

        /* Chip row */
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

        /* Canvas */
        .cv-canvas-wrap { flex: 1; position: relative; overflow: hidden; }

        .cv-cluster:hover circle:nth-of-type(2),
        .cv-cluster:hover circle:nth-of-type(3),
        .cv-cluster:hover circle:nth-of-type(4) {
          opacity: 0.7;
        }
        .cv-cluster text { user-select: none; }

        @keyframes cvBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        /* Empty state */
        .cv-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #4a5568;
          text-align: center;
          pointer-events: none;
        }
        .cv-empty-title { font-size: 14px; color: #6b7a8d; }
        .cv-empty-sub   { font-size: 11px; color: #4a5568; }

        /* Tooltip */
        .cv-tooltip {
          position: absolute;
          transform: translate(-50%, calc(-100% - 18px));
          background: rgba(10, 22, 38, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 10px 12px;
          min-width: 200px;
          pointer-events: none;
          font-family: 'Inter', system-ui, sans-serif;
          box-shadow: 0 6px 24px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .cv-tt-name {
          font-size: 13px; font-weight: 600;
          color: #f0f6ff;
          margin-bottom: 6px;
        }
        .cv-tt-row {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 8px;
        }
        .cv-tt-badge {
          display: inline-block;
          padding: 2px 7px;
          border: 1px solid;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
          font-family: 'JetBrains Mono', monospace;
        }
        .cv-tt-meta {
          font-size: 10px;
          color: #6b7a8d;
        }
        .cv-tt-stats {
          display: flex; flex-wrap: wrap; gap: 10px;
          font-size: 11px;
          color: #8892a4;
        }
        .cv-tt-stats b { font-weight: 700; margin-right: 2px; }

        /* Camera icon (matches the reference's bottom-left affordance) */
        .cv-camera {
          position: absolute;
          left: 18px;
          bottom: 18px;
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

        /* Responsive */
        @media (max-width: 768px) {
          .cv-search input { width: 130px; }
          .cv-stat { padding: 0 7px; }
          .cv-stat-val { font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;
