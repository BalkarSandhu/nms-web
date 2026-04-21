'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft, MapPin, Activity, Zap, AlertTriangle, CheckCircle2,
  Wifi, WifiOff, AlertCircle as AlertIcon, Search, ChevronDown,
  ChevronUp, Filter, Eye, EyeOff, MoreVertical
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

interface CellTableViewProps {
  allLocations: Location[];
  selectedArea: string;
  onBack: () => void;
  onNodeSelect: (location: Location) => void;
}

/* ─── Status Configuration ──────────────────────────────── */
const STATUS_CONFIG = {
  online: {
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
    label: 'ONLINE',
    icon: CheckCircle2,
  },
  offline: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
    label: 'OFFLINE',
    icon: WifiOff,
  },
  partial: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#f59e0b',
    label: 'PARTIAL',
    icon: AlertTriangle,
  },
  unknown: {
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.12)',
    borderColor: '#6b7280',
    label: 'UNKNOWN',
    icon: AlertIcon,
  },
};

const getStatus = (status: string) =>
  STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;

/* ─── Table Row Component ──────────────────────────────── */
const TableRow: React.FC<{
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

  // Calculate online percentage
  const onlinePercent = location.device_count && location.device_count > 0
    ? Math.round(((location.online_device_count ?? 0) / location.device_count) * 100)
    : 0;

  return (
    <div
      className="table-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(location)}
      style={{
        animation: `slideIn 0.4s ease forwards`,
        animationDelay: `${index * 0.03}s`,
        opacity: 0,
      }}
    >
      {/* Status Indicator Column */}
      <div className="cell cell-status">
        <div
          className="status-indicator"
          style={{
            backgroundColor: status.bgColor,
            borderLeftColor: status.color,
          }}
        >
          <StatusIcon size={14} style={{ color: status.color }} />
          <span style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>

      {/* Location Name Column */}
      <div className="cell cell-name">
        <div className="name-wrapper">
          <MapPin size={14} style={{ color: '#64748b' }} />
          <span className="location-name-text">{location.name}</span>
        </div>
      </div>

      {/* Health Column */}
      <div className="cell cell-health">
        <div className="health-wrapper">
          <div className="health-bar-track">
            <div
              className="health-bar-fill"
              style={{
                width: `${health}%`,
                backgroundColor: healthColor,
                boxShadow: `0 0 6px ${healthColor}`,
              }}
            />
          </div>
          <span className="health-value" style={{ color: healthColor }}>
            {health}%
          </span>
        </div>
      </div>

      {/* Devices Column */}
      <div className="cell cell-devices">
        <div className="devices-stats">
          <div className="device-badge online">
            <Wifi size={10} />
            <span>{location.online_device_count ?? 0}</span>
          </div>
          <div className="device-badge offline">
            <WifiOff size={10} />
            <span>{location.offline_device_count ?? 0}</span>
          </div>
          <div className="device-badge total">
            <Zap size={10} />
            <span>{location.device_count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Online % Column */}
      <div className="cell cell-online-percent">
        <div className="online-percent-wrapper">
          <div
            className="online-percent-circle"
            style={{
              background: `conic-gradient(${status.color} 0deg ${onlinePercent * 3.6}deg, rgba(255,255,255,0.1) ${onlinePercent * 3.6}deg 360deg)`,
            }}
          >
            <span>{onlinePercent}%</span>
          </div>
        </div>
      </div>

      {/* Hover overlay for quick actions */}
      {isHovered && (
        <div className="row-hover-overlay">
          <button className="view-details-btn">View Details</button>
        </div>
      )}
    </div>
  );
};

/* ─── Main Cell Table View Component ────────────────────────── */
const CellTableView: React.FC<CellTableViewProps> = ({
  allLocations,
  selectedArea,
  onBack,
  onNodeSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'devices' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  /* ─── Filter and Sort Locations ──────────────────────────────── */
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = allLocations.filter(
      (loc) =>
        loc.area === selectedArea &&
        (filterStatus === 'all' || loc.status === filterStatus) &&
        (searchTerm === '' || loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'health':
          comparison = (a.health_percentage ?? 0) - (b.health_percentage ?? 0);
          break;
        case 'devices':
          comparison = (a.device_count ?? 0) - (b.device_count ?? 0);
          break;
        case 'status':
          const statusOrder = { online: 0, partial: 1, offline: 2, unknown: 3 };
          comparison = (statusOrder[a.status as keyof typeof statusOrder] || 4) -
                       (statusOrder[b.status as keyof typeof statusOrder] || 4);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allLocations, selectedArea, filterStatus, searchTerm, sortBy, sortOrder]);

  /* ─── Calculate Statistics ──────────────────────────── */
  const stats = useMemo(() => {
    const areaLocations = allLocations.filter((loc) => loc.area === selectedArea);
    const totalDevices = areaLocations.reduce((sum, l) => sum + (l.device_count ?? 0), 0);
    const onlineDevices = areaLocations.reduce((sum, l) => sum + (l.online_device_count ?? 0), 0);
    const offlineDevices = areaLocations.reduce((sum, l) => sum + (l.offline_device_count ?? 0), 0);

    return {
      total: areaLocations.length,
      online: areaLocations.filter((l) => l.status === 'online').length,
      offline: areaLocations.filter((l) => l.status === 'offline').length,
      partial: areaLocations.filter((l) => l.status === 'partial').length,
      avgHealth: Math.round(
        areaLocations.reduce((sum, l) => sum + (l.health_percentage ?? 0), 0) /
          Math.max(areaLocations.length, 1)
      ),
      totalDevices,
      onlineDevices,
      offlineDevices,
    };
  }, [allLocations, selectedArea]);

  const handleSort = (column: 'name' | 'health' | 'devices' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return <ChevronDown size={12} className="sort-icon-inactive" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="cell-table-container">
      {/* Header */}
      <header className="table-header">
        <div className="header-top">
          <button className="back-button" onClick={onBack} title="Back to areas">
            <ArrowLeft size={20} />
          </button>

          <div className="header-title">
            <div className="title-icon">
              <MapPin size={22} />
            </div>
            <div>
              <h1>Cell View</h1>
              <p>{selectedArea}</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon total">
                <Activity size={16} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Locations</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon online">
                <Wifi size={16} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.online}</span>
                <span className="stat-label">Online</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon offline">
                <WifiOff size={16} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.offline}</span>
                <span className="stat-label">Offline</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon devices">
                <Zap size={16} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.totalDevices}</span>
                <span className="stat-label">Devices</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="search-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            <span>Filters</span>
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <div className={`status-chips ${showFilters ? 'visible' : ''}`}>
            {(['all', 'online', 'offline', 'partial'] as const).map((status) => {
              const config = status === 'all' ? { color: '#64748b', label: 'ALL' } : getStatus(status);
              const isActive = filterStatus === status;

              return (
                <button
                  key={status}
                  className={`status-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    borderColor: isActive ? config.color : 'rgba(148, 163, 184, 0.2)',
                    color: isActive ? config.color : '#94a3b8',
                  }}
                >
                  {status === 'all' ? 'ALL' : config.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Table */}
      <main className="table-main">
        {filteredAndSortedLocations.length === 0 ? (
          <div className="empty-state">
            <AlertIcon size={48} />
            <h3>No locations found</h3>
            <p>
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No locations match the selected filters'}
            </p>
          </div>
        ) : (
          <div className="data-table">
            {/* Table Header Row */}
            <div className="table-header-row">
              <div className="header-cell status-header" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </div>
              <div className="header-cell name-header" onClick={() => handleSort('name')}>
                Location Name <SortIcon column="name" />
              </div>
              <div className="header-cell health-header" onClick={() => handleSort('health')}>
                Health <SortIcon column="health" />
              </div>
              <div className="header-cell devices-header" onClick={() => handleSort('devices')}>
                Devices <SortIcon column="devices" />
              </div>
              <div className="header-cell online-header">
                Online %
              </div>
            </div>

            {/* Table Rows */}
            <div className="table-body">
              {filteredAndSortedLocations.map((location, index) => (
                <TableRow
                  key={location.id}
                  location={location}
                  onClick={onNodeSelect}
                  index={index}
                />
              ))}
            </div>
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

        .cell-table-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #0a0f1c 0%, #0f1425 100%);
          color: #e2e8f0;
          font-family: 'Segoe UI', 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        /* Header Styles */
        .table-header {
          background: rgba(10, 15, 28, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
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
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(148, 163, 184, 0.05);
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
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

        .title-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .title-icon svg {
          color: #10b981;
        }

        .header-title h1 {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.3px;
        }

        .header-title p {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .stats-cards {
          display: flex;
          gap: 12px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: rgba(148, 163, 184, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.08);
          border-radius: 12px;
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.total { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
        .stat-icon.online { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .stat-icon.offline { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .stat-icon.devices { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Filters Bar */
        .filters-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-wrapper {
          flex: 1;
          position: relative;
          max-width: 280px;
        }

        .search-wrapper svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .search-wrapper input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .search-wrapper input:focus {
          outline: none;
          background: rgba(148, 163, 184, 0.08);
          border-color: rgba(148, 163, 184, 0.3);
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-toggle:hover {
          background: rgba(148, 163, 184, 0.1);
        }

        .status-chips {
          display: flex;
          gap: 8px;
          overflow: hidden;
          max-width: 0;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .status-chips.visible {
          max-width: 500px;
          opacity: 1;
        }

        .status-chip {
          padding: 5px 12px;
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.3px;
        }

        .status-chip:hover {
          border-color: currentColor;
        }

        .status-chip.active {
          border-color: currentColor;
        }

        /* Table Main */
        .table-main {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        .data-table {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          overflow: hidden;
        }

        /* Table Header Row */
        .table-header-row {
          display: grid;
          grid-template-columns: 100px 1fr 120px 140px 90px;
          background: rgba(16, 185, 129, 0.05);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          padding: 12px 16px;
        }

        .header-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          cursor: pointer;
          user-select: none;
        }

        .header-cell:hover {
          color: #94a3b8;
        }

        .sort-icon-inactive {
          opacity: 0.3;
        }

        /* Table Body */
        .table-body {
          display: flex;
          flex-direction: column;
        }

        /* Table Row */
        .table-row {
          display: grid;
          grid-template-columns: 100px 1fr 120px 140px 90px;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.05);
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }

        .table-row:hover {
          background: rgba(16, 185, 129, 0.04);
        }

        /* Cells */
        .cell {
          display: flex;
          align-items: center;
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          border-left: 3px solid;
        }

        .name-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .location-name-text {
          font-size: 13px;
          font-weight: 500;
          color: #e2e8f0;
        }

        .health-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .health-bar-track {
          flex: 1;
          height: 5px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 99px;
          overflow: hidden;
        }

        .health-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease;
        }

        .health-value {
          font-size: 11px;
          font-weight: 600;
          min-width: 35px;
        }

        .devices-stats {
          display: flex;
          gap: 8px;
        }

        .device-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 500;
        }

        .device-badge.online {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .device-badge.offline {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        .device-badge.total {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
        }

        .online-percent-wrapper {
          display: flex;
          justify-content: flex-start;
        }

        .online-percent-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
        }

        .online-percent-circle span {
          font-size: 11px;
          font-weight: 700;
          color: #e2e8f0;
        }

        /* Row Hover Overlay */
        .row-hover-overlay {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }

        .view-details-btn {
          padding: 4px 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          color: #10b981;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          background: rgba(16, 185, 129, 0.25);
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          color: #64748b;
          text-align: center;
        }

        .empty-state svg {
          opacity: 0.3;
        }

        .empty-state h3 {
          font-size: 16px;
          color: #94a3b8;
          font-weight: 500;
        }

        .empty-state p {
          font-size: 13px;
        }

        /* Animations */
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateX(-10px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Scrollbar */
        .table-main::-webkit-scrollbar {
          width: 6px;
        }

        .table-main::-webkit-scrollbar-track {
          background: transparent;
        }

        .table-main::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .table-header-row,
          .table-row {
            grid-template-columns: 90px 1fr 100px 120px 80px;
          }

          .stats-cards {
            display: none;
          }
        }

        @media (max-width: 700px) {
          .table-header {
            padding: 12px 16px;
          }

          .header-top {
            flex-wrap: wrap;
          }

          .table-header-row,
          .table-row {
            grid-template-columns: 80px 1fr 90px 100px 70px;
            padding: 10px 12px;
          }

          .device-badge span,
          .health-value,
          .location-name-text {
            font-size: 11px;
          }

          .online-percent-circle {
            width: 36px;
            height: 36px;
          }

          .online-percent-circle span {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
};

export default CellTableView;