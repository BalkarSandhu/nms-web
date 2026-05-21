import { useState } from "react";
import { X, MapPin, Wifi, WifiOff, Clock, AlertTriangle } from "lucide-react";

export interface DowntimeRecord {
  id?: string | number;
  timestamp: string;
  duration_seconds?: number;
  endTime?: string;
  remarks?: string;
}

interface DowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: any;
  records: DowntimeRecord[];
  onSaveRemark?: (recordId: string | number, remark: string) => void;
}

export default function DowntimeModal({
  isOpen,
  onClose,
  device,
  records,
  onSaveRemark,
}: DowntimeModalProps) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editRemark, setEditRemark] = useState("");

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return timestamp;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const calculateTimeRange = (record: DowntimeRecord) => {
    if (record.endTime) {
      return `${formatTime(record.timestamp)} → ${formatTime(record.endTime)}`;
    }
    if (record.duration_seconds) {
      const endDate = new Date(
        new Date(record.timestamp).getTime() + record.duration_seconds * 1000
      );
      return `${formatTime(record.timestamp)} → ${formatTime(endDate.toISOString())}`;
    }
    return formatTime(record.timestamp);
  };

  const handleEditClick = (record: DowntimeRecord) => {
    setEditingId(record.id ?? 0);
    setEditRemark(record.remarks || "");
  };

  const handleSaveRemark = (recordId: string | number) => {
    if (onSaveRemark) onSaveRemark(recordId, editRemark);
    setEditingId(null);
    setEditRemark("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal — CENTERED */}
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Downtime Records</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {device?.display || device?.hostname || "Device"}
                {(device?.ip_address || device?.ip) && (
                  <span className="ml-2 font-mono text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}>
                    {device.ip_address || device.ip}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div className="text-lg font-bold text-red-300 tabular-nums">{records.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Outage Events</div>
            </div>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div className="text-lg font-bold text-amber-300 tabular-nums">
                {records.filter(r => r.duration_seconds && r.duration_seconds > 300).length}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Over 5 min</div>
            </div>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div className="text-lg font-bold text-slate-100 tabular-nums">
                {records.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) > 0
                  ? formatDuration(records.reduce((sum, r) => sum + (r.duration_seconds || 0), 0))
                  : "—"}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Total Down</div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {records.length === 0 ? (
            <div className="py-16 text-center">
              <Wifi className="h-10 w-10 mx-auto text-emerald-400/50 mb-3" />
              <p className="text-slate-400 font-medium">No downtime records found</p>
              <p className="text-slate-500 text-sm mt-1">This device has been online during the selected period.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record, idx) => (
                <div
                  key={record.id ?? idx}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {formatDate(record.timestamp)}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {calculateTimeRange(record)}
                        </div>
                      </div>
                    </div>
                    {record.duration_seconds && (
                      <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">
                        {formatDuration(record.duration_seconds)}
                      </span>
                    )}
                  </div>

                  {/* Remarks */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Remarks</p>
                    {editingId === record.id ? (
                      <div className="flex gap-2">
                        <textarea
                          value={editRemark}
                          onChange={(e) => setEditRemark(e.target.value)}
                          placeholder="e.g. Power Cut, Network Issue, Maintenance…"
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          rows={2}
                        />
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleSaveRemark(record.id ?? 0)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-300 leading-relaxed flex-1">
                          {record.remarks || (
                            <span className="text-slate-500 italic">No remarks added</span>
                          )}
                        </p>
                        <button
                          onClick={() => handleEditClick(record)}
                          className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold text-cyan-400 hover:bg-slate-700/60 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Location Detail Modal ────────────────────────────────────────────────────

export interface LocationDeviceDetail {
  id: string | number;
  name: string;
  ip: string;
  type: string;
  isOnline: boolean | null;
  downtimePct: number;
  offlineCount: number;
}

export interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  area: string;
  avgDowntimePct: number;
  totalOutageEvents: number;
  devices: LocationDeviceDetail[];
}

export function LocationDetailModal({
  isOpen,
  onClose,
  locationName,
  area,
  avgDowntimePct,
  totalOutageEvents,
  devices,
}: LocationDetailModalProps) {
  if (!isOpen) return null;

  const onlineCount = devices.filter((d) => d.isOnline === true).length;
  const offlineCount = devices.filter((d) => d.isOnline === false).length;

  const downtimeColor = (pct: number) =>
    pct <= 5 ? "#10b981" : pct <= 15 ? "#f59e0b" : "#ef4444";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-600/30">
                <MapPin className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{locationName}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{area || "No area"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div className="text-lg font-bold text-slate-100 tabular-nums">{devices.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Devices</div>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-600/30 p-2.5 text-center">
              <div className="text-lg font-bold text-emerald-300 tabular-nums">{onlineCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Online</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-600/30 p-2.5 text-center">
              <div className="text-lg font-bold text-red-300 tabular-nums">{offlineCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Offline</div>
            </div>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div
                className="text-lg font-bold tabular-nums"
                style={{ color: downtimeColor(avgDowntimePct) }}
              >
                {avgDowntimePct}%
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Avg Down</div>
            </div>
          </div>
        </div>

        {/* Device list */}
        <div className="flex-1 overflow-y-auto p-6">
          {devices.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No devices in this location.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
                Device Breakdown
              </div>
              {[...devices]
                .sort((a, b) => b.downtimePct - a.downtimePct)
                .map((d, idx) => (
                <div
                  key={d.id ?? idx}
                  className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      d.isOnline === true
                        ? "bg-emerald-400"
                        : d.isOnline === false
                        ? "bg-red-400"
                        : "bg-slate-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">{d.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(34,211,238,0.10)", color: "#22d3ee" }}
                      >
                        {d.ip}
                      </span>
                      {d.type && (
                        <span className="text-[10px] text-slate-400">{d.type}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-right flex-shrink-0">
                    <div>
                      <div
                        className="font-bold tabular-nums text-sm"
                        style={{ color: downtimeColor(d.downtimePct) }}
                      >
                        {d.downtimePct}%
                      </div>
                      <div className="text-slate-500 text-[10px]">downtime</div>
                    </div>
                    <div>
                      <div className="font-semibold tabular-nums text-sm text-slate-300">
                        {d.offlineCount}
                      </div>
                      <div className="text-slate-500 text-[10px]">events</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}