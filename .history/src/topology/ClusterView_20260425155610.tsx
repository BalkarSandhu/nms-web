'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertCircle as AlertIcon,
  Search,
  Zap,
  TrendingUp,
  Clock,
  Radio,
} from 'lucide-react';

const STATUS_CONFIG = {
  online: {
    color: '#10b981',
    borderColor: '#059669',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    label: 'ONLINE',
    icon: CheckCircle2,
  },
  offline: {
    color: '#ef4444',
    borderColor: '#dc2626',
    bgColor: 'rgba(239, 68, 68, 0.08)',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    label: 'OFFLINE',
    icon: WifiOff,
  },
  partial: {
    color: '#f59e0b',
    borderColor: '#d97706',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    label: 'PARTIAL',
    icon: AlertTriangle,
  },
  unknown: {
    color: '#6b7280',
    borderColor: '#4b5563',
    bgColor: 'rgba(107, 114, 128, 0.08)',
    glowColor: 'rgba(107, 114, 128, 0.5)',
    label: 'UNKNOWN',
    icon: AlertIcon,
  },
};

const getStatus = (status) =>
  STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

/**
 * Professional Location Node Component
 * Minimal display with rich hover expansion
 */
const LocationNode = ({ location, onClick, index, isChild, parentConnector }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = getStatus(location.status);
  const StatusIcon = status.icon;
  const health = location.health_percentage ?? 0;

  const hasAlert = location.status === 'offline' || location.status === 'partial';
  const latency = location.latency || 0;
  const responseTime = location.response_time || 0;

  const animationDelay = index * 0.08;

  return (
    <div
      className="location-node"
      style={{
        animation: `nodeSlideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
        animationDelay: `${animationDelay}s`,
        opacity: 0,
        marginLeft: isChild ? '32px' : '0',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(location)}
    >
      {/* Parent connector line for child nodes */}
      {parentConnector && (
        <div className="parent-connector">
          <div className="connector-vertical" />
          <div className="connector-horizontal" />
        </div>
      )}

      {/* Main Node Card */}
      <div
        className="node-card"
        style={{
          borderColor: isHovered ? status.color : 'rgba(148, 163, 184, 0.2)',
          boxShadow: isHovered
            ? `0 0 20px ${status.glowColor}, inset 0 0 20px ${status.bgColor}`
            : `0 0 0 1px ${status.borderColor}20, 0 4px 12px rgba(0, 0, 0, 0.3)`,
          backgroundColor: isHovered
            ? status.bgColor
            : 'rgba(15, 23, 42, 0.6)',
        }}
      >
        {/* Status Indicator Bar */}
        <div className="status-bar" style={{ backgroundColor: status.color }}>
          <div className="status-pulse" style={{ backgroundColor: status.color }} />
        </div>

        {/* Node Header */}
        <div className="node-header">
          <div className="header-left">
            <StatusIcon size={18} style={{ color: status.color }} />
            <div className="location-info">
              <h3 className="location-title">{location.name}</h3>
              <p className="location-subtitle">
                {location.area}
                {location.device_count ? ` • ${location.device_count} devices` : ''}
              </p>
            </div>
          </div>

          {/* Alert Badge */}
          {hasAlert && (
            <div
              className="alert-badge"
              style={{
                backgroundColor: status.bgColor,
                borderColor: status.color,
              }}
            >
              <AlertTriangle size={12} style={{ color: status.color }} />
            </div>
          )}
        </div>

        {/* Compact Metrics Row */}
        <div className="metrics-row">
          <div className="metric-item">
            <Zap size={12} style={{ color: status.color, opacity: 0.7 }} />
            <span>{location.online_device_count || 0}/{location.device_count || 0}</span>
          </div>
          <div className="metric-item">
            <TrendingUp size={12} style={{ color: '#3b82f6', opacity: 0.7 }} />
            <span>{health}%</span>
          </div>
        </div>

        {/* Hover Expansion Panel */}
        {isHovered && (
          <div className="hover-expansion">
            <div className="expansion-divider" />

            {/* Performance Metrics */}
            <div className="expansion-section">
              <h4 className="section-title">Performance</h4>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Latency</div>
                  <div className="metric-value" style={{ color: status.color }}>
                    {latency}ms
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Response</div>
                  <div className="metric-value" style={{ color: '#3b82f6' }}>
                    {responseTime}ms
                  </div>
                </div>
              </div>
            </div>

            {/* Status Details */}
            <div className="expansion-section">
              <h4 className="section-title">Status</h4>
              <div className="status-details">
                <div className="detail-item">
                  <span className="detail-label">State:</span>
                  <span
                    className="detail-value"
                    style={{
                      color: status.color,
                      fontWeight: '600',
                    }}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Health:</span>
                  <div className="mini-health-bar">
                    <div
                      className="health-fill"
                      style={{
                        width: `${health}%`,
                        backgroundColor: health >= 80 ? '#10b981' : health >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="expansion-action">
              <span className="action-text">Click to view full details</span>
            </div>
          </div>
        )}
      </div>

      {/* Child Nodes */}
      {location.children && location.children.length > 0 && (
        <div className="children-container">
          {location.children.map((child, idx) => (
            <LocationNode
              key={child.id}
              location={child}
              onClick={onClick}
              index={idx}
              isChild={true}
              parentConnector={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Professional Cluster View Component
 */
const ClusterView = ({ allLocations, selectedArea, onBack, onNodeSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandAll, setExpandAll] = useState(false);
  const scrollContainerRef = useRef(null);

  /* Build hierarchical structure */
  const hierarchicalLocations = useMemo(() => {
    const buildTree = (locations, parentId = null) => {
      return locations
        .filter((loc) => loc.parent_id === parentId && loc.area === selectedArea)
        .map((loc) => ({
          ...loc,
          children: buildTree(locations, loc.id),
        }));
    };
    return buildTree(allLocations);
  }, [allLocations, selectedArea]);

  /* Filter locations */
  const filteredLocations = useMemo(() => {
    const filterTree = (nodes) => {
      return nodes
        .filter(
          (loc) =>
            (filterStatus === 'all' || loc.status === filterStatus) &&
            (searchTerm === '' || loc.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .map((loc) => ({
          ...loc,
          children: loc.children ? filterTree(loc.children) : [],
        }))
        .filter((loc) => loc.children.length > 0 || filterStatus === 'all' || loc.status === filterStatus);
    };
    return filterTree(hierarchicalLocations);
  }, [hierarchicalLocations, filterStatus, searchTerm]);

  /* Calculate statistics */
  const stats = useMemo(() => {
    const countStats = (nodes) => {
      let total = 0,
        online = 0,
        offline = 0,
        partial = 0;
      const flatten = (arr) => {
        arr.forEach((loc) => {
          total++;
          if (loc.status === 'online') online++;
          else if (loc.status === 'offline') offline++;
          else if (loc.status === 'partial') partial++;
          if (loc.children) flatten(loc.children);
        });
      };
      flatten(nodes);
      return { total, online, offline, partial };
    };

    const areaStats = countStats(hierarchicalLocations);
    return areaStats;
  }, [hierarchicalLocations]);

  const handleNodeSelect = useCallback(
    (location) => {
      onNodeSelect(location);
    },
    [onNodeSelect]
  );

  return (
    <div className="cluster-view">
      {/* Header */}
      <header className="cluster-header">
        <div className="header-content">
          {/* Left Section */}
          <div className="header-left">
            <button className="back-btn" onClick={onBack} title="Back to areas">
              <ArrowLeft size={20} />
            </button>
            <div className="header-title">
              <h1>{selectedArea}</h1>
              <p className="header-subtitle">Network Topology & Hierarchy</p>
            </div>
          </div>

          {/* Right Section - Stats */}
          <div className="header-stats">
            {[
              { label: 'TOTAL', value: stats.total, color: '#64748b', icon: Activity },
              { label: 'ONLINE', value: stats.online, color: '#10b981', icon: Wifi },
              { label: 'OFFLINE', value: stats.offline, color: '#ef4444', icon: WifiOff },
              { label: 'PARTIAL', value: stats.partial, color: '#f59e0b', icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="stat-badge" style={{ borderColor: `${color}40` }}>
                <Icon size={16} style={{ color }} />
                <div className="stat-content">
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

          <div className="filter-buttons">
            {['all', 'online', 'offline', 'partial'].map((status) => {
              const config = status === 'all' ? { color: '#64748b', label: 'ALL' } : getStatus(status);
              const isActive = filterStatus === status;
              return (
                <button
                  key={status}
                  className={`filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    borderColor: isActive ? config.color : 'rgba(148, 163, 184, 0.2)',
                    color: isActive ? config.color : '#94a3b8',
                    backgroundColor: isActive ? `${config.color}10` : 'transparent',
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
      <main className="cluster-content" ref={scrollContainerRef}>
        {filteredLocations.length === 0 ? (
          <div className="empty-state">
            <AlertIcon size={48} style={{ opacity: 0.3 }} />
            <h2>No locations found</h2>
            <p>
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No locations match the selected filters'}
            </p>
          </div>
        ) : (
          <div className="tree-container">
            {filteredLocations.map((location, index) => (
              <LocationNode
                key={location.id}
                location={location}
                onClick={handleNodeSelect}
                index={index}
                isChild={false}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .cluster-view {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(
            135deg,
            #0f172a 0%,
            #1a1f35 50%,
            #162032 100%
          );
          color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          overflow: hidden;
        }

        /* ───── HEADER ───── */
        .cluster-header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          padding: 20px 24px;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .back-btn {
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

        .back-btn:hover {
          background: rgba(148, 163, 184, 0.1);
          border-color: rgba(148, 163, 184, 0.3);
          transform: translateX(-2px);
        }

        .header-title h1 {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .header-subtitle {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
          font-weight: 500;
        }

        .header-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .stat-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border: 1px solid;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }

        .stat-badge:hover {
          background: rgba(15, 23, 42, 0.8);
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        /* ───── FILTERS ───── */
        .header-filters {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 350px;
        }

        .search-box svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .search-box input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
          transition: all 0.3s ease;
        }

        .search-box input:focus {
          outline: none;
          background: rgba(148, 163, 184, 0.08);
          border-color: rgba(148, 163, 184, 0.3);
          box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
        }

        .search-box input::placeholder {
          color: #64748b;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 14px;
          background: transparent;
          border: 1px solid;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .filter-btn:hover {
          transform: translateY(-2px);
        }

        .filter-btn.active {
          font-weight: 700;
        }

        /* ───── CONTENT ───── */
        .cluster-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          justify-content: flex-start;
          align-items: flex-start;
        }

        .tree-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 900px;
        }

        /* ───── LOCATION NODE ───── */
        .location-node {
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .parent-connector {
          position: relative;
          height: 16px;
          margin-left: 20px;
          margin-bottom: 0;
        }

        .connector-vertical {
          position: absolute;
          left: -12px;
          top: -8px;
          width: 2px;
          height: 24px;
          background: rgba(148, 163, 184, 0.2);
        }

        .connector-horizontal {
          position: absolute;
          left: -12px;
          top: 8px;
          width: 12px;
          height: 2px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 1px;
        }

        .node-card {
          position: relative;
          border: 1px solid;
          border-radius: 12px;
          padding: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
        }

        .node-card:hover {
          transform: translateX(4px);
        }

        .status-bar {
          height: 3px;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .status-pulse {
          position: absolute;
          right: 0;
          width: 30%;
          height: 100%;
          animation: pulseGlow 2s ease-in-out infinite;
        }

        .node-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 14px 16px;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .location-info {
          flex: 1;
          min-width: 0;
        }

        .location-title {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1.3;
          word-break: break-word;
          margin: 0;
        }

        .location-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin: 4px 0 0 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .alert-badge {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .metrics-row {
          display: flex;
          gap: 12px;
          padding: 0 16px 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          font-size: 12px;
        }

        .metric-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          flex: 1;
        }

        /* ───── HOVER EXPANSION ───── */
        .hover-expansion {
          padding: 12px 16px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          animation: expandDown 0.3s ease forwards;
        }

        .expansion-divider {
          display: none;
        }

        .expansion-section {
          margin-bottom: 12px;
        }

        .expansion-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .metric-card {
          background: rgba(148, 163, 184, 0.05);
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .metric-label {
          font-size: 10px;
          color: #94a3b8;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 12px;
          font-weight: 700;
        }

        .status-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
        }

        .detail-label {
          color: #94a3b8;
        }

        .detail-value {
          color: #e2e8f0;
        }

        .mini-health-bar {
          flex: 1;
          height: 4px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-left: 8px;
        }

        .health-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .expansion-action {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          text-align: center;
        }

        .action-text {
          font-size: 10px;
          color: #64748b;
          font-style: italic;
        }

        /* ───── CHILDREN ───── */
        .children-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        /* ───── EMPTY STATE ───── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #94a3b8;
          text-align: center;
          flex: 1;
          width: 100%;
        }

        .empty-state h2 {
          font-size: 16px;
          color: #cbd5e1;
        }

        .empty-state p {
          font-size: 12px;
        }

        /* ───── ANIMATIONS ───── */
        @keyframes nodeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes expandDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 400px;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.3;
            width: 30%;
          }
          50% {
            opacity: 1;
            width: 60%;
          }
        }

        /* ───── SCROLLBAR ───── */
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

        /* ───── RESPONSIVE ───── */
        @media (max-width: 1024px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-stats {
            justify-content: flex-start;
            width: 100%;
          }

          .header-filters {
            flex-direction: column;
            width: 100%;
          }

          .search-box {
            max-width: 100%;
          }

          .cluster-content {
            padding: 16px;
          }

          .tree-container {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .cluster-header {
            padding: 16px;
          }

          .header-left {
            gap: 12px;
          }

          .header-title h1 {
            font-size: 18px;
          }

          .header-stats {
            gap: 8px;
          }

          .stat-badge {
            padding: 8px 12px;
          }

          .header-filters {
            gap: 8px;
          }

          .filter-btn {
            padding: 6px 10px;
            font-size: 11px;
          }

          .node-card {
            border-radius: 8px;
          }

          .node-header {
            padding: 12px 14px;
            gap: 10px;
          }

          .location-title {
            font-size: 12px;
          }

          .location-subtitle {
            font-size: 10px;
          }

          .metrics-row {
            padding: 0 14px 10px;
            font-size: 11px;
          }

          .hover-expansion {
            padding: 10px 14px;
          }

          .metrics-grid {
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default ClusterView;