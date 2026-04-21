'use client';

import React, { useState, useMemo } from 'react';
import {
  Grid3x3, MapPin, Activity, TrendingUp, ChevronRight, Search,
  Wifi, WifiOff, AlertTriangle
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

interface AreaSummaryProps {
  allLocations: Location[];
  onAreaSelect: (area: string) => void;
}

const AreaSummary: React.FC<AreaSummaryProps> = ({ allLocations, onAreaSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  /* ─── Calculate Area Statistics ────────────────────── */
  const areaSummaries = useMemo(() => {
    const byArea = new Map<string, Location[]>();

    const collectByArea = (locs: Location[]) => {
      locs.forEach((loc) => {
        if (!byArea.has(loc.area)) byArea.set(loc.area, []);
        byArea.get(loc.area)!.push(loc);
        if (loc.children?.length) collectByArea(loc.children);
      });
    };

    collectByArea(allLocations);

    return Array.from(byArea.entries())
      .map(([area, locs]) => {
        const online = locs.filter((l) => l.status === 'online').length;
        const offline = locs.filter((l) => l.status === 'offline').length;
        const partial = locs.filter((l) => l.status === 'partial').length;
        const avgHealth = Math.round(
          locs.reduce((sum, l) => sum + (l.health_percentage ?? 0), 0) / Math.max(locs.length, 1)
        );
        const totalDevices = locs.reduce((sum, l) => sum + (l.device_count ?? 0), 0);

        return {
          area,
          total: locs.length,
          online,
          offline,
          partial,
          avgHealth,
          totalDevices,
        };
      })
      .filter((summary) =>
        searchTerm === '' || summary.area.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.area.localeCompare(b.area));
  }, [allLocations, searchTerm]);

  const globalStats = useMemo(() => {
    return {
      totalAreas: areaSummaries.length,
      totalLocations: areaSummaries.reduce((sum, a) => sum + a.total, 0),
      totalOnline: areaSummaries.reduce((sum, a) => sum + a.online, 0),
      totalOffline: areaSummaries.reduce((sum, a) => sum + a.offline, 0),
      totalPartial: areaSummaries.reduce((sum, a) => sum + a.partial, 0),
      avgHealth: Math.round(
        areaSummaries.reduce((sum, a) => sum + a.avgHealth, 0) / Math.max(areaSummaries.length, 1)
      ),
    };
  }, [areaSummaries]);

  const getHealthColor = (health: number) => {
    if (health >= 80) return '#10b981';
    if (health >= 50) return '#f59e0b';
    return '#ef4444';
  };


  return (
    <div className="area-summary-container">
      {/* Header Section */}
      <header className="summary-header">
        <div className="header-content">
          <div className="header-icon">
            <Grid3x3 size={28} />
          </div>
          <div className="header-text">
            <h1>Area Summary</h1>
            <p>Select an area to view cluster visualization</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="global-stats">
          {[
            {
              label: 'AREAS',
              value: globalStats.totalAreas,
              icon: Grid3x3,
              color: '#3b82f6',
            },
            {
              label: 'LOCATIONS',
              value: globalStats.totalLocations,
              icon: MapPin,
              color: '#10b981',
            },
            {
              label: 'DEVICES',
              value: allLocations.reduce((sum, l) => sum + (l.device_count ?? 0), 0),
              icon: Activity,
              color: '#f59e0b',
            },
            {
              label: 'AVG HEALTH',
              value: `${globalStats.avgHealth}%`,
              icon: TrendingUp,
              color: getHealthColor(globalStats.avgHealth),
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="global-stat-card">
              <div className="stat-icon" style={{ color }}>
                <Icon size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-container">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search areas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      <main className="summary-content">
        {areaSummaries.length === 0 ? (
          <div className="empty-state">
            <Grid3x3 size={48} />
            <h2>No areas found</h2>
            <p>No areas match your search criteria</p>
          </div>
        ) : (
          <div className="areas-grid">
            {areaSummaries.map((summary) => {
              const healthColor = getHealthColor(summary.avgHealth);
              const isHovered = hoveredArea === summary.area;

              return (
                <div
                  key={summary.area}
                  className={`area-card ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => setHoveredArea(summary.area)}
                  onMouseLeave={() => setHoveredArea(null)}
                  onClick={() => onAreaSelect(summary.area)}
                >
                  {/* Card Background Gradient */}
                  <div className="card-bg-gradient" />

                  {/* Card Content */}
                  <div className="card-content">
                    {/* Area Name */}
                    <div className="area-header">
                      <MapPin size={20} style={{ color: '#3b82f6' }} />
                      <h3>{summary.area}</h3>
                    </div>

                    {/* Stats Row */}
                    <div className="stats-row">
                      <div className="stat-mini">
                        <span className="stat-label">Locations</span>
                        <span className="stat-value">{summary.total}</span>
                      </div>
                      <div className="divider" />
                      <div className="stat-mini">
                        <span className="stat-label">Devices</span>
                        <span className="stat-value">{summary.totalDevices}</span>
                      </div>
                    </div>

                    {/* Health Score */}
                    <div className="health-section">
                      <div className="health-header">
                        <span className="health-label">Health Score</span>
                        <span className="health-value" style={{ color: healthColor }}>
                          {summary.avgHealth}%
                        </span>
                      </div>
                      <div className="health-bar">
                        <div
                          className="health-fill"
                          style={{
                            width: `${summary.avgHealth}%`,
                            backgroundColor: healthColor,
                            boxShadow: `0 0 12px ${healthColor}`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="status-indicators">
                      {[
                        { label: 'Online', value: summary.online, icon: Wifi, color: '#10b981' },
                        {
                          label: 'Offline',
                          value: summary.offline,
                          icon: WifiOff,
                          color: '#ef4444',
                        },
                        {
                          label: 'Partial',
                          value: summary.partial,
                          icon: AlertTriangle,
                          color: '#f59e0b',
                        },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="indicator">
                          <Icon size={14} style={{ color }} />
                          <div className="indicator-info">
                            <span className="indicator-value">{value}</span>
                            <span className="indicator-label">{label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <button className="view-cluster-btn">
                      <span>View Cluster</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
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

        .area-summary-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #0f172a 0%, #1a1f35 100%);
          color: #e2e8f0;
          font-family: 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
          overflow: hidden;
        }

        /* Header */
        .summary-header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          padding: 24px;
          flex-shrink: 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .header-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .header-text h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }

        .header-text p {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Global Stats */
        .global-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .global-stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(148, 163, 184, 0.03);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .global-stat-card:hover {
          background: rgba(148, 163, 184, 0.06);
          border-color: rgba(148, 163, 184, 0.2);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
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
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Search Section */
        .search-section {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          flex-shrink: 0;
        }

        .search-container {
          position: relative;
          max-width: 400px;
        }

        .search-container svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          flex-shrink: 0;
        }

        .search-container input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          background: rgba(148, 163, 184, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .search-container input:focus {
          outline: none;
          background: rgba(148, 163, 184, 0.08);
          border-color: rgba(148, 163, 184, 0.3);
        }

        .search-container input::placeholder {
          color: #64748b;
        }

        /* Content */
        .summary-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .areas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          width: 100%;
          max-width: 1600px;
        }

        /* Area Card */
        .area-card {
          position: relative;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .area-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05));
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .area-card:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(148, 163, 184, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
        }

        .area-card.hovered::before {
          opacity: 1;
        }

        .card-bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at top right,
            rgba(59, 130, 246, 0.1),
            transparent 60%
          );
          pointer-events: none;
        }

        .card-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Area Header */
        .area-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .area-header h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        /* Stats Row */
        .stats-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(148, 163, 184, 0.04);
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .stat-mini {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-mini .stat-label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-mini .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .divider {
          width: 1px;
          height: 32px;
          background: rgba(148, 163, 184, 0.1);
        }

        /* Health Section */
        .health-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .health-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .health-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .health-value {
          font-size: 16px;
          font-weight: 700;
        }

        .health-bar {
          height: 6px;
          background: rgba(148, 163, 184, 0.1);
          border-radius: 99px;
          overflow: hidden;
        }

        .health-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.3s ease;
        }

        /* Status Indicators */
        .status-indicators {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px;
          background: rgba(148, 163, 184, 0.04);
          border-radius: 6px;
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .indicator-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .indicator-value {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1;
        }

        .indicator-label {
          font-size: 9px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* View Cluster Button */
        .view-cluster-btn {
          width: 100%;
          padding: 10px 16px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          color: #3b82f6;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }

        .view-cluster-btn:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(16, 185, 129, 0.2));
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateX(2px);
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
          font-size: 18px;
          color: #cbd5e1;
          margin: 8px 0 0 0;
        }

        .empty-state p {
          font-size: 14px;
        }

        /* Scrollbar */
        .summary-content::-webkit-scrollbar {
          width: 8px;
        }

        .summary-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .summary-content::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }

        .summary-content::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .global-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .areas-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          }
        }

        @media (max-width: 640px) {
          .summary-header {
            padding: 16px;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            margin-bottom: 16px;
          }

          .header-text h1 {
            font-size: 22px;
          }

          .global-stats {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .search-section {
            padding: 12px 16px;
          }

          .search-container {
            max-width: 100%;
          }

          .summary-content {
            padding: 16px;
          }

          .areas-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default AreaSummary;