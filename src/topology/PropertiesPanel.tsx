import React from "react";

export default function PropertiesPanel({ node, onChange }: any) {
  if (!node) return <div className="props">Select any device</div>;

  return (
    <div className="props">
      <h3>{node.type}</h3>

      <input
        placeholder="Device Name"
        value={node.data?.label || ""}
        onChange={(e) =>
          onChange({ ...node, data: { ...node.data, label: e.target.value } })
        }
      />

      <input
        placeholder="IP Address"
        value={node.data?.ip || ""}
        onChange={(e) =>
          onChange({ ...node, data: { ...node.data, ip: e.target.value } })
        }
      />
    </div>
  );
}
