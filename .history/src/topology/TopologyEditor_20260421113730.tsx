'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getAuthHeaders } from '@/lib/auth';

/* ─── Types ─────────────────────────────────────────────── */
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
  isExpanded: boolean;
  level: number;
}

/* ─── Status config ──────────────────────────────────────── */
const STATUS = {
  online: {
    color: '#22c55e',
    glow: '0 0 18px rgba(34,197,94,0.45)',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.35)',
    text: '#86efac',
  },
  offline: {
    color: '#ef4444',
    glow: '0 0 18px rgba(239,68,68,0.55)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.45)',
    text: '#fca5a5',
  },
  partial: {
    color: '#f59e0b',
    glow: '0 0 18px rgba(245,158,11,0.40)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.35)',
    text: '#fcd34d',
  },
  unknown: {
    color: '#64748b',
    glow: 'none',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.25)',
    text: '#94a3b8',
  },
};

const getStatus = (status: string) =>
  STATUS[status as keyof typeof STATUS] ?? STATUS.unknown;

/* ─── Custom Node Component ──────────────────────────────── */
const LocationNode = ({ data, selected }: { data: TreeNode; selected?: boolean }) => {
  const s = getStatus(data.status);
  const isOffline = data.status === 'offline';
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
          0%, 100% { box-shadow: 0 0 18px rgba(239,68,68,0.55), inset 0 1px 0 rgba(255,255,255,0.04); }
          50%       { box-shadow: 0 0 32px rgba(239,68,68,0.85), inset 0 1px 0 rgba(255,255,255,0.04); }
        }
        @keyframes pulseAmber {
          0%, 100% { box-shadow: 0 0 18px rgba(245,158,11,0.40), inset 0 1px 0 rgba(255,255,255,0.04); }
          50%       { box-shadow: 0 0 28px rgba(245,158,11,0.70), inset 0 1px 0 rgba(255,255,255,0.04); }
        }
      `}</style>
    </div>
  );
};

const nodeTypes = { locationNode: LocationNode };

/* ─── Build graph from tree ──────────────────────────────── */
const buildGraphData = (treeNodes: TreeNode[] | TreeNode): { nodes: Node[]; edges: Edge[] } => {
  console.log('\n🎨 [buildGraphData] Starting');
  console.log('  Input type:', Array.isArray(treeNodes) ? 'array' : 'single node');
  console.log('  Input:', treeNodes);

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeCount = 0;
  let edgeCount = 0;

  const processNode = (node: TreeNode, x: number, y: number, parentId?: string): string => {
    nodeCount++;
    const id = `node-${node.id}`;
    console.log(`  [processNode] Creating node ${nodeCount}: "${node.name}" (id: ${id}, x: ${x}, y: ${y})`);
    
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
      edgeCount++;
      const s = getStatus(node.status);
      const isOffline = node.status === 'offline';
      const isOnline = node.status === 'online';

      console.log(`  [processNode] Creating edge from ${parentId} to ${id}`);
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
      const spacing = 290;
      const startX = x - ((node.children.length - 1) * spacing) / 2;
      console.log(`  [processNode] "${node.name}" has ${node.children.length} children, spacing: ${spacing}`);
      node.children.forEach((child, i) => {
        console.log(`    Processing child ${i + 1}/${node.children.length}`);
        processNode(child, startX + i * spacing, y + 270, id);
      });
    }
    return id;
  };

  console.log('  [buildGraphData] Processing tree structure...');
  if (Array.isArray(treeNodes)) {
    console.log(`  [buildGraphData] Input is array with ${treeNodes.length} roots`);
    treeNodes.forEach((root, i) => {
      console.log(`\n  Processing root ${i + 1}/${treeNodes.length}: "${root.name}"`);
      processNode(root, i * 620, 50);
    });
  } else {
    console.log('  [buildGraphData] Input is single node');
    processNode(treeNodes, 0, 0);
  }

  console.log(`\n✅ [buildGraphData] Complete:`);
  console.log(`  - Total nodes created: ${nodeCount}`);
  console.log(`  - Total edges created: ${edgeCount}`);
  console.log(`  - Nodes array length: ${nodes.length}`);
  console.log(`  - Edges array length: ${edges.length}`);
  console.log('  Nodes:', nodes.map(n => ({ id: n.id, name: n.data.name, pos: n.position })));
  console.log('  Edges:', edges.map(e => ({ source: e.source, target: e.target })));

  return { nodes, edges };
};

/* ─── Main Component ─────────────────────────────────────── */
const TopologyEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'partial'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number>();
  const [viewMode, setViewMode] = useState<'tree' | 'subtree'>('subtree');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  const extractAreas = (treeNodes: TreeNode[]): string[] => {
    const areas = new Set<string>();
    const traverse = (node: TreeNode) => {
      if (node.area) areas.add(node.area);
      node.children?.forEach(traverse);
    };
    treeNodes.forEach(traverse);
    return Array.from(areas).sort();
  };

  /**
   * FIXED: filterTreeByArea now properly filters the tree by area
   * It recursively includes nodes whose area matches AND preserves hierarchy
   */
  const filterTreeByArea = (treeNodes: TreeNode[], area: string): TreeNode[] => {
    console.log('🔍 [filterTreeByArea] Starting filter', { area, inputNodes: treeNodes.length });
    
    if (area === 'all') {
      console.log('✅ [filterTreeByArea] Area is "all", returning unfiltered tree');
      return treeNodes;
    }

    const filtered: TreeNode[] = [];
    let matchedNodesCount = 0;
    let includedNodesCount = 0;

    const filterNode = (node: TreeNode, depth = 0): TreeNode | null => {
      const indent = '  '.repeat(depth);
      const matchesArea = node.area === area;
      
      if (matchesArea) {
        matchedNodesCount++;
        console.log(`${indent}📍 [filterNode] MATCH: "${node.name}" (id: ${node.id}, area: ${node.area})`);
      }
      
      // Recursively filter children
      const filteredChildren = (node.children || [])
        .map(child => filterNode(child, depth + 1))
        .filter((child): child is TreeNode => child !== null);

      // IMPORTANT: Include node if:
      // 1. Its area matches the selected area, AND/OR
      // 2. It has children that match (to preserve the hierarchy)
      if (matchesArea) {
        includedNodesCount++;
        console.log(`${indent}✓ [filterNode] INCLUDE (matches area): "${node.name}" with ${filteredChildren.length} children`);
        return {
          ...node,
          children: filteredChildren,
        };
      } else if (filteredChildren.length > 0) {
        includedNodesCount++;
        console.log(`${indent}✓ [filterNode] INCLUDE (has matching children): "${node.name}" with ${filteredChildren.length} children`);
        return {
          ...node,
          children: filteredChildren,
        };
      }

      if (!matchesArea) {
        console.log(`${indent}✗ [filterNode] EXCLUDE: "${node.name}" (area: ${node.area})`);
      }
      return null;
    };

    console.log(`📊 [filterTreeByArea] Processing ${treeNodes.length} root nodes`);
    treeNodes.forEach((root, idx) => {
      console.log(`\n--- Processing Root ${idx + 1}: "${root.name}" ---`);
      const filtered_root = filterNode(root, 0);
      if (filtered_root) {
        filtered.push(filtered_root);
        console.log(`✅ Root "${root.name}" included in filtered result`);
      } else {
        console.log(`❌ Root "${root.name}" EXCLUDED from filtered result`);
      }
    });

    console.log(
      `\n📈 [filterTreeByArea] Filter complete:`,
      { area, matchedNodes: matchedNodesCount, includedNodes: includedNodesCount, resultRoots: filtered.length }
    );
    console.log('🌳 [filterTreeByArea] Filtered tree:', filtered);

    return filtered;
  };

  const processTreeData = (locs: Location[], level = 0): TreeNode[] =>
    locs.map((node) => ({
      ...node,
      children: processTreeData(node.children || [], level + 1),
      isExpanded: false,
      level,
    }));

  /**
   * FIXED: Use the /locations/tree endpoint directly as it returns the full tree structure
   * The tree already has area information on each node
   */
  const fetchTopology = useCallback(async () => {
    try {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🚀 [fetchTopology] Starting fetch');
      console.log({ viewMode, locationId, selectedArea });
      setLoading(true);
      setError(null);

      let treeData: TreeNode[];
      let data: any;

      if (viewMode === 'subtree' && locationId) {
        // Subtree mode: use the subtree endpoint
        console.log(`📍 [fetchTopology] Subtree mode for location ${locationId}`);
        const url = `${import.meta.env.VITE_NMS_HOST}/locations/${locationId}/subtree`;
        console.log(`🌐 [fetchTopology] Fetching: ${url}`);
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);

        data = await response.json();
        console.log('📦 [fetchTopology] API Response:', data);
        const treeData_raw = data.tree || data;
        treeData = Array.isArray(treeData_raw)
          ? processTreeData(treeData_raw)
          : processTreeData([treeData_raw]);
        console.log(`✅ [fetchTopology] Processed tree: ${treeData.length} roots`);
      } else {
        // Full tree mode: use /locations/tree endpoint
        console.log('🌍 [fetchTopology] Full tree mode');
        const url = `${import.meta.env.VITE_NMS_HOST}/locations/tree`;
        console.log(`🌐 [fetchTopology] Fetching: ${url}`);
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);

        data = await response.json();
        console.log('📦 [fetchTopology] API Response received', {
          count: data.count,
          treeRoots: data.tree?.length || 0,
          firstRootName: data.tree?.[0]?.name,
          firstRootArea: data.tree?.[0]?.area,
        });
        
        const treeData_raw = data.tree || data;
        treeData = Array.isArray(treeData_raw)
          ? processTreeData(treeData_raw)
          : processTreeData([treeData_raw]);
        console.log(`✅ [fetchTopology] Processed tree: ${treeData.length} roots`);
        
        // Log details of first root
        if (treeData.length > 0) {
          console.log('📌 [fetchTopology] First root details:', {
            id: treeData[0].id,
            name: treeData[0].name,
            area: treeData[0].area,
            children: treeData[0].children?.length || 0,
          });
        }
      }

      // Log raw tree structure for debugging
      console.log('🌳 [fetchTopology] Raw processed tree structure:');
      treeData.forEach((root, idx) => {
        console.log(`  Root ${idx}: "${root.name}" (area: "${root.area}", children: ${root.children?.length || 0})`);
        root.children?.forEach((child, cidx) => {
          console.log(`    └─ Child ${cidx}: "${child.name}" (area: "${child.area}", children: ${child.children?.length || 0})`);
        });
      });

      // Extract and log available areas
      const areas = extractAreas(treeData);
      console.log('📍 [fetchTopology] Available areas:', areas);
      console.log(`  Total unique areas: ${areas.length}`);
      setAvailableAreas(areas);

      // Log current filter selection
      console.log(`\n🔎 [fetchTopology] Current filter selection:`, { selectedArea });
      console.log(`  Selected area exists in list: ${areas.includes(selectedArea)}`);

      // Apply filtering
      console.log(`\n⚙️  [fetchTopology] Calling filterTreeByArea with selectedArea="${selectedArea}"`);
      const filtered = filterTreeByArea(treeData, selectedArea);
      
      console.log(`\n📊 [fetchTopology] After filtering:`);
      console.log(`  - Original tree roots: ${treeData.length}`);
      console.log(`  - Filtered tree roots: ${filtered.length}`);
      console.log(`  - Selected area: "${selectedArea}"`);
      
      if (filtered.length === 0) {
        console.warn('⚠️  WARNING: Filtered result is empty!');
        console.log('  Debugging info:');
        console.log('    - Available areas:', areas);
        console.log('    - Selected area:', selectedArea);
        console.log('    - selectedArea in areas?', areas.includes(selectedArea));
      } else {
        console.log('✅ Filtered result has data');
      }

      // Log the filtered tree structure
      console.log('🌳 [fetchTopology] Filtered tree structure:');
      filtered.forEach((root, idx) => {
        console.log(`  Root ${idx}: "${root.name}" (area: "${root.area}", children: ${root.children?.length || 0})`);
        root.children?.forEach((child, cidx) => {
          console.log(`    └─ Child ${cidx}: "${child.name}" (area: "${child.area}", children: ${child.children?.length || 0})`);
        });
      });

      // Build graph data
      console.log(`\n🎨 [fetchTopology] Building graph from ${filtered.length} roots`);
      const graphInput = filtered.length === 1 ? filtered[0] : filtered;
      console.log('  Graph input type:', Array.isArray(graphInput) ? 'array' : 'single node');
      const { nodes: gn, edges: ge } = buildGraphData(graphInput);
      
      console.log(`\n📈 [fetchTopology] Graph built successfully:`);
      console.log(`  - Nodes: ${gn.length}`);
      console.log(`  - Edges: ${ge.length}`);
      if (gn.length > 0) {
        console.log('  Nodes list:', gn.map(n => ({ id: n.id, name: n.data.name, level: n.data.level })));
      }
      if (ge.length > 0) {
        console.log('  Edges list:', ge.map(e => ({ source: e.source, target: e.target })));
      }

      console.log(`\n📲 [fetchTopology] Setting React state:`);
      console.log(`  - setNodes(${gn.length} nodes)`);
      console.log(`  - setEdges(${ge.length} edges)`);
      console.log('Node details for React Flow:', gn.map(n => ({
        id: n.id,
        name: n.data.name,
        position: n.position,
        type: n.type,
      })));
      
      setNodes(gn);
      setEdges(ge);
      
      console.log('✅ [fetchTopology] Complete! UI Updated');
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load topology';
      console.error('❌ [fetchTopology] ERROR:', msg);
      console.error('Full error object:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [viewMode, locationId, selectedArea]);

  useEffect(() => { fetchTopology(); }, [fetchTopology]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTopology, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTopology]);

  /* ─── Filtered nodes/edges ─── */
  const filteredNodes = useMemo(
    () =>
      nodes.filter((n) => {
        const matchSearch = searchTerm === '' || n.data.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || n.data.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [nodes, searchTerm, filterStatus],
  );

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [edges, filteredNodes]);

  /* ─── Stats ─── */
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
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15,23,42,0.70)',
          backdropFilter: 'blur(12px)',
          padding: '14px 24px',
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 9, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, display: 'flex' }}>
              <Network size={22} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Network Topology</h1>
              <p style={{ fontSize: 11, color: '#475569', margin: 0, marginTop: 2 }}>Real-time infrastructure hierarchy</p>
            </div>
          </div>

          {/* Stat pills + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[
              { label: 'Total',   val: stats.total,   col: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
              { label: 'Online',  val: stats.online,  col: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.28)'   },
              { label: 'Partial', val: stats.partial, col: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.28)'  },
              { label: 'Offline', val: stats.offline, col: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.28)'   },
            ].map(({ label, val, col, bg, border }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '5px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: col }}>{val}</div>
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
              </div>
            ))}

            <button
              onClick={fetchTopology}
              disabled={loading}
              title="Refresh"
              style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', color: '#94a3b8', display: 'flex', opacity: loading ? 0.5 : 1, transition: 'all 0.2s' }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            <button
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
              style={{ padding: '6px 12px', background: autoRefresh ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${autoRefresh ? 'rgba(34,197,94,0.30)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, cursor: 'pointer', color: autoRefresh ? '#22c55e' : '#64748b', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s' }}
            >
              <Activity size={13} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="text"
              placeholder="Search locations…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 12px 7px 32px', fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Area selector */}
          <select
            value={selectedArea}
            onChange={(e) => {
              const newArea = e.target.value;
              console.log(`\n🎯 [Area Selector] User changed area:`, { from: selectedArea, to: newArea });
              setSelectedArea(newArea);
            }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#e2e8f0', cursor: 'pointer', outline: 'none', minWidth: 140 }}
          >
            <option value="all">All Areas</option>
            {availableAreas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Status filter pills */}
          {(['all', 'online', 'partial', 'offline'] as const).map((s) => {
            const active = filterStatus === s;
            const col = s === 'online' ? '#22c55e' : s === 'offline' ? '#ef4444' : s === 'partial' ? '#f59e0b' : '#60a5fa';
            const rgb = s === 'online' ? '34,197,94' : s === 'offline' ? '239,68,68' : s === 'partial' ? '245,158,11' : '96,165,250';
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: active ? `rgba(${rgb},0.12)` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? col + '55' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, cursor: 'pointer', color: active ? col : '#64748b', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}
              >
                <Filter size={12} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}

          {/* View mode */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['subtree', 'tree'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{ padding: '5px 12px', background: viewMode === mode ? 'rgba(96,165,250,0.18)' : 'transparent', border: viewMode === mode ? '1px solid rgba(96,165,250,0.35)' : '1px solid transparent', borderRadius: 6, cursor: 'pointer', color: viewMode === mode ? '#93c5fd' : '#64748b', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}
              >
                {mode === 'subtree' ? `Location ${locationId}` : 'Full Tree'}
              </button>
            ))}
          </div>

          {/* Location ID */}
          {viewMode === 'subtree' && (
            <input
              type="number"
              value={locationId}
              onChange={(e) => setLocationId(parseInt(e.target.value) || 36)}
              placeholder="ID"
              style={{ width: 72, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#e2e8f0', outline: 'none', textAlign: 'center' }}
            />
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Error banner */}
        {error && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, padding: '10px 18px', maxWidth: 480, whiteSpace: 'nowrap' }}>
            <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5', margin: 0 }}>API Error</p>
              <p style={{ fontSize: 11, color: '#f87171', margin: 0, marginTop: 2 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,13,26,0.75)', zIndex: 20, gap: 12 }}>
            <RefreshCw size={28} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Loading topology…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && nodes.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
            <AlertCircle size={32} style={{ color: '#334155' }} />
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>No locations returned by API</p>
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
          defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
        >
          <Background color="#1e293b" gap={28} size={1} />
          <Controls style={{ background: 'rgba(15,23,42,0.80)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }} />
          <MiniMap
            nodeColor={(n) => getStatus(n.data?.status).color}
            maskColor="rgba(6,13,26,0.75)"
            style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}
          />
        </ReactFlow>

        {/* Node detail panel */}
        {selectedNode !== null && (
          <NodeDetails nodeId={selectedNode} nodes={nodes} onClose={() => setSelectedNode(null)} />
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,23,42,0.70)', padding: '6px 24px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#334155', flexShrink: 0 }}>
        <span>Showing {filteredNodes.length} / {nodes.length} locations</span>
        <span>{autoRefresh ? '⬤ Live · ' : ''}Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .react-flow__controls-button { background: rgba(15,23,42,0.9) !important; border-color: rgba(255,255,255,0.08) !important; color: #94a3b8 !important; }
        .react-flow__controls-button:hover { background: rgba(30,41,59,0.9) !important; }
      `}</style>
    </div>
  );
};

/* ─── Node Details Panel ─────────────────────────────────── */
interface NodeDetailsProps {
  nodeId: number;
  nodes: Node[];
  onClose: () => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ nodeId, nodes, onClose }) => {
  const node = nodes.find((n) => n.data.id === nodeId);
  if (!node) return null;
  const d = node.data as TreeNode;
  const s = getStatus(d.status);
  const health = d.health_percentage ?? 0;
  const healthColor = health >= 80 ? '#22c55e' : health >= 50 ? '#f59e0b' : '#ef4444';

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e2e8f0' }}>{value}</div>
    </div>
  );

  return (
    <div
      style={{ position: 'absolute', top: 16, right: 16, bottom: 16, width: 300, background: 'rgba(10,18,32,0.96)', border: `1px solid ${s.border}`, borderRadius: 14, backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `${s.glow}, 0 24px 48px rgba(0,0,0,0.6)`, zIndex: 30, fontFamily: "'DM Sans', 'Inter', sans-serif" }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />

      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Location Details</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#64748b', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <Row label="Name" value={d.name} />
        <Row
          label="Status"
          value={
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 10px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, boxShadow: `0 0 5px ${s.color}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: s.text, textTransform: 'uppercase', letterSpacing: 0.8 }}>{d.status}</span>
            </div>
          }
        />
        {d.project && <Row label="Project" value={d.project} />}
        {d.area && <Row label="Area" value={d.area} />}
        {d.description && <Row label="Description" value={<span style={{ color: '#94a3b8', lineHeight: 1.6 }}>{d.description}</span>} />}

        {d.device_count !== undefined && (
          <Row label="Devices" value={
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {[
                { l: 'Total', v: d.device_count, c: '#94a3b8' },
                { l: 'Online', v: d.online_device_count ?? 0, c: '#22c55e' },
                { l: 'Offline', v: d.offline_device_count ?? 0, c: '#ef4444' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
                  <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
                </div>
              ))}
            </div>
          } />
        )}

        {d.health_percentage !== undefined && (
          <Row label="Health" value={
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>{health}% healthy</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: healthColor }}>{health}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${health}%`, background: `linear-gradient(90deg, ${healthColor}, ${healthColor}bb)`, borderRadius: 99, boxShadow: `0 0 10px ${healthColor}88`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          } />
        )}

        {d.worker_id && <Row label="Worker ID" value={<span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{d.worker_id}</span>} />}
        {d.created_at && <Row label="Created" value={<span style={{ color: '#64748b', fontSize: 12 }}>{new Date(d.created_at).toLocaleString()}</span>} />}
        {d.updated_at && <Row label="Updated" value={<span style={{ color: '#64748b', fontSize: 12 }}>{new Date(d.updated_at).toLocaleString()}</span>} />}
        {d.status_reason && <Row label="Status Reason" value={<span style={{ color: '#94a3b8' }}>{d.status_reason}</span>} />}
      </div>
    </div>
  );
};

export default TopologyEditor;