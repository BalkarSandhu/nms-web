'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Circle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Home,
  Activity,
  Server,
  Network,
} from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getAuthHeaders } from '@/lib/auth';

interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  status: 'online' | 'offline' | 'unknown';
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

// Custom Node Component
const LocationNode = ({ data }: { data: TreeNode }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-emerald-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'offline':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 min-w-[200px] shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Circle
          size={10}
          className={`fill-current ${getStatusColor(data.status)}`}
        />
        <div className="text-slate-400">
          {data.level === 0 && <Server size={16} />}
          {data.level === 1 && <Network size={16} />}
          {data.level > 1 && <Activity size={16} />}
        </div>
        <h3 className="text-sm font-medium text-slate-200 truncate flex-1">
          {data.name}
        </h3>
      </div>

      {data.description && (
        <p className="text-xs text-slate-400 mb-2 truncate">
          {data.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        {data.device_count !== undefined && (
          <div
            className={`text-xs font-medium px-2 py-1 rounded-md border ${getStatusBgColor(data.status)}`}
          >
            {data.online_device_count}/{data.device_count}
          </div>
        )}

        {data.health_percentage !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  data.health_percentage >= 80
                    ? 'bg-emerald-500'
                    : data.health_percentage >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${data.health_percentage}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">
              {data.health_percentage}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  locationNode: LocationNode,
};

const TopologyEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Convert tree data to React Flow nodes and edges
  const buildGraphData = (treeNodes: TreeNode[]): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;

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
        edges.push({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
        });
      }

      // Position children
      if (node.children && node.children.length > 0) {
        const childSpacing = 250; // Horizontal spacing between siblings
        const startX = x - ((node.children.length - 1) * childSpacing) / 2;
        node.children.forEach((child, index) => {
          const childX = startX + index * childSpacing;
          const childY = y + 150; // Vertical spacing
          processNode(child, childX, childY, id);
        });
      }

      return id;
    };

    // Process root nodes
    treeNodes.forEach((rootNode, index) => {
      const rootX = index * 400; // Spacing between root nodes
      const rootY = 50;
      processNode(rootNode, rootX, rootY);
    });

    return { nodes, edges };
  };

  // Fetch topology tree from API
  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations/tree`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      const processedTree = processTreeData(data.tree || []);
      const { nodes: graphNodes, edges: graphEdges } = buildGraphData(processedTree);
      setNodes(graphNodes);
      setEdges(graphEdges);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load topology';
      setError(errorMsg);
      console.error('Error fetching topology:', err);
      // Show mock data on error for demo
      const mockData = generateMockTopology();
      const { nodes: graphNodes, edges: graphEdges } = buildGraphData(mockData);
      setNodes(graphNodes);
      setEdges(graphEdges);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTopology();
  }, [fetchTopology]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTopology();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchTopology]);

  // Process tree data from API
  const processTreeData = (nodes: Location[], level: number = 0): TreeNode[] => {
    return nodes.map((node) => ({
      ...node,
      children: processTreeData(node.children || [], level + 1),
      isExpanded: false,
      level,
    }));
  };

  // Generate mock data for demo/fallback
  const generateMockTopology = (): TreeNode[] => {
    const mockLocations: Location[] = [
      {
        id: 1,
        name: 'Data Center - Delhi',
        parent_id: null,
        status: 'online',
        project: 'Infrastructure',
        area: 'North India',
        device_count: 45,
        online_device_count: 44,
        offline_device_count: 1,
        health_percentage: 97,
        children: [
          {
            id: 2,
            name: 'Server Room A',
            parent_id: 1,
            status: 'online',
            project: 'Infrastructure',
            area: 'North India',
            device_count: 20,
            online_device_count: 20,
            offline_device_count: 0,
            health_percentage: 100,
            children: [
              {
                id: 5,
                name: 'Rack 01',
                parent_id: 2,
                status: 'online',
                project: 'Infrastructure',
                area: 'North India',
                device_count: 8,
                online_device_count: 8,
                offline_device_count: 0,
                health_percentage: 100,
              },
              {
                id: 6,
                name: 'Rack 02',
                parent_id: 2,
                status: 'online',
                project: 'Infrastructure',
                area: 'North India',
                device_count: 12,
                online_device_count: 11,
                offline_device_count: 1,
                health_percentage: 92,
              },
            ],
          },
          {
            id: 3,
            name: 'Server Room B',
            parent_id: 1,
            status: 'offline',
            project: 'Infrastructure',
            area: 'North India',
            device_count: 25,
            online_device_count: 15,
            offline_device_count: 10,
            health_percentage: 60,
            children: [
              {
                id: 7,
                name: 'Rack 03',
                parent_id: 3,
                status: 'offline',
                project: 'Infrastructure',
                area: 'North India',
                device_count: 10,
                online_device_count: 5,
                offline_device_count: 5,
                health_percentage: 50,
              },
            ],
          },
        ],
      },
      {
        id: 4,
        name: 'Data Center - Mumbai',
        parent_id: null,
        status: 'online',
        project: 'Infrastructure',
        area: 'West India',
        device_count: 32,
        online_device_count: 32,
        offline_device_count: 0,
        health_percentage: 100,
        children: [
          {
            id: 8,
            name: 'Server Room C',
            parent_id: 4,
            status: 'online',
            project: 'Infrastructure',
            area: 'West India',
            device_count: 32,
            online_device_count: 32,
            offline_device_count: 0,
            health_percentage: 100,
          },
        ],
      },
    ];

    return processTreeData(mockLocations);
  };

  // Toggle node expansion
  const toggleExpanded = useCallback((nodeId: number) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Filter and search nodes
  const filteredTree = useMemo(() => {
    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch =
        searchTerm === '' ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || node.status === filterStatus;

      const children = node.children
        .map((child) => filterNode(child))
        .filter((child): child is TreeNode => child !== null);

      if (matchesSearch && matchesStatus) {
        return {
          ...node,
          children,
          isExpanded: true,
        };
      }

      return children.length > 0
        ? {
            ...node,
            children,
            isExpanded: true,
          }
        : null;
    };

    return treeData
      .map((node) => filterNode(node))
      .filter((node): node is TreeNode => node !== null);
  }, [treeData, searchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-emerald-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'offline':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const renderTreeNode = (node: TreeNode, isRoot = false) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            group flex items-center gap-2 px-3 py-2.5 rounded-lg 
            transition-all duration-200 cursor-pointer
            ${
              isSelected
                ? 'bg-blue-500/15 border border-blue-500/30'
                : 'hover:bg-slate-700/40 border border-transparent'
            }
            ${!isRoot ? 'ml-4' : ''}
          `}
          onClick={() => setSelectedNode(node.id)}
          onDoubleClick={() => hasChildren && toggleExpanded(node.id)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="flex items-center justify-center w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Status Indicator */}
          <div className="flex-shrink-0">
            <Circle
              size={10}
              className={`fill-current ${getStatusColor(node.status)}`}
            />
          </div>

          {/* Node Icon */}
          <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-300">
            {node.level === 0 && <Server size={16} />}
            {node.level === 1 && <Network size={16} />}
            {node.level > 1 && <Activity size={16} />}
          </div>

          {/* Node Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {node.name}
            </p>
            {node.description && (
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {node.description}
              </p>
            )}
          </div>

          {/* Health Badge */}
          {node.device_count !== undefined && (
            <div
              className={`
                flex-shrink-0 text-xs font-medium px-2 py-1 rounded-md
                border ${getStatusBgColor(node.status)}
              `}
            >
              {node.online_device_count}/{node.device_count}
            </div>
          )}

          {/* Health Percentage */}
          {node.health_percentage !== undefined && (
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    node.health_percentage >= 80
                      ? 'bg-emerald-500'
                      : node.health_percentage >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${node.health_percentage}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">
                {node.health_percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700/50" />
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Network className="text-blue-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Network Topology</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time infrastructure hierarchy visualization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTopology()}
                disabled={loading}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 group"
                title="Refresh topology"
              >
                <RefreshCw
                  size={18}
                  className={`${loading ? 'animate-spin' : ''} group-hover:text-blue-400`}
                />
              </button>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'hover:bg-slate-700/50'
                }`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                <Activity size={18} />
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-700/30 border border-slate-600/50 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div className="flex gap-2">
              {(['all', 'online', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${
                      filterStatus === status
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                        : 'bg-slate-700/30 border border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
                    <Filter size={14} />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Tree View */}
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-yellow-300">
                  Using demo data
                </p>
                <p className="text-xs text-yellow-200/70 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="p-4 max-w-7xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="animate-spin text-blue-400 mb-3" size={32} />
                <p className="text-slate-400">Loading topology...</p>
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="text-slate-500 mb-3" size={32} />
                <p className="text-slate-400">No locations found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTree.map((node) => renderTreeNode(node, true))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Node Details */}
        {selectedNode && (
          <div className="w-80 border-l border-slate-700/50 bg-slate-800/20 backdrop-blur-sm overflow-auto">
            <NodeDetails
              nodeId={selectedNode}
              treeData={treeData}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 px-4 py-2 text-xs text-slate-500 flex justify-between">
        <span>Total Locations: {treeData.length}</span>
        <span>
          {autoRefresh && 'Auto-refresh enabled • '}Last updated:{' '}
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

// Node Details Sidebar Component
interface NodeDetailsProps {
  nodeId: number;
  treeData: TreeNode[];
  onClose: () => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ nodeId, treeData, onClose }) => {
  const findNode = (nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      const found = findNode(node.children);
      if (found) return found;
    }
    return null;
  };

  const node = findNode(treeData);

  if (!node) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Location Details</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase">
            Name
          </label>
          <p className="text-sm text-slate-100 mt-1.5">{node.name}</p>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase">
            Status
          </label>
          <div className="flex items-center gap-2 mt-1.5">
            <Circle
              size={10}
              className={`fill-current ${
                node.status === 'online'
                  ? 'text-emerald-500'
                  : node.status === 'offline'
                    ? 'text-red-500'
                    : 'text-slate-400'
              }`}
            />
            <span className="text-sm capitalize text-slate-100">
              {node.status}
            </span>
          </div>
        </div>

        {/* Project & Area */}
        {node.project && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase">
              Project
            </label>
            <p className="text-sm text-slate-100 mt-1.5">{node.project}</p>
          </div>
        )}

        {node.area && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase">
              Area
            </label>
            <p className="text-sm text-slate-100 mt-1.5">{node.area}</p>
          </div>
        )}

        {/* Devices */}
        {node.device_count !== undefined && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase">
              Devices
            </label>
            <div className="mt-1.5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total</span>
                <span className="font-medium text-slate-100">
                  {node.device_count}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Online</span>
                <span className="font-medium text-emerald-100">
                  {node.online_device_count}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-400">Offline</span>
                <span className="font-medium text-red-100">
                  {node.offline_device_count}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Health */}
        {node.health_percentage !== undefined && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase">
              Health
            </label>
            <div className="mt-1.5 space-y-2">
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    node.health_percentage >= 80
                      ? 'bg-emerald-500'
                      : node.health_percentage >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${node.health_percentage}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-slate-100">
                {node.health_percentage}%
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        {node.description && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase">
              Description
            </label>
            <p className="text-sm text-slate-300 mt-1.5">{node.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopologyEditor;