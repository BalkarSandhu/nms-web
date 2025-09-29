"use client";
import React, { useState } from 'react';

interface Location {
  location_id: number;
  name: string;
  previous_node: number | null;
}

interface NodeProps {
  location: Location;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: (location: Location) => void;
  level: number;
}

const TreeNode: React.FC<NodeProps> = ({ location, x, y, isSelected, onClick, level }) => {
  const getNodeColor = () => {
    // if (level === 0) return 'from-purple-500 to-pink-500';
    // if (level === 1) return 'from-blue-500 to-cyan-500';
    // if (level === 2) return 'from-green-500 to-emerald-500';
    return 'from-green-500 to-red-300';
  };

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 ${
        isSelected ? 'z-20 scale-110' : 'z-10'
      }`}
      style={{ left: x, top: y }}
      onClick={() => onClick(location)}
    >
      <div className={`
        bg-gradient-to-br ${getNodeColor()} rounded-xl shadow-2xl p-4 min-w-32 text-center
        border-2 ${isSelected ? 'border-white ring-4 ring-blue-300' : 'border-white/50'}
        backdrop-blur-sm
      `}>
        <div className="font-bold text-white text-sm drop-shadow-lg">
          {location.name}
        </div>
        <div className="text-xs text-white/80 mt-1 font-medium">
          ID: {location.location_id}
        </div>
      </div>
    </div>
  );
};

interface TreeGraphProps {
  locations: Location[];
}

const TreeGraph: React.FC<TreeGraphProps> = ({ locations }) => {
  const [selectedNode, setSelectedNode] = useState<Location | null>(null);

  if (!locations || locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No location data available</div>
      </div>
    );
  }

  const findRootNode = () => {
    return locations.find(loc => loc.previous_node === null);
  };

  const findChildren = (parentId: number) => {
    return locations.filter(loc => loc.previous_node === parentId);
  };

  const buildTreeStructure = () => {
    const root = findRootNode();
    if (!root) return { nodes: [], paths: [] };

    const nodes: any[] = [];
    const paths: any[] = [];

    nodes.push({ location: root, x: 750, y: 100, level: 0 });

    const processLevel = (parentNodes: any[], level: number) => {
      const nextLevelNodes: any[] = [];
      
      parentNodes.forEach((parentNode) => {
        const children = findChildren(parentNode.location.location_id);
        
        if (children.length === 0) return;

        const spacing = 150;
        const groupSize = level === 1 ? 2 : 3; // Group 2-3 children per branch
        const groups = [];
        
        // Split children into groups
        for (let i = 0; i < children.length; i += groupSize) {
          groups.push(children.slice(i, i + groupSize));
        }

        const totalGroups = groups.length;
        const groupSpacing = 250;
        const totalWidth = (totalGroups - 1) * groupSpacing;
        const startGroupX = parentNode.x - totalWidth / 2;

        groups.forEach((group, groupIndex) => {
          const groupCenterX = startGroupX + (groupIndex * groupSpacing);
          const branchPointY = parentNode.y + 80;
          const childY = parentNode.y + 180;

          // Create curved path from parent to branch point
          paths.push({
            d: `M ${parentNode.x} ${parentNode.y + 30} 
                Q ${parentNode.x} ${parentNode.y + 60} ${groupCenterX} ${branchPointY}`,
            color: `hsl(${(groupIndex * 60) % 360}, 70%, 60%)`
          });

          const groupWidth = (group.length - 1) * spacing;
          const groupStartX = groupCenterX - groupWidth / 2;

          group.forEach((child, childIndex) => {
            const childX = groupStartX + (childIndex * spacing);
            const childNode = { location: child, x: childX, y: childY, level };
            
            nodes.push(childNode);
            nextLevelNodes.push(childNode);

            // Create curved path from branch point to child
            paths.push({
              d: `M ${groupCenterX} ${branchPointY} 
                  Q ${groupCenterX} ${branchPointY + 50} ${childX} ${childY - 30}`,
              color: `hsl(${(groupIndex * 60) % 360}, 70%, 60%)`
            });
          });
        });
      });

      if (nextLevelNodes.length > 0) {
        processLevel(nextLevelNodes, level + 1);
      }
    };

    processLevel([{ location: root, x: 750, y: 100, level: 0 }], 1);

    return { nodes, paths };
  };

  const { nodes, paths } = buildTreeStructure();

  const handleNodeClick = (location: Location) => {
    setSelectedNode(location);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-900 to-slate-900 overflow-auto">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-pulse"></div> */}
        {/* <div className="absolute bottom-20 right-20 w-96 h-96rounded-full blur-3xl animate-pulse delay-1000"></div> */}
        {/* <div className="absolute top-1/2 left-1/2 w-64 h-64rounded-full blur-3xl animate-pulse delay-500"></div> */}
      </div>

      <svg className="absolute inset-0 w-full h-full" style={{ minHeight: '600px', minWidth: '1500px' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {paths.map((path, index) => (
          <g key={index}>
            {/* Glow effect */}
            <path
              d={path.d}
              stroke={path.color}
              strokeWidth="6"
              fill="none"
              opacity="0.3"
              filter="url(#glow)"
            />
            {/* Main path */}
            <path
              d={path.d}
              stroke={path.color}
              strokeWidth="3"
              fill="none"
              opacity="0.8"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {nodes.map((node) => (
        <TreeNode
          key={node.location.location_id}
          location={node.location}
          x={node.x}
          y={node.y}
          level={node.level}
          isSelected={selectedNode?.location_id === node.location.location_id}
          onClick={handleNodeClick}
        />
      ))}

      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-30 overflow-hidden">
          <div className="p-5 bg-gradient-to-r  flex justify-between items-center">
            <h3 className="font-bold text-white text-lg drop-shadow-lg">{selectedNode.name}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-white hover:text-gray-200 text-2xl font-bold transition-transform hover:scale-110"
            >
              ×
            </button>
          </div>
          <div className="p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <strong className="text-gray-700">Location ID:</strong>
                <span className="text-gray-900 font-semibold">{selectedNode.location_id}</span>
              </div>
              <div className="flex justify-between">
                <strong className="text-gray-700">Name:</strong>
                <span className="text-gray-900 font-semibold">{selectedNode.name}</span>
              </div>
              <div className="flex justify-between">
                <strong className="text-gray-700">Parent Node:</strong>
                <span className="text-gray-900 font-semibold">{selectedNode.previous_node || 'Root'}</span>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-sm text-gray-600 border border-gray-200">
              <div className="font-semibold text-gray-800 mb-2">📍 Connected Devices</div>
              <div className="text-xs">Devices for this location will appear here</div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-6 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4 text-white border border-white/20">
        <div className="font-bold mb-2 text-lg">🌐 Network Topology</div>
        <div className="text-sm space-y-1 opacity-90">
          <div>Total Locations: <span className="font-bold">{locations.length}</span></div>
          <div className="text-xs mt-2 opacity-75">Click nodes to explore</div>
        </div>
      </div>
    </div>
  );
};

export default TreeGraph;