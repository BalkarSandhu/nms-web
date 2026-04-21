'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Activity, Zap, AlertTriangle, CheckCircle2,
  Wifi, WifiOff, AlertCircle as AlertIcon, Shield, ChevronDown, Search,
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
    color: '#10b981',
    borderColor: '#059669',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    label: 'ONLINE',
    icon: CheckCircle2,
  },
  offline: {
    color: '#ef4444',
    borderColor: '#dc2626',
    bgColor: 'rgba(239, 68, 68, 0.08)',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    label: 'OFFLINE',
    icon: WifiOff,
  },
  partial: {
    color: '#f59e0b',
    borderColor: '#d97706',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    label: 'PARTIAL',
    icon: AlertTriangle,
  },
  unknown: {
    color: '#6b7280',
    borderColor: '#4b5563',
    bgColor: 'rgba(107, 114, 128, 0.08)',
    glowColor: 'rgba(107, 114, 128, 0.4)',
    label: 'UNKNOWN',
    icon: AlertIcon,
  },
};

const getStatus = (status: string) =>
  STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;

/* ─── Hexagon SVG Generator ─────────────────────────────── */
const generateHexagonPath = (size: number = 60): string => {
  const angle = Math.PI / 3;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const x = size * Math.cos(i * angle);
    const y = size * Math.sin(i * angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
};

/* ─── Hexagon Cluster Item ──────────────────────────────── */
const HexagonItem: React.FC<{
  location: Location;
  onClick: (location: Location) => void;
  index: number;
}> = ({ location, onClick, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = getStatus(location.status);
  const StatusIcon = status.icon;
  const health = location.health_percentage ?? 0;
  const healthColor =
    health >= 80 ? '#10b981' : health >= 50 ? '#f59e0b' : '#ef4444';

  const animationDelay = index * 0.05;

  return (
    <div
      className="hexagon-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(location)}
      style={{
        animation: `scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        animationDelay: `${animationDelay}s`,
        opacity: 0,
      }}
    >
      {/* Hexagon Background */}
      <svg
        width="140"
        height="140"
        viewBox="-80 -80 160 160"
        className="hexagon-bg"
        style={{
          filter: isHovered ? `drop-shadow(0 0 20px ${status.glowColor})` : 'none',
          transition: 'filter 0.3s ease',
        }}
      >
        <defs>
          <linearGradient
            id={`grad-${location.id}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={status.color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={status.color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Outer glow polygon */}
        <polygon
          points={generateHexagonPath(75)}
          fill={`url(#grad-${location.id})`}
          stroke={status.borderColor}
          strokeWidth="1.5"
          opacity={isHovered ? 1 : 0.6}
          style={{ transition: 'opacity 0.3s ease' }}
        />

        {/* Inner border */}
        <polygon
          points={generateHexagonPath(70)}
          fill="none"
          stroke={status.color}
          strokeWidth="0.5"
          opacity="0.5"
        />

        {/* Status indicator dot */}
        <circle
          cx="55"
          cy="-45"
          r="8"
          fill={status.color}
          style={{
            filter: `drop-shadow(0 0 8px ${status.glowColor})`,
            animation: `pulse 2s ease-in-out infinite`,
          }}
        />
      </svg>

      {/* Content Container */}
      <div className="hexagon-content">
        {/* Status Icon */}
        <div className="content-icon">
          <StatusIcon
            size={24}
            style={{
              color: status.color,
              opacity: isHovered ? 1 : 0.8,
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>

        {/* Location Name */}
        <h3 className="location-name">{location.name}</h3>

        {/* Device Count */}
        {location.device_count !== undefined && (
          <div className="device-count">
            <Zap size={12} style={{ color: status.color, opacity: 0.7 }} />
            <span>{location.device_count}</span>
          </div>
        )}

        {/* Health Bar */}
        {location.health_percentage !== undefined && (
          <div className="health-bar">
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${health}%`,
                  backgroundColor: healthColor,
                  boxShadow: `0 0 8px ${healthColor}`,
                }}
              />
            </div>
            <span className="health-text">{health}%</span>
          </div>
        )}

        {/* Device Stats */}
        {location.online_device_count !== undefined && (
          <div className="device-stats">
            <div className="stat-item online">
              <Wifi size={10} />
              <span>{location.online_device_count}</span>
            </div>
            <div className="stat-item offline">
              <WifiOff size={10} />
              <span>{location.offline_device_count ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      {isHovered && (
        <div className="hexagon-hover-overlay">
          <div className="hover-content">
            <div className="hover-title">{location.name}</div>
            <div className="hover-status">
              <span
                className="status-badge"
                style={{
                  backgroundColor: status.bgColor,
                  color: status.color,
                  borderColor: status.color,
                }}
              >
                {status.label}
              </span>
            </div>
            {location.description && (
              <div className="hover-description">{location.description}</div>
            )}
            <div className="hover-action">Click to view details</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Cluster View Component ────────────────────────── */
const ClusterView: React.FC<ClusterViewProps> = ({
  allLocations,
  selectedArea,
  onBack,
  onNodeSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>(
    'all'
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ─── Filter Locations ──────────────────────────────── */
  const filteredLocations = useMemo(() => {
    return allLocations.filter(
      (loc) =>
        loc.area === selectedArea &&
        (filterStatus === 'all' || loc.status === filterStatus) &&
        (searchTerm === '' || loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allLocations, selectedArea, filterStatus, searchTerm]);

  /* ─── Calculate Statistics ──────────────────────────── */
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
    (location: Location) => {
      onNodeSelect(location);
    },
    [onNodeSelect]
  );

  return (
    <div className="cluster-view-container">
      {/* Header */}
      <header className="cluster-header">
        <div className="header-top">
          <button className="back-button" onClick={onBack} title="Back to areas">
            <ArrowLeft size={20} />
          </button>

          <div className="header-title">
            <MapPin size={24} />
            <div>
              
              <p>{selectedArea}</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className='status-filters'>
            {[
              {
                label: 'TOTAL',
                value: stats.total,
                color: '#64748b',
                icon: Activity,
              },
              {
                label: 'ONLINE',
                value: stats.online,
                color: '#10b981',
                icon: Wifi,
              },
              {
                label: 'OFFLINE',
                value: stats.offline,
                color: '#ef4444',
                icon: WifiOff,
              },
              {
                label: 'PARTIAL',
                value: stats.partial,
                color: '#f59e0b',
                icon: AlertTriangle,
              },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div className="stat-icon" style={{ color }}>
                  <Icon size={18} />
                </div>
                <div className="stat-info">
                  <div className="stat-value" style={{ color }}>
                    {value}
                  </div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="header-filters">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="status-filters">
            {(['all', 'online', 'offline', 'partial'] as const).map((status) => {
              const config = status === 'all' ? { color: '#64748b', label: 'ALL' } : getStatus(status);
              const isActive = filterStatus === status;

              return (
                <button
                  key={status}
                  className={`filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    borderColor: isActive ? config.color : '#e2e8f0',
                    color: isActive ? config.color : '#94a3b8',
                    backgroundColor: isActive ? `${config.color}08` : 'transparent',
                  }}
                >
                  {status === 'all' ? 'ALL' : config.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="cluster-content">
        {filteredLocations.length === 0 ? (
          <div className="empty-state">
            <AlertIcon size={48} />
            <h2>No locations found</h2>
            <p>
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No locations match the selected filters'}
            </p>
          </div>
        ) : (
          <div className="hexagon-grid" ref={scrollContainerRef}>
            {filteredLocations.map((location, index) => (
              <HexagonItem
                key={location.id}
                location={location}
                onClick={handleNodeSelect}
                index={index}
              />
            ))}
          </div>
        )}
      </main>

      {/* Styles */}
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .cluster-view-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #0f172a 0%, #1a1f35 100%);
          color: #e2e8f0;
          font-family: 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
          overflow: hidden;
        }

        /* Header Styles */
        .cluster-header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          padding: 16px 24px;
          flex-shrink: 0;
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .back-button {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(148, 163, 184, 0.05);
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .back-button:hover {
          background: rgba(148, 163, 184, 0.1);
          border-color: rgba(148, 163, 184, 0.3);
          color: #cbd5e1;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .header-title > svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .header-title h1 {
          font-size: 20px;
          font-weight: 600;
          line-height: 1;
        }

        .header-title p {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(148, 163, 184, 0.03);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(148, 163, 184, 0.06);
          border-color: rgba(148, 163, 184, 0.2);
        }

        .stat-icon {
          flex-shrink: 0;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Filters */
        .header-filters {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-box {
          flex: 1;
          position: relative;
          max-width: 300px;
        }

        .search-box svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          flex-shrink: 0;
        }

        .search-box input {
          width: 100%;
          padding: 8px 12px 8px 34px;
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 13px;
          transition: all 0.3s ease;
        }

        .search-box input:focus {
          outline: none;
          background: rgba(148, 163, 184, 0.08);
          border-color: rgba(148, 163, 184, 0.3);
        }

        .search-box input::placeholder {
          color: #64748b;
        }

        .status-filters {
          display: flex;
          gap: 8px;
        }

        .filter-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .filter-btn:hover {
          border-color: currentColor;
        }

        .filter-btn.active {
          border-color: currentColor;
        }

        /* Main Content */
        .cluster-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .hexagon-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          max-width: 1400px;
        }

        /* Hexagon Item */
        .hexagon-item {
          position: relative;
          width: 140px;
          height: 160px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }

        .hexagon-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .hexagon-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-align: center;
          width: 110px;
          cursor: pointer;
        }

        .content-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .location-name {
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
          line-height: 1.3;
          word-break: break-word;
          max-height: 36px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .device-count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #94a3b8;
        }

        .health-bar {
          width: 80%;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bar-track {
          flex: 1;
          height: 4px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 99px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease;
        }

        .health-text {
          font-size: 9px;
          color: #94a3b8;
          min-width: 28px;
          text-align: right;
        }

        .device-stats {
          display: flex;
          gap: 6px;
          font-size: 10px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
        }

        .stat-item.online {
          color: #10b981;
        }

        .stat-item.offline {
          color: #ef4444;
        }

        /* Hover Overlay */
        .hexagon-hover-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          border-radius: 50%;
          z-index: 10;
          opacity: 0;
          animation: fadeIn 0.3s ease forwards;
        }

        .hover-content {
          text-align: center;
        }

        .hover-title {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 6px;
        }

        .hover-status {
          margin-bottom: 8px;
        }

        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          border: 1px solid;
          letter-spacing: 0.5px;
        }

        .hover-description {
          font-size: 10px;
          color: #cbd5e1;
          margin-bottom: 8px;
          line-height: 1.4;
          max-width: 120px;
        }

        .hover-action {
          font-size: 10px;
          color: #94a3b8;
          font-style: italic;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #94a3b8;
          text-align: center;
        }

        .empty-state svg {
          opacity: 0.3;
        }

        .empty-state h2 {
          font-size: 16px;
          color: #cbd5e1;
          margin: 8px 0 0 0;
        }

        .empty-state p {
          font-size: 13px;
        }

        /* Animations */
        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            r: 8;
          }
          50% {
            opacity: 0.5;
            r: 10;
          }
        }

        /* Scrollbar Styling */
        .cluster-content::-webkit-scrollbar {
          width: 8px;
        }

        .cluster-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .cluster-content::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }

        .cluster-content::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .header-top {
            flex-wrap: wrap;
          }

          .hexagon-grid {
            gap: 16px;
          }
        }

        @media (max-width: 640px) {
          .cluster-header {
            padding: 12px 16px;
          }

          .header-top {
            gap: 12px;
            margin-bottom: 12px;
          }

          .header-title {
            min-width: 0;
          }

          .header-title h1 {
            font-size: 16px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .header-filters {
            flex-direction: column;
            gap: 8px;
          }

          .search-box {
            max-width: 100%;
          }

          .status-filters {
            flex-wrap: wrap;
          }

          .cluster-content {
            padding: 16px;
          }

          .hexagon-grid {
            gap: 12px;
          }

          .hexagon-item {
            width: 120px;
            height: 140px;
          }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;