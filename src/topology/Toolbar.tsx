import React from "react";

const devices = [
  { type: "router", label: "Router" },
  { type: "switch", label: "Switch" },
  { type: "camera", label: "Camera" },
  { type: "nvr", label: "NVR" },
  {type:"workstation", label: "Workstation"}
];

export default function Toolbar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="toolbar">
      {devices.map(d => (
        <div
          key={d.type}
          draggable
          onDragStart={(e) => onDragStart(e, d.type)}
          className="tool-item"
        >
          {d.label}
        </div>
      ))}
    </div>
  );
}
