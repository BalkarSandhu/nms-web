'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

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

interface SummaryNode {
  location: Location;
  children: SummaryNode[];
}

interface AreaSummary {
  area: string;
  totalLocations: number;
  online: number;
  offline: number;
  partial: number;
  health: number;
  clusters: SummaryNode[];
}

const STATUS = {
  online:  { hex: '#00e5a0', glow: 'rgba(0,229,160,0.6)',   bg: 'rgba(0,229,160,0.07)',  text: '#00e5a0', label: 'ONLINE' },
  offline: { hex: '#ff4d6d', glow: 'rgba(255,77,109,0.7)',  bg: 'rgba(255,77,109,0.07)', text: '#ff4d6d', label: 'OFFLINE' },
  partial: { hex: '#ffb830', glow: 'rgba(255,184,48,0.55)', bg: 'rgba(255,184,48,0.07)', text: '#ffb830', label: 'PARTIAL' },
  unknown: { hex: '#4a5568', glow: 'rgba(74,85,104,0.3)',   bg: 'rgba(74,85,104,0.06)', text: '#718096', label: 'UNKNOWN' },
};

const getS = (status: string) => STATUS[status as keyof typeof STATUS] ?? STATUS.unknown;

/* ─── Build hierarchical tree for cluster view ──────────── */
function buildHierarchy(locations: Location[], parentId: number | null = null): SummaryNode[] {
  return locations
    .filter(loc => loc.parent_id === parentId)
    .map(loc => ({
      location: loc,
      children: buildHierarchy(locations, loc.id),
    }));
}

/* ─── Flatten and calculate stats ──────────────────────── */
function calculateAreaSummary(locations: Location[]): AreaSummary[] {
  const byArea = new Map<string, Location[]>();

  const collectByArea = (locs: Location[]) => {
    locs.forEach(loc => {
      if (!byArea.has(loc.area)) byArea.set(loc.area, []);
      byArea.get(loc.area)!.push(loc);
      if (loc.children?.length) collectByArea(loc.children);
    });
  };

  collectByArea(locations);

  return Array.from(byArea.entries()).map(([area, locs]) => {
    const flatAll: Location[] = [];
    const flatten = (l: Location[]) => {
      l.forEach(loc => {
        flatAll.push(loc);
        if (loc.children?.length) flatten(loc.children);
      });
    };
    flatten(locs);

    const online = flatAll.filter(l => l.status === 'online').length;
    const offline = flatAll.filter(l => l.status === 'offline').length;
    const partial = flatAll.filter(l => l.status === 'partial').length;
    const health = flatAll.length > 0
      ? Math.round(flatAll.reduce((sum, l) => sum + (l.health_percentage ?? 0), 0) / flatAll.length)
      : 0;

    return {
      area,
      totalLocations: flatAll.length,
      online,
      offline,
      partial,
      health,
      clusters: buildHierarchy(locs),
    };
  }).sort((a, b) => a.area.localeCompare(b.area));
}

/* ─── Individual Cluster Card (Parent + Children) ──────── */
const ClusterCard: React.FC<{
  node: SummaryNode;
  onNodeClick: (location: Location) => void;
}> = ({ node, onNodeClick }) => {
  const [expanded, setExpanded] = useState(false);
  const loc = node.location;
  const s = getS(loc.status);
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => onNodeClick(loc)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${s.border}`,
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all .2s',
          marginBottom: hasChildren ? 6 : 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLDivElement).style.borderColor = s.hex;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
          (e.currentTarget as HTMLDivElement).style.borderColor = s.border;
        }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#556677',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronRight
              size={14}
              style={{
                transition: 'transform .2s',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </button>
        )}

        {!hasChildren && <div style={{ width: 14 }} />}

        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: s.hex,
            flexShrink: 0,
            boxShadow: `0 0 6px ${s.hex}`,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#e2eaf4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {loc.name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#556677',
              marginTop: 2,
            }}
          >
            {loc.device_count ?? 0} devices · {loc.health_percentage ?? 0}% health
          </div>
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: s.text,
            background: s.bg,
            border: `1px solid ${s.border}`,
            padding: '2px 8px',
            borderRadius: 4,
            flexShrink: 0,
            letterSpacing: 0.5,
          }}
        >
          {s.label}
        </div>
      </div>

      {expanded && hasChildren && (
        <div style={{ paddingLeft: 20, marginTop: 6 }}>
          {node.children.map((child) => (
            <ClusterCard
              key={child.location.id}
              node={child}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Area Summary Card ────────────────────────────────── */
const AreaCard: React.FC<{
  summary: AreaSummary;
  onAreaClick: () => void;
  isExpanded: boolean;
  onNodeClick: (location: Location) => void;
}> = ({ summary, onAreaClick, isExpanded, onNodeClick }) => {
  const healthColor = summary.health >= 80 ? '#00e5a0' : summary.health >= 50 ? '#ffb830' : '#ff4d6d';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <div
        onClick={onAreaClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
          cursor: 'pointer',
          transition: 'all .2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,229,160,0.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown
            size={16}
            style={{
              color: '#556677',
              transition: 'transform .2s',
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#e2eaf4',
              }}
            >
              {summary.area}
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#556677',
                marginTop: 2,
              }}
            >
              {summary.totalLocations} locations
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[
            { label: 'UP', value: summary.online, color: '#00e5a0' },
            { label: 'PARTIAL', value: summary.partial, color: '#ffb830' },
            { label: 'DOWN', value: summary.offline, color: '#ff4d6d' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: color,
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 7.5,
                  color: '#334455',
                  letterSpacing: 0.4,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            paddingLeft: 12,
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            marginLeft: 12,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: healthColor,
            }}
          >
            {summary.health}%
          </div>
          <div
            style={{
              fontSize: 7.5,
              color: '#334455',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            Health
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: '12px 14px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {summary.clusters.map((cluster) => (
            <ClusterCard
              key={cluster.location.id}
              node={cluster}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main Summary Component
   ═══════════════════════════════════════════════════════════ */
interface SummaryPanelProps {
  allLocations: Location[];
  onLocationSelect: (location: Location | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  allLocations,
  onLocationSelect,
  isOpen,
  onClose,
}) => {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const areaSummaries = useMemo(() => {
    return calculateAreaSummary(allLocations);
  }, [allLocations]);

  const toggleArea = (area: string) => {
    const newSet = new Set(expandedAreas);
    if (newSet.has(area)) {
      newSet.delete(area);
    } else {
      newSet.add(area);
    }
    setExpandedAreas(newSet);
  };

  const handleNodeClick = (location: Location) => {
    onLocationSelect(location);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        bottom: 16,
        width: 340,
        background: 'rgba(7,12,22,0.97)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 28px rgba(0,229,160,0.15), 0 32px 64px rgba(0,0,0,0.7)',
        zIndex: 25,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg,#00e5a0,transparent)',
        }}
      />
      <div
        style={{
          padding: '11px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 8.5,
              color: '#334455',
              letterSpacing: 1,
              marginBottom: 2,
            }}
          >
            CLUSTER SUMMARY
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#e2eaf4',
            }}
          >
            Area Overview
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            color: '#445566',
            cursor: 'pointer',
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
        }}
      >
        {areaSummaries.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 10,
            }}
          >
            <AlertCircle size={32} style={{ color: '#1a2533' }} />
            <p
              style={{
                color: '#2a3a4a',
                fontSize: 11,
                margin: 0,
                textAlign: 'center',
              }}
            >
              No locations available
            </p>
          </div>
        ) : (
          areaSummaries.map((summary) => (
            <AreaCard
              key={summary.area}
              summary={summary}
              isExpanded={expandedAreas.has(summary.area)}
              onAreaClick={() => toggleArea(summary.area)}
              onNodeClick={handleNodeClick}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '8px 14px',
          fontSize: 8.5,
          color: '#334455',
          letterSpacing: 0.5,
          textAlign: 'center',
        }}
      >
        {areaSummaries.reduce((sum, a) => sum + a.totalLocations, 0)} total locations
      </div>

      <style>{`
        div::-webkit-scrollbar {
          width: 4px;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default SummaryPanel;