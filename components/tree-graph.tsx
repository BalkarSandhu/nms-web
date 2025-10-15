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
    return 'from-green-400 to-emerald-600';
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
        bg-gradient-to-br ${getNodeColor()} rounded-xl shadow-2xl p-3 min-w-26 text-center
        border-2 ${isSelected ? 'border-white ring-4 ring-emerald-300' : 'border-white/50'}
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
    
    const HORIZONTAL_SPACING = 120;
    const VERTICAL_SPACING = 130;
    const BRANCH_OFFSET = 60; 
    const START_Y = 100;

    
    const calculateTreeLayout = (node: Location, level: number, position: number): any => {
      const children = findChildren(node.location_id);
      
      if (children.length === 0) {
        return { node, level, position, width: 1 };
      }

      let totalWidth = 0;
      const childLayouts = children.map((child, index) => {
        const childLayout = calculateTreeLayout(child, level + 1, totalWidth);
        totalWidth += childLayout.width;
        return childLayout;
      });

      return { node, level, position, width: totalWidth, children: childLayouts };
    };

    const layout = calculateTreeLayout(root, 0, 0);
    const totalWidth = layout.width * HORIZONTAL_SPACING;
    const START_X = (1500 - totalWidth) / 2 + totalWidth / 2;

    // Position nodes based on layout
    const positionNodes = (layout: any, parentX: number, parentY: number) => {
      const currentY = START_Y + layout.level * VERTICAL_SPACING;
      const currentX = parentX;

      if (layout.level === 0) {
        nodes.push({ 
          location: layout.node, 
          x: START_X, 
          y: currentY, 
          level: layout.level 
        });
        
        if (layout.children) {
          const childrenWidth = layout.width * HORIZONTAL_SPACING;
          let childX = START_X - childrenWidth / 2 + HORIZONTAL_SPACING / 2;
          
          // Calculate branch point
          const branchY = currentY + BRANCH_OFFSET;
          
          // Vertical line from parent to branch point
          paths.push({
            type: 'vertical',
            x1: START_X,
            y1: currentY + 30,
            x2: START_X,
            y2: branchY
          });
          
          // Horizontal line connecting all children
          const firstChildX = childX + (layout.children[0].width * HORIZONTAL_SPACING) / 2 - HORIZONTAL_SPACING / 2;
          const lastChildX = childX + (layout.children.reduce((sum: number, c: any) => sum + c.width, 0) * HORIZONTAL_SPACING) - HORIZONTAL_SPACING / 2 - (layout.children[layout.children.length - 1].width * HORIZONTAL_SPACING) / 2 + HORIZONTAL_SPACING / 2;
          
          paths.push({
            type: 'horizontal',
            x1: firstChildX,
            y1: branchY,
            x2: lastChildX,
            y2: branchY
          });
          
          layout.children.forEach((childLayout: any) => {
            const childCenterX = childX + (childLayout.width * HORIZONTAL_SPACING) / 2 - HORIZONTAL_SPACING / 2;
            
            // Vertical line from horizontal branch to child
            paths.push({
              type: 'vertical',
              x1: childCenterX,
              y1: branchY,
              x2: childCenterX,
              y2: currentY + VERTICAL_SPACING - 30
            });
            
            positionNodes(childLayout, childCenterX, currentY);
            childX += childLayout.width * HORIZONTAL_SPACING;
          });
        }
      } else {
        nodes.push({ 
          location: layout.node, 
          x: currentX, 
          y: currentY, 
          level: layout.level 
        });
        
        if (layout.children) {
          const childrenWidth = layout.width * HORIZONTAL_SPACING;
          let childX = currentX - childrenWidth / 2 + HORIZONTAL_SPACING / 2;
          
          // Calculate branch point
          const branchY = currentY + BRANCH_OFFSET;
          
          // Vertical line from parent to branch point
          paths.push({
            type: 'vertical',
            x1: currentX,
            y1: currentY + 30,
            x2: currentX,
            y2: branchY
          });
          
          // Horizontal line connecting all children
          const firstChildX = childX + (layout.children[0].width * HORIZONTAL_SPACING) / 2 - HORIZONTAL_SPACING / 2;
          const lastChildX = childX + (layout.children.reduce((sum: number, c: any) => sum + c.width, 0) * HORIZONTAL_SPACING) - HORIZONTAL_SPACING / 2 - (layout.children[layout.children.length - 1].width * HORIZONTAL_SPACING) / 2 + HORIZONTAL_SPACING / 2;
          
          paths.push({
            type: 'horizontal',
            x1: firstChildX,
            y1: branchY,
            x2: lastChildX,
            y2: branchY
          });
          
          layout.children.forEach((childLayout: any) => {
            const childCenterX = childX + (childLayout.width * HORIZONTAL_SPACING) / 2 - HORIZONTAL_SPACING / 2;
            
            // Vertical line from horizontal branch to child
            paths.push({
              type: 'vertical',
              x1: childCenterX,
              y1: branchY,
              x2: childCenterX,
              y2: currentY + VERTICAL_SPACING - 30
            });
            
            positionNodes(childLayout, childCenterX, currentY);
            childX += childLayout.width * HORIZONTAL_SPACING;
          });
        }
      }
    };

    positionNodes(layout, START_X, START_Y);

    return { nodes, paths };
  };

  const { nodes, paths } = buildTreeStructure();

  const handleNodeClick = (location: Location) => {
    setSelectedNode(location);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-auto">
      <svg className="absolute inset-0 w-full h-full" style={{ minHeight: '600px', minWidth: '1500px' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {paths.map((path, index) => (
          <g key={index}>
            {/* Glow effect */}
            <line
              x1={path.x1}
              y1={path.y1}
              x2={path.x2}
              y2={path.y2}
              stroke="#10b981"
              strokeWidth="4"
              opacity="0.3"
              filter="url(#glow)"
            />
            {/* Main line */}
            <line
              x1={path.x1}
              y1={path.y1}
              x2={path.x2}
              y2={path.y2}
              stroke="#34d399"
              strokeWidth="2"
              opacity="0.6"
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
          <div className="p-5 bg-gradient-to-r from-green-500 to-emerald-600 flex justify-between items-center">
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
        <div className="font-bold mb-2 text-lg"></div>
        <div className="text-sm space-y-1 opacity-90">
          <div>Total Locations: <span className="font-bold">{locations.length}</span></div>
          <div className="text-xs mt-2 opacity-75">Click nodes to explore</div>
        </div>
      </div>
    </div>
  );
};

export default TreeGraph;