'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Activity,
  Server,
  Network,
  Wifi,
  WifiOff,
} from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

/* ─── Types ─────────────────────────────────────────────── */
interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown' | 'partial';
  project?: string;
  area: string;
  description?: string;
  device_count?: number;
  online_device_count?: number;
  offline_device_count?: number;
  health_percentage?: number;
  children?: Location[];
  depth?: number;
  has_children?: boolean;
  latitude?: number;
  longitude?: number;
  location_type_id?: number;
  worker_id?: string;
  created_at?: string;
  updated_at?: string;
  status_reason?: string;
}

interface TreeNode extends Location {
  children: TreeNode[];
  level: number;
}

/* ─── Status Configuration ──────────────────────────────── */
const STATUS_CONFIG = {
  online: {
    color: '#10b981',
    glow: '0 0 20px rgba(16,185,129,0.5)',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.3)',
    text: '#6ee7b7',
    icon: Wifi,
  },
  offline: {
    color: '#ef4444',
    glow: '0 0 20px rgba(239,68,68,0.6)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.4)',
    text: '#fca5a5',
    icon: WifiOff,
  },
  partial: {
    color: '#f59e0b',
    glow: '0 0 20px rgba(245,158,11,0.45)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    text: '#fde047',
    icon: Activity,
  },
  unknown: {
    color: '#6b7280',
    glow: 'none',
    bg: 'rgba(107,114,128,0.05)',
    border: 'rgba(107,114,128,0.2)',
    text: '#9ca3af',
    icon: AlertCircle,
  },
};

const getStatus = (status: string) =>
  STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;

/* ─── Custom Node Component ──────────────────────────────── */
const LocationNode = ({ data, selected }: { data: TreeNode; selected?: boolean }) => {
  const statusConfig = getStatus(data.status);
  const isOffline = data.status === 'offline';
  const health = data.health_percentage ?? 0;
  const healthColor = health >= 80 ? '#10b981' : health >= 50 ? '#f59e0b' : '#ef4444';
  const IconComponent = data.level === 0 ? Server : data.level === 1 ? Network : Activity;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2540 100%)',
        border: `1.5px solid ${statusConfig.border}`,
        boxShadow: `${statusConfig.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 250,
        fontFamily: "'Geist Sans', 'Inter', sans-serif",
        outline: selected ? `2px solid ${statusConfig.color}` : 'none',
        outlineOffset: 3,
        animation: isOffline
          ? 'pulseRed 2.2s ease-in-out infinite'
          : data.status === 'partial'
            ? 'pulseAmber 2.2s ease-in-out infinite'
            : 'none',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: statusConfig.color,
          border: `2px solid ${statusConfig.color}`,
          width: 10,
          height: 10,
          top: -5,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: statusConfig.color,
          border: `2px solid ${statusConfig.color}`,
          width: 10,
          height: 10,
          bottom: -5,
        }}
      />

      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        {/* Accent stripe */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${statusConfig.color} 0%, transparent 100%)`,
          }}
        />

        <div style={{ padding: '11px 14px 14px' }}>
          {/* Header with icon and name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`,
                borderRadius: 6,
                padding: '3px 6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconComponent size={13} style={{ color: statusConfig.text }} />
            </div>
            <span
              style={{
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: 0.2,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.name}
            </span>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: statusConfig.color,
                boxShadow: `0 0 6px ${statusConfig.color}`,
                animation:
                  data.status === 'online' ? 'breathe 2s ease-in-out infinite' : 'none',
                flexShrink: 0,
              }}
            />
          </div>

          {/* Status badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: statusConfig.bg,
              border: `1px solid ${statusConfig.border}`,
              borderRadius: 20,
              padding: '3px 10px',
              marginBottom: 10,
              fontSize: 9,
              fontWeight: 700,
              color: statusConfig.text,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {data.status}
          </div>

          {/* Device stats */}
          {data.device_count !== undefined && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { label: 'Total', val: data.device_count, col: '#94a3b8' },
                { label: 'Online', val: data.online_device_count ?? 0, col: '#10b981' },
                { label: 'Offline', val: data.offline_device_count ?? 0, col: '#ef4444' },
              ].map(({ label, val, col }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 7,
                    padding: '5px 4px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{val}</div>
                  <div
                    style={{
                      fontSize: 8,
                      color: '#64748b',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Health bar */}
          {data.health_percentage !== undefined && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>HEALTH</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: healthColor }}>
                  {health}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${health}%`,
                    background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`,
                    borderRadius: 99,
                    boxShadow: `0 0 8px ${healthColor}88`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {data.description && (
            <p
              style={{
                fontSize: 9,
                color: '#475569',
                marginTop: 8,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {data.description}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 18px rgba(239,68,68,0.55), inset 0 1px 0 rgba(255,255,255,0.04); }
          50% { box-shadow: 0 0 32px rgba(239,68,68,0.85), inset 0 1px 0 rgba(255,255,255,0.04); }
        }
        @keyframes pulseAmber {
          0%, 100% { box-shadow: 0 0 18px rgba(245,158,11,0.40), inset 0 1px 0 rgba(255,255,255,0.04); }
          50% { box-shadow: 0 0 28px rgba(245,158,11,0.70), inset 0 1px 0 rgba(255,255,255,0.04); }
        }
      `}</style>
    </div>
  );
};

const nodeTypes = { locationNode: LocationNode };

/* ─── Build Graph Data ──────────────────────────────────── */
const buildGraphData = (treeNodes: TreeNode[] | TreeNode): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const processNode = (node: TreeNode, x: number, y: number, parentId?: string): string => {
    const id = `node-${node.id}`;
    nodes.push({
      id,
      type: 'locationNode',
      position: { x, y },
      data: node,
      draggable: true,
    });

    if (parentId) {
      const statusConfig = getStatus(node.status);
      const isOffline = node.status === 'offline';
      const isOnline = node.status === 'online';

      edges.push({
        id: `edge-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: {
          stroke: statusConfig.color,
          strokeWidth: isOffline ? 2.5 : isOnline ? 2.5 : 2,
          strokeDasharray: isOffline ? '8 5' : undefined,
          opacity: 0.8,
          filter: `drop-shadow(0 0 6px ${statusConfig.color})`,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: statusConfig.color,
          width: 25,
          height: 25,
        },
        animated: isOnline,
      });
    }

    if (node.children?.length) {
      const spacing = 300;
      const startX = x - ((node.children.length - 1) * spacing) / 2;
      node.children.forEach((child, i) =>
        processNode(child, startX + i * spacing, y + 280, id),
      );
    }
    return id;
  };

  if (Array.isArray(treeNodes)) {
    treeNodes.forEach((root, i) => processNode(root, i * 640, 50));
  } else {
    processNode(treeNodes, 0, 0);
  }

  return { nodes, edges };
};

/* ─── Process Tree Data ──────────────────────────────────– */
const processTreeData = (locs: Location[], level = 0): TreeNode[] =>
  locs.map((node) => ({
    ...node,
    children: processTreeData(node.children || [], level + 1),
    level,
  }));

/* ─── FIXED: Filter Tree by Area ─────────────────────────– */
const filterTreeByArea = (
  treeNodes: TreeNode[],
  targetArea: string,
): TreeNode[] => {
  if (targetArea === 'all') return treeNodes;

  const filtered: TreeNode[] = [];

  const shouldIncludeSubtree = (node: TreeNode): boolean => {
    // Include if this node is in the target area
    if (node.area === targetArea) return true;

    // Include if any descendant is in the target area
    if (node.children?.length) {
      return node.children.some((child) => shouldIncludeSubtree(child));
    }

    return false;
  };

  const filterNode = (node: TreeNode): TreeNode | null => {
    if (!shouldIncludeSubtree(node)) return null;

    // Recursively filter children
    const filteredChildren = node.children
      ?.map((child) => filterNode(child))
      .filter((child): child is TreeNode => child !== null) || [];

    return {
      ...node,
      children: filteredChildren,
    };
  };

  treeNodes.forEach((root) => {
    const filtered_root = filterNode(root);
    if (filtered_root) filtered.push(filtered_root);
  });

  return filtered;
};

/* ─── Extract Areas from Tree ─────────────────────────────– */
const extractAreas = (treeNodes: TreeNode[]): string[] => {
  const areas = new Set<string>();
  const traverse = (node: TreeNode) => {
    if (node.area) areas.add(node.area);
    node.children?.forEach(traverse);
  };
  treeNodes.forEach(traverse);
  return Array.from(areas).sort();
};

/* ─── Main Component ─────────────────────────────────────– */
const TopologyEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>(
    'all',
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState('all');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [rawTreeData, setRawTreeData] = useState<TreeNode[]>([]);

  // Fetch topology data
  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Using mock data for demo - replace with your API call
      

      const processed = processTreeData(mockData);
      setRawTreeData(processed);
      setAvailableAreas(extractAreas(processed));

      const filtered = filterTreeByArea(processed, 'all');
      const { nodes: gn, edges: ge } = buildGraphData(
        filtered.length === 1 ? filtered[0] : filtered,
      );
      setNodes(gn);
      setEdges(ge);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load topology';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  // Initial load
  useEffect(() => {
    fetchTopology();
  }, [fetchTopology]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTopology, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTopology]);

  // Update graph when area or filters change
  useEffect(() => {
    const filtered = filterTreeByArea(rawTreeData, selectedArea);
    const { nodes: gn, edges: ge } = buildGraphData(
      filtered.length === 1 ? filtered[0] : filtered,
    );
    setNodes(gn);
    setEdges(ge);
  }, [selectedArea, rawTreeData, setNodes, setEdges]);

  /* ─── Filtered nodes/edges ─── */
  const filteredNodes = useMemo(
    () =>
      nodes.filter((n) => {
        const matchSearch =
          searchTerm === '' ||
          n.data.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || n.data.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [nodes, searchTerm, filterStatus],
  );

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [edges, filteredNodes]);

  /* ─── Statistics ─── */
  const stats = useMemo(() => {
    const online = nodes.filter((n) => n.data.status === 'online').length;
    const offline = nodes.filter((n) => n.data.status === 'offline').length;
    const partial = nodes.filter((n) => n.data.status === 'partial').length;
    return { total: nodes.length, online, offline, partial };
  }, [nodes]);

  return (
    <div
      style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #060d1a 0%, #0c1829 50%, #060d1a 100%)',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Geist Sans', 'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(12px)',
          padding: '16px 24px',
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: 10,
                background: 'rgba(16,185,129,0.1)',
                border: '1.5px solid rgba(16,185,129,0.25)',
                borderRadius: 10,
                display: 'flex',
              }}
            >
              <Network size={22} style={{ color: '#6ee7b7' }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: -0.3,
                  color: '#f0f9ff',
                }}
              >
                Network Topology
              </h1>
              <p
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  margin: 0,
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                Real-time infrastructure hierarchy
              </p>
            </div>
          </div>

          {/* Stats and controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[
              {
                label: 'Total',
                val: stats.total,
                col: '#94a3b8',
                bg: 'rgba(107,114,128,0.1)',
                border: 'rgba(107,114,128,0.25)',
              },
              {
                label: 'Online',
                val: stats.online,
                col: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                border: 'rgba(16,185,129,0.25)',
              },
              {
                label: 'Partial',
                val: stats.partial,
                col: '#f59e0b',
                bg: 'rgba(245,158,11,0.08)',
                border: 'rgba(245,158,11,0.25)',
              },
              {
                label: 'Offline',
                val: stats.offline,
                col: '#ef4444',
                bg: 'rgba(239,68,68,0.08)',
                border: 'rgba(239,68,68,0.25)',
              },
            ].map(({ label, val, col, bg, border }) => (
              <div
                key={label}
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  padding: '6px 13px',
                  textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: col,
                    lineHeight: 1,
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#64748b',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginTop: 3,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}

            <button
              onClick={fetchTopology}
              disabled={loading}
              title="Refresh"
              style={{
                padding: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw
                size={16}
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              />
            </button>

            <button
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
              style={{
                padding: '6px 12px',
                background: autoRefresh ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${autoRefresh ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                color: autoRefresh ? '#10b981' : '#64748b',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s',
              }}
            >
              <Activity size={13} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#475569',
              }}
            />
            <input
              type="text"
              placeholder="Search locations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '8px 12px 8px 32px',
                fontSize: 13,
                color: '#e2e8f0',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            />
          </div>

          {/* Area selector */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: '#e2e8f0',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 160,
              transition: 'all 0.2s',
            }}
          >
            <option value="all">All Areas</option>
            {availableAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Status filters */}
          {(['all', 'online', 'partial', 'offline'] as const).map((s) => {
            const active = filterStatus === s;
            const col =
              s === 'online'
                ? '#10b981'
                : s === 'offline'
                  ? '#ef4444'
                  : s === 'partial'
                    ? '#f59e0b'
                    : '#6b7280';
            const rgb =
              s === 'online'
                ? '16,185,129'
                : s === 'offline'
                  ? '239,68,68'
                  : s === 'partial'
                    ? '245,158,11'
                    : '107,114,128';

            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 13px',
                  background: active ? `rgba(${rgb},0.1)` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? col + '44' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: active ? col : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <Filter size={12} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Error banner */}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: '10px 18px',
              maxWidth: 480,
              backdropFilter: 'blur(8px)',
            }}
          >
            <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', margin: 0 }}>
                Error
              </p>
              <p style={{ fontSize: 11, color: '#f87171', margin: 0, marginTop: 2 }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(6,13,26,0.85)',
              zIndex: 20,
              gap: 12,
              backdropFilter: 'blur(4px)',
            }}
          >
            <RefreshCw
              size={28}
              style={{ color: '#6ee7b7', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Loading topology…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && nodes.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
            }}
          >
            <AlertCircle size={32} style={{ color: '#334155' }} />
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
              No locations found
            </p>
          </div>
        )}

        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node.data.id)}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: 'transparent' }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background color="#1e293b" gap={30} size={1} />
          <Controls
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              backdropFilter: 'blur(8px)',
            }}
          />
          <MiniMap
            nodeColor={(n) => getStatus(n.data?.status).color}
            maskColor="rgba(6,13,26,0.8)"
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              backdropFilter: 'blur(8px)',
            }}
          />
        </ReactFlow>

        {/* Node detail panel */}
        {selectedNode !== null && (
          <NodeDetails nodeId={selectedNode} nodes={nodes} onClose={() => setSelectedNode(null)} />
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(15,23,42,0.85)',
          padding: '8px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#475569',
          flexShrink: 0,
          backdropFilter: 'blur(4px)',
        }}
      >
        <span>
          Showing {filteredNodes.length} / {nodes.length} locations
        </span>
        <span>{autoRefresh ? '● Live · ' : ''}Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .react-flow__controls-button { 
          background: rgba(15,23,42,0.9) !important; 
          border-color: rgba(255,255,255,0.1) !important; 
          color: #94a3b8 !important; 
        }
        .react-flow__controls-button:hover { 
          background: rgba(30,41,59,0.9) !important; 
        }
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
        }
      `}</style>
    </div>
  );
};

/* ─── Node Details Panel ─────────────────────────────────– */
interface NodeDetailsProps {
  nodeId: number;
  nodes: Node[];
  onClose: () => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ nodeId, nodes, onClose }) => {
  const node = nodes.find((n) => n.data.id === nodeId);
  if (!node) return null;

  const d = node.data as TreeNode;
  const statusConfig = getStatus(d.status);
  const health = d.health_percentage ?? 0;
  const healthColor = health >= 80 ? '#10b981' : health >= 50 ? '#f59e0b' : '#ef4444';

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{value}</div>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 16,
        width: 320,
        background: 'rgba(10,18,32,0.98)',
        border: `1px solid ${statusConfig.border}`,
        borderRadius: 14,
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: `${statusConfig.glow}, 0 24px 48px rgba(0,0,0,0.5)`,
        zIndex: 30,
        fontFamily: "'Geist Sans', 'Inter', sans-serif",
      }}
    >
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${statusConfig.color}, transparent)`,
        }}
      />

      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
          Location Details
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#64748b',
            cursor: 'pointer',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            padding: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <Row label="Name" value={d.name} />
        <Row
          label="Status"
          value={
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`,
                borderRadius: 20,
                padding: '4px 12px',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusConfig.color,
                  boxShadow: `0 0 6px ${statusConfig.color}`,
                  animation: d.status === 'online' ? 'breathe 2s ease-in-out infinite' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: statusConfig.text,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                {d.status}
              </span>
            </div>
          }
        />
        {d.project && <Row label="Project" value={d.project} />}
        {d.area && <Row label="Area" value={d.area} />}
        {d.description && (
          <Row label="Description" value={<span style={{ color: '#94a3b8' }}>{d.description}</span>} />
        )}

        {d.device_count !== undefined && (
          <Row
            label="Devices"
            value={
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                {[
                  { l: 'Total', v: d.device_count, c: '#94a3b8' },
                  { l: 'Online', v: d.online_device_count ?? 0, c: '#10b981' },
                  { l: 'Offline', v: d.offline_device_count ?? 0, c: '#ef4444' },
                ].map(({ l, v, c }) => (
                  <div
                    key={l}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '8px 6px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#475569',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginTop: 4,
                      }}
                    >
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        )}

        {d.health_percentage !== undefined && (
          <Row
            label="Health"
            value={
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: 12 }}>{health}% healthy</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: healthColor }}>
                    {health}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${health}%`,
                      background: `linear-gradient(90deg, ${healthColor}, ${healthColor}bb)`,
                      borderRadius: 99,
                      boxShadow: `0 0 10px ${healthColor}88`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            }
          />
        )}

        {d.worker_id && (
          <Row
            label="Worker ID"
            value={<span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
              {d.worker_id}
            </span>}
          />
        )}
        {d.created_at && (
          <Row
            label="Created"
            value={<span style={{ color: '#64748b', fontSize: 11 }}>
              {new Date(d.created_at).toLocaleString()}
            </span>}
          />
        )}
        {d.updated_at && (
          <Row
            label="Updated"
            value={<span style={{ color: '#64748b', fontSize: 11 }}>
              {new Date(d.updated_at).toLocaleString()}
            </span>}
          />
        )}
        {d.status_reason && <Row label="Status Reason" value={<span style={{ color: '#94a3b8', fontSize: 12 }}>{d.status_reason}</span>} />}
      </div>
    </div>
  );
};

export default TopologyEditor;