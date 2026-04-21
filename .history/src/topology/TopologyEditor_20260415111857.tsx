import React, { useCallback, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState
} from "reactflow";
import "reactflow/dist/style.css";

import Toolbar from "./Toolbar";
import PropertiesPanel from "./PropertiesPanel";
import "./topology.css";

let id = 0;
const getId = () => `node_${id++}`;

export default function TopologyEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<any>(null);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const bounds = reactFlowWrapper.current!.getBoundingClientRect();

      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      };

      const newNode = {
        id: getId(),
        // type: "default",
        position,
        data: { label: type.toUpperCase(), type }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    []
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <ReactFlowProvider>
      <div className="layout">
        <Toolbar />

        <div className="canvas" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelected(node)}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        <PropertiesPanel
          node={selected}
          onChange={(n: any) =>
            setNodes((nds) => nds.map((x) => (x.id === n.id ? n : x)))
          }
        />
      </div>
    </ReactFlowProvider>
  );
}
