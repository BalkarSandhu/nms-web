'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { fetchAllLocationsPaginated } from '@/store/locationsSlice';

/* ─── Types ─────────────────────────────────────────────── */
interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: string;
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
  isExpanded: boolean;
}

/* ─── Status Configuration ──────────────────────────────── */
const STATUS_CONFIG = {
  online: {
    color: '#22c55e',
    glow: '0 0 20px rgba(34,197,94,0.6)',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.4)',
    text: '#bbf7d0',
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
  const s = getStatus(data.status);
  const isOffline = data.status === 'offline';
  const isOnline = data.status === 'online';
  const health = data.health_percentage ?? 0;
  const healthColor = health >= 80 ? '#22c55e' : health >= 50 ? '#f59e0b' : '#ef4444';
  const LevelIcon = data.level === 0 ? Server : data.level === 1 ? Network : Activity;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2540 100%)',
        border: `1.5px solid ${s.border}`,
        boxShadow: `${s.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
        borderRadius: 12,
        minWidth: 215,
        maxWidth: 245,
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        outline: selected ? `2px solid ${s.color}` : 'none',
        outlineOffset: 3,
        animation: isOffline ? 'pulseRed 2.2s ease-in-out infinite' : data.status === 'partial' ? 'pulseAmber 2.2s ease-in-out infinite' : 'none',
        position: 'relative',
      }}
    >
      {/* ReactFlow connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: s.color, border: `2px solid ${s.color}`, width: 10, height: 10, top: -5 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: s.color, border: `2px solid ${s.color}`, width: 10, height: 10, bottom: -5 }}
      />
      {/* Inner wrapper keeps border-radius clip without hiding handles */}
      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        {/* Top accent stripe */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color} 0%, transparent 100%)` }} />

        <div style={{ padding: '10px 13px 13px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: '3px 5px', display: 'flex', alignItems: 'center' }}>
              <LevelIcon size={13} style={{ color: s.text }} />
            </div>
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, letterSpacing: 0.2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, animation: data.status === 'online' ? 'breathe 2s ease-in-out infinite' : 'none', flexShrink: 0 }} />
          </div>

          {/* Status badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 9px', marginBottom: 10 }}>
            {data.status === 'online'
              ? <Wifi size={10} style={{ color: s.color }} />
              : data.status === 'offline'
              ? <WifiOff size={10} style={{ color: s.color }} />
              : data.status === 'partial'
              ? <Activity size={10} style={{ color: s.color }} />
              : <AlertCircle size={10} style={{ color: s.color }} />
            }
            <span style={{ fontSize: 10, fontWeight: 700, color: s.text, textTransform: 'uppercase', letterSpacing: 0.8 }}>{data.status}</span>
          </div>

          {/* Device stats */}
          {data.device_count !== undefined && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { label: 'Total', val: data.device_count, col: '#94a3b8' },
                { label: 'Online', val: data.online_device_count ?? 0, col: '#22c55e' },
                { label: 'Offline', val: data.offline_device_count ?? 0, col: '#ef4444' },
              ].map(({ label, val, col }) => (
                <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '5px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{val}</div>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Health bar */}
          {data.health_percentage !== undefined && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>HEALTH</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: healthColor }}>{health}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${health}%`, background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`, borderRadius: 99, boxShadow: `0 0 8px ${healthColor}88`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {data.description && (
            <p style={{ fontSize: 10, color: '#475569', marginTop: 8, lineHeight: 1.5 }}>{data.description}</p>
          )}
        </div>
      </div>{/* end inner wrapper */}

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes pulseRed {
          0%, 100% { background-color: rgba(239,68,68,0.1); }
          50%      { background-color: rgba(239,68,68,0.3); }
        }
        @keyframes pulseAmber {
          0%, 100% { background-color: rgba(245,158,11,0.1); }
          50%      { background-color: rgba(245,158,11,0.3); }
        }
      `}</style>
    </div>
  );
};

/* ─── Utility Functions ─────────────────────────────────── */
const buildTree = (flatLocations: Location[]): Location[] => {
  const map = new Map<number, Location>();
  flatLocations.forEach(loc => map.set(loc.id, { ...loc, children: [] }));
  const roots: Location[] = [];
  flatLocations.forEach(loc => {
    if (loc.parent_id && map.has(loc.parent_id)) {
      map.get(loc.parent_id)!.children!.push(map.get(loc.id)!);
    } else {
      roots.push(map.get(loc.id)!);
    }
  });
  return roots;
};

const processTreeData = (locs: Location[], level = 0): TreeNode[] =>
  locs.map((node) => ({
    ...node,
    children: processTreeData(node.children || [], level + 1),
    isExpanded: false,
    level,
  }));

/* ─── Build graph from tree ──────────────────────────────── */
const buildGraphData = (treeNodes: TreeNode[]): { nodes: Node[]; edges: Edge[] } => {
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
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    if (parentId) {
      const s = getStatus(node.status);
      const isOffline = node.status === 'offline';
      const isOnline = node.status === 'online';

      edges.push({
        id: `edge-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: 'smoothstep',
        style: {
          stroke: s.color,
          strokeWidth: isOffline ? 3 : isOnline ? 3 : 2,
          strokeDasharray: isOffline ? '10 6' : undefined,
          opacity: 1,
          filter: `drop-shadow(0 0 6px ${s.color})`,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: s.color,
          width: 28,
          height: 28,
        },
        animated: isOnline,
      });
    }

    if (node.children?.length) {
      const spacing = 300;
      const startX = x - ((node.children.length - 1) * spacing) / 2;
      node.children.forEach((child, i) => processNode(child, startX + i * spacing, y + 250, id));
    }
    return id;
  };

  treeNodes.forEach((root, i) => processNode(root, i * 600, 50));
  return { nodes, edges };
};

/* ─── Main Component ─────────────────────────────────────── */
const TopologyEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState('all');

  // Redux hooks
  const dispatch = useDispatch();
  const { locations, loading, error } = useSelector((state: any) => state.locations);

  // Filter flat locations by area
  const filteredLocations = useMemo(() => {
    return selectedArea === 'all' ? locations : locations.filter(loc => loc.area === selectedArea);
  }, [locations, selectedArea]);

  // Build hierarchical tree from filtered locations
  const treeData = useMemo(() => buildTree(filteredLocations), [filteredLocations]);

  // Process tree data
  const processedTree = useMemo(() => processTreeData(treeData), [treeData]);

  // Build graph data
  const graphData = useMemo(() => buildGraphData(processedTree), [processedTree]);

  // Update nodes and edges when graph data changes
  useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }, [graphData, setNodes, setEdges]);

  // Available areas
  const availableAreas = useMemo(() => {
    const allAreas = new Set<string>();
    locations.forEach(loc => allAreas.add(loc.area));
    return Array.from(allAreas).sort();
  }, [locations]);

  // Fetch locations on mount
  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  // Filtered nodes for search and status
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const data = node.data as TreeNode;
      const matchesSearch = data.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || data.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [nodes, searchTerm, filterStatus]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [edges, filteredNodes]);

  // Statistics
  const stats = useMemo(() => {
    const online = filteredNodes.filter((n) => (n.data as TreeNode).status === 'online').length;
    const offline = filteredNodes.filter((n) => (n.data as TreeNode).status === 'offline').length;
    const partial = filteredNodes.filter((n) => (n.data as TreeNode).status === 'partial').length;
    return { total: filteredNodes.length, online, offline, partial };
  }, [filteredNodes]);

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
      {/* Header */}
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
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Network Topology</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'total', label: 'Total', val: stats.total, col: '#94a3b8' },
                { key: 'online', label: 'Online', val: stats.online, col: '#22c55e' },
                { key: 'offline', label: 'Offline', val: stats.offline, col: '#ef4444' },
                { key: 'partial', label: 'Partial', val: stats.partial, col: '#f59e0b' },
              ].map(({ key, label, val, col }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: col }}>{val}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Area selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                  minWidth: 120,
                }}
              >
                <option value="all">All Areas</option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: '#64748b' }} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                }}
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="partial">Partial</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '6px 12px 6px 36px',
                  color: '#e2e8f0',
                  fontSize: 13,
                  width: 200,
                }}
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => dispatch(fetchLocations())}
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
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Loading */}
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
            <RefreshCw size={24} style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Loading topology…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '12px 16px',
              zIndex: 20,
              maxWidth: 400,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} style={{ color: '#ef4444' }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', margin: 0 }}>Error</p>
                <p style={{ fontSize: 11, color: '#f87171', margin: 0, marginTop: 2 }}>{error}</p>
              </div>
            </div>
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
            <Network size={48} style={{ color: '#64748b' }} />
            <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>No locations found</p>
            <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Try adjusting your filters or refresh the data.</p>
          </div>
        )}

        {/* React Flow */}
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ locationNode: LocationNode }}
          fitView
          attributionPosition="bottom-left"
          style={{ background: 'transparent' }}
        >
          <Background color="#334155" gap={20} />
          <Controls style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <MiniMap
            style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
            nodeColor={(node) => getStatus((node.data as TreeNode).status).color}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default TopologyEditor;