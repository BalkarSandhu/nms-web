'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft, Activity, Zap, AlertTriangle, CheckCircle2,
  Wifi, WifiOff, AlertCircle as AlertIcon, Search,
  Server, Cpu, Signal, Radio,
} from 'lucide-react';

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

/* ─── Status Configuration ──────────────────────────────── */
const STATUS_CONFIG = {
  online: {
    color: '#22d3a5',
    dimColor: '#0d9e77',
    borderColor: '#0d9e77',
    bgColor: 'rgba(34, 211, 165, 0.06)',
    ringColor: 'rgba(34, 211, 165, 0.18)',
    label: 'ONLINE',
    icon: CheckCircle2,
    pulseColor: 'rgba(34, 211, 165, 0.5)',
    textColor: '#22d3a5',
    badgeBg: 'rgba(34, 211, 165, 0.1)',
  },
  offline: {
    color: '#f25c5c',
    dimColor: '#b83a3a',
    borderColor: '#b83a3a',
    bgColor: 'rgba(242, 92, 92, 0.06)',
    ringColor: 'rgba(242, 92, 92, 0.15)',
    label: 'OFFLINE',
    icon: WifiOff,
    pulseColor: 'rgba(242, 92, 92, 0.4)',
    textColor: '#f25c5c',
    badgeBg: 'rgba(242, 92, 92, 0.1)',
  },
  partial: {
    color: '#f5a623',
    dimColor: '#c07d0d',
    borderColor: '#c07d0d',
    bgColor: 'rgba(245, 166, 35, 0.06)',
    ringColor: 'rgba(245, 166, 35, 0.15)',
    label: 'DEGRADED',
    icon: AlertTriangle,
    pulseColor: 'rgba(245, 166, 35, 0.4)',
    textColor: '#f5a623',
    badgeBg: 'rgba(245, 166, 35, 0.1)',
  },
  unknown: {
    color: '#6b7a8d',
    dimColor: '#4a5568',
    borderColor: '#4a5568',
    bgColor: 'rgba(107, 122, 141, 0.06)',
    ringColor: 'rgba(107, 122, 141, 0.12)',
    label: 'UNKNOWN',
    icon: AlertIcon,
    pulseColor: 'rgba(107, 122, 141, 0.3)',
    textColor: '#6b7a8d',
    badgeBg: 'rgba(107, 122, 141, 0.1)',
  },
};

const getStatus = (status: string) =>
  STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;

/* ─── Signal Ring SVG ────────────────────────────────────── */
const SignalRings: React.FC<{ color: string; health: number; size?: number }> = ({
  color, health, size = 44,
}) => {
  const rings = [
    { r: size * 0.36, opacity: health >= 25 ? 0.9 : 0.15 },
    { r: size * 0.52, opacity: health >= 50 ? 0.7 : 0.12 },
    { r: size * 0.68, opacity: health >= 75 ? 0.5 : 0.09 },
    { r: size * 0.84, opacity: health >= 90 ? 0.3 : 0.06 },
  ];
  return (
    <svg width={size * 2} height={size * 2} viewBox={`0 0 ${size * 2} ${size * 2}`} style={{ position: 'absolute', top: 0, left: 0 }}>
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={size}
          cy={size}
          r={ring.r}
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity={ring.opacity}
          strokeDasharray={i === rings.length - 1 ? '4 3' : undefined}
        />
      ))}
    </svg>
  );
};

/* ─── Sparkline Mini Chart ───────────────────────────────── */
const Sparkline: React.FC<{ health: number; color: string }> = ({ health, color }) => {
  // Generate a fake-but-realistic sparkline from health %
  const points = Array.from({ length: 12 }, (_, i) => {
    const base = health + (Math.sin(i * 1.3 + health * 0.1) * 12);
    return Math.max(5, Math.min(95, base));
  });
  const w = 80, h = 22;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(p => h - (p / 100) * h);
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${health}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${health})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── NMS Status Tile ────────────────────────────────────── */
const StatusTile: React.FC<{
  location: Location;
  onClick: (location: Location) => void;
  index: number;
}> = ({ location, onClick, index }) => {
  const [hovered, setHovered] = useState(false);
  const status = getStatus(location.status);
  const StatusIcon = status.icon;
  const health = location.health_percentage ?? 0;
  const animDelay = `${index * 0.04}s`;

  const healthColor =
    health >= 80 ? '#22d3a5' : health >= 50 ? '#f5a623' : '#f25c5c';

  return (
    <div
      className="nms-tile"
      onClick={() => onClick(location)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: animDelay }}
    >
      {/* Top edge accent line */}
      <div className="tile-accent" style={{ background: status.color }} />

      {/* Status light + header */}
      <div className="tile-header">
        <div className="tile-id-col">
          {/* Signal rings with icon center */}
          <div className="tile-signal-wrap" style={{ width: 52, height: 52, position: 'relative', flexShrink: 0 }}>
            <SignalRings color={status.color} health={health} size={26} />
            <div className="tile-icon-center" style={{ borderColor: status.borderColor, background: status.bgColor }}>
              <StatusIcon size={14} style={{ color: status.color }} />
            </div>
          </div>
        </div>

        <div className="tile-meta">
          <div className="tile-name">{location.name}</div>
          <div className="tile-status-row">
            <span className="tile-badge" style={{ color: status.color, background: status.badgeBg, borderColor: status.borderColor }}>
              <span className="tile-dot" style={{ background: status.color }} />
              {status.label}
            </span>
          </div>
        </div>

        {location.device_count !== undefined && (
          <div className="tile-device-count">
            <Server size={10} style={{ color: '#8892a4' }} />
            <span>{location.device_count}</span>
          </div>
        )}
      </div>

      {/* Health bar + sparkline */}
      <div className="tile-body">
        {location.health_percentage !== undefined && (
          <div className="tile-health-section">
            <div className="tile-health-row">
              <span className="tile-health-label">Health</span>
              <span className="tile-health-value" style={{ color: healthColor }}>{health}%</span>
            </div>
            <div className="tile-bar-track">
              <div
                className="tile-bar-fill"
                style={{ width: `${health}%`, background: `linear-gradient(90deg, ${healthColor}99, ${healthColor})` }}
              />
            </div>
          </div>
        )}

        {/* Mini sparkline */}
        {location.health_percentage !== undefined && (
          <div className="tile-sparkline">
            <Sparkline health={health} color={healthColor} />
          </div>
        )}
      </div>

      {/* Device stats footer */}
      {location.online_device_count !== undefined && (
        <div className="tile-footer">
          <div className="tile-stat">
            <Wifi size={10} style={{ color: '#22d3a5' }} />
            <span style={{ color: '#22d3a5' }}>{location.online_device_count}</span>
            <span className="tile-stat-label">up</span>
          </div>
          <div className="tile-footer-div" />
          <div className="tile-stat">
            <WifiOff size={10} style={{ color: '#f25c5c' }} />
            <span style={{ color: '#f25c5c' }}>{location.offline_device_count ?? 0}</span>
            <span className="tile-stat-label">down</span>
          </div>
          {location.device_count !== undefined && location.online_device_count !== undefined && (
            <>
              <div className="tile-footer-div" />
              <div className="tile-stat">
                <Radio size={10} style={{ color: '#8892a4' }} />
                <span style={{ color: '#8892a4' }}>
                  {Math.round((location.online_device_count / Math.max(location.device_count, 1)) * 100)}%
                </span>
                <span className="tile-stat-label">avail</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hover overlay */}
      {hovered && (
        <div className="tile-hover-overlay">
          <div className="tile-hover-inner">
            <div className="tile-hover-name">{location.name}</div>
            {location.description && (
              <div className="tile-hover-desc">{location.description}</div>
            )}
            <div className="tile-hover-cta">
              <Signal size={12} /> View node details
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Cluster View ──────────────────────────────────── */
const ClusterView: React.FC<ClusterViewProps> = ({
  allLocations,
  selectedArea,
  onBack,
  onNodeSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>('all');

  const filteredLocations = useMemo(() => {
    return allLocations.filter(
      (loc) =>
        loc.area === selectedArea &&
        (filterStatus === 'all' || loc.status === filterStatus) &&
        (searchTerm === '' || loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allLocations, selectedArea, filterStatus, searchTerm]);

  const stats = useMemo(() => {
    const areaLocations = allLocations.filter((loc) => loc.area === selectedArea);
    return {
      total: areaLocations.length,
      online: areaLocations.filter((l) => l.status === 'online').length,
      offline: areaLocations.filter((l) => l.status === 'offline').length,
      partial: areaLocations.filter((l) => l.status === 'partial').length,
      avgHealth: Math.round(
        areaLocations.reduce((sum, l) => sum + (l.health_percentage ?? 0), 0) /
          Math.max(areaLocations.length, 1)
      ),
      totalDevices: areaLocations.reduce((sum, l) => sum + (l.device_count ?? 0), 0),
    };
  }, [allLocations, selectedArea]);

  const handleNodeSelect = useCallback(
    (location: Location) => onNodeSelect(location),
    [onNodeSelect]
  );

  const healthColor = stats.avgHealth >= 80 ? '#22d3a5' : stats.avgHealth >= 50 ? '#f5a623' : '#f25c5c';

  return (
    <div className="nms-root">
      {/* ── Header ── */}
      <header className="nms-header">
        <div className="nms-header-row">
          <button className="nms-back" onClick={onBack} title="Back">
            <ArrowLeft size={18} />
          </button>

          <div className="nms-title-block">
            <div className="nms-area-label">AREA</div>
            <div className="nms-area-name">{selectedArea}</div>
          </div>

          {/* Stat pills */}
          <div className="nms-stat-pills">
            {[
              { label: 'TOTAL', value: stats.total, color: '#8892a4', icon: Activity },
              { label: 'ONLINE', value: stats.online, color: '#22d3a5', icon: Wifi },
              { label: 'OFFLINE', value: stats.offline, color: '#f25c5c', icon: WifiOff },
              { label: 'DEGRADED', value: stats.partial, color: '#f5a623', icon: AlertTriangle },
              { label: 'DEVICES', value: stats.totalDevices, color: '#6b7a8d', icon: Server },
            ].map(({ label, value, color, icon: Icon }) => (
              <div className="nms-pill" key={label}>
                <Icon size={13} style={{ color }} />
                <span className="nms-pill-value" style={{ color }}>{value}</span>
                <span className="nms-pill-label">{label}</span>
              </div>
            ))}

            {/* Avg health ring */}
            <div className="nms-health-pill">
              <svg width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke={healthColor}
                  strokeWidth="3"
                  strokeDasharray={`${(stats.avgHealth / 100) * 88} 88`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
                <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="600" fill={healthColor}>{stats.avgHealth}%</text>
              </svg>
              <span className="nms-pill-label">AVG HEALTH</span>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="nms-filters-row">
          <div className="nms-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search nodes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="nms-filter-tabs">
            {(['all', 'online', 'offline', 'partial'] as const).map((s) => {
              const cfg = s === 'all'
                ? { color: '#8892a4', label: 'ALL' }
                : getStatus(s);
              return (
                <button
                  key={s}
                  className={`nms-filter-tab ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    color: filterStatus === s ? cfg.color : '#4a5568',
                    borderBottomColor: filterStatus === s ? cfg.color : 'transparent',
                  }}
                >
                  {s === 'all' ? 'ALL' : cfg.label}
                </button>
              );
            })}
          </div>

          <div className="nms-result-count">
            {filteredLocations.length} node{filteredLocations.length !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* ── Grid ── */}
      <main className="nms-main">
        {filteredLocations.length === 0 ? (
          <div className="nms-empty">
            <Cpu size={40} style={{ opacity: 0.2 }} />
            <div className="nms-empty-title">No nodes found</div>
            <div className="nms-empty-sub">
              {searchTerm ? 'Adjust your search or filter' : 'No nodes match the selected filter'}
            </div>
          </div>
        ) : (
          <div className="nms-grid">
            {filteredLocations.map((loc, i) => (
              <StatusTile key={loc.id} location={loc} onClick={handleNodeSelect} index={i} />
            ))}
          </div>
        )}
      </main>

      {/* ─── Styles ─────────────────────────────────────────── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nms-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #080d14;
          color: #c5cdd8;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
          overflow: hidden;
        }

        /* ── Header ── */
        .nms-header {
          background: #0c1320;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 14px 20px 0;
          flex-shrink: 0;
        }

        .nms-header-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .nms-back {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
          color: #8892a4;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .nms-back:hover { background: rgba(255,255,255,0.08); color: #c5cdd8; }

        .nms-title-block { flex-shrink: 0; }
        .nms-area-label {
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #4a5568;
          margin-bottom: 2px;
        }
        .nms-area-name {
          font-size: 16px;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: 0.5px;
        }

        .nms-stat-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          flex-wrap: wrap;
        }

        .nms-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 5px;
          white-space: nowrap;
        }
        .nms-pill-value {
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
        }
        .nms-pill-label {
          font-size: 9px;
          color: #4a5568;
          letter-spacing: 0.8px;
        }

        .nms-health-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 5px;
        }

        /* ── Filters ── */
        .nms-filters-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nms-search {
          position: relative;
          display: flex;
          align-items: center;
        }
        .nms-search svg {
          position: absolute;
          left: 10px;
          color: #4a5568;
          pointer-events: none;
        }
        .nms-search input {
          padding: 7px 12px 7px 32px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 5px;
          color: #c5cdd8;
          font-family: inherit;
          font-size: 12px;
          width: 220px;
          transition: border-color 0.2s;
        }
        .nms-search input:focus { outline: none; border-color: rgba(255,255,255,0.15); }
        .nms-search input::placeholder { color: #3a4556; }

        .nms-filter-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nms-filter-tab {
          padding: 8px 14px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
          margin-bottom: -1px;
        }

        .nms-result-count {
          margin-left: auto;
          font-size: 11px;
          color: #3a4556;
          letter-spacing: 0.5px;
          padding-bottom: 8px;
          white-space: nowrap;
        }

        /* ── Main grid ── */
        .nms-main {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .nms-main::-webkit-scrollbar { width: 6px; }
        .nms-main::-webkit-scrollbar-track { background: transparent; }
        .nms-main::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

        .nms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ── Tile ── */
        .nms-tile {
          position: relative;
          background: #0c1320;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 14px 14px 10px;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.25s, background 0.25s, transform 0.2s;
          animation: tileIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .nms-tile:hover {
          border-color: rgba(255,255,255,0.16);
          background: #111d2e;
          transform: translateY(-2px);
        }

        @keyframes tileIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .tile-accent {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          border-radius: 8px 8px 0 0;
          opacity: 0.8;
        }

        /* ── Tile header ── */
        .tile-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }

        .tile-id-col { flex-shrink: 0; }

        .tile-signal-wrap { position: relative; }
        .tile-icon-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tile-meta { flex: 1; min-width: 0; padding-top: 4px; }

        .tile-name {
          font-size: 12px;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: 0.3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 5px;
        }

        .tile-status-row { display: flex; align-items: center; gap: 6px; }

        .tile-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 3px;
          border: 1px solid;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
        }
        .tile-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .tile-device-count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #8892a4;
          padding-top: 6px;
          flex-shrink: 0;
        }

        /* ── Tile body ── */
        .tile-body {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          margin-bottom: 10px;
        }

        .tile-health-section { flex: 1; }
        .tile-health-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .tile-health-label { font-size: 9px; color: #4a5568; letter-spacing: 0.8px; }
        .tile-health-value { font-size: 11px; font-weight: 700; }

        .tile-bar-track {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
        }
        .tile-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .tile-sparkline { flex-shrink: 0; }

        /* ── Tile footer ── */
        .tile-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .tile-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .tile-stat-label { font-size: 9px; color: #3a4556; margin-left: 1px; }
        .tile-footer-div { width: 1px; height: 12px; background: rgba(255,255,255,0.07); }

        /* ── Hover overlay ── */
        .tile-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(8, 13, 20, 0.92);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.18s ease;
          border-radius: 8px;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .tile-hover-inner { text-align: center; padding: 0 16px; }
        .tile-hover-name {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 6px;
        }
        .tile-hover-desc {
          font-size: 11px;
          color: #8892a4;
          line-height: 1.5;
          margin-bottom: 10px;
        }
        .tile-hover-cta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          color: #22d3a5;
          letter-spacing: 0.5px;
        }

        /* ── Empty ── */
        .nms-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #4a5568;
          text-align: center;
          padding: 80px 20px;
        }
        .nms-empty-title { font-size: 15px; color: #6b7a8d; margin-top: 4px; }
        .nms-empty-sub { font-size: 12px; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .nms-header { padding: 12px 14px 0; }
          .nms-stat-pills { gap: 4px; }
          .nms-pill { padding: 4px 8px; }
          .nms-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
          .nms-main { padding: 14px; }
          .nms-search input { width: 160px; }
        }

        @media (max-width: 480px) {
          .nms-header-row { flex-wrap: wrap; }
          .nms-stat-pills { width: 100%; }
          .nms-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;