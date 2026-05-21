import { useMemo } from "react";
import { X, MapPin, Wifi, Clock, AlertTriangle } from "lucide-react";

export interface DowntimeRecord {
  id?: string | number;
  timestamp: string;
  /** true = device came online, false/undefined = device went offline */
  is_reachable?: boolean;
  duration_seconds?: number;
  endTime?: string;
  remarks?: string;
}

// ─── Offline time-range computed from alternating offline/online events ────────

interface OfflineRange {
  start: string;       // ISO timestamp when device went offline
  end: string | null;  // ISO timestamp when device came back online (null = still down)
  durationMs: number | null;
}

/**
 * Given a flat list of telemetry records (each with is_reachable + timestamp),
 * compute contiguous offline ranges by pairing each offline probe with the
 * next online probe (or leaving end=null if still offline at the end).
 */
function computeOfflineRanges(records: DowntimeRecord[]): OfflineRange[] {
  // Sort chronologically
  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const ranges: OfflineRange[] = [];
  let offlineStart: string | null = null;

  for (const rec of sorted) {
    const online = rec.is_reachable === true || rec.is_reachable === undefined
      ? (rec.is_reachable ?? true) // treat missing as online unless record is in downtimeRecords
      : false;

    if (!online && offlineStart === null) {
      // Transition → offline
      offlineStart = rec.timestamp;
    } else if (online && offlineStart !== null) {
      // Transition → online — close the range
      const startMs = new Date(offlineStart).getTime();
      const endMs   = new Date(rec.timestamp).getTime();
      ranges.push({ start: offlineStart, end: rec.timestamp, durationMs: endMs - startMs });
      offlineStart = null;
    }
  }

  // If still offline at end of window
  if (offlineStart !== null) {
    ranges.push({ start: offlineStart, end: null, durationMs: null });
  }

  return ranges;
}

/**
 * Fallback: when records only contain offline probes (the shape used by the
 * existing ScopedReportDashboard), group consecutive timestamps that are ≤ 2×
 * the typical probe interval apart into single ranges.
 */
function groupOfflineProbesIntoRanges(records: DowntimeRecord[]): OfflineRange[] {
  if (records.length === 0) return [];

  const times = records
    .map((r) => new Date(r.timestamp).getTime())
    .sort((a, b) => a - b);

  // Estimate probe interval from median gap (cap at 10 min)
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 5 * 60_000;
  const threshold = Math.min(medianGap * 2.5, 15 * 60_000); // 2.5× interval, max 15 min

  const ranges: OfflineRange[] = [];
  let rangeStart = times[0];
  let rangeEnd   = times[0];

  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] <= threshold) {
      rangeEnd = times[i];
    } else {
      ranges.push({
        start: new Date(rangeStart).toISOString(),
        end: new Date(rangeEnd).toISOString(),
        durationMs: rangeEnd - rangeStart,
      });
      rangeStart = times[i];
      rangeEnd   = times[i];
    }
  }
  ranges.push({
    start: new Date(rangeStart).toISOString(),
    end: new Date(rangeEnd).toISOString(),
    durationMs: rangeEnd - rangeStart,
  });

  return ranges;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return "ongoing";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface DowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: any;
  records: DowntimeRecord[];
}

export default function DowntimeModal({
  isOpen,
  onClose,
  device,
  records,
}: DowntimeModalProps) {
  const offlineRanges = useMemo<OfflineRange[]>(() => {
    if (records.length === 0) return [];

    // Check whether records carry is_reachable (full telemetry) or are pure offline probes
    const hasMixedReachability = records.some((r) => r.is_reachable === true);
    if (hasMixedReachability) {
      return computeOfflineRanges(records);
    }
    // All records are offline probes — group by proximity
    return groupOfflineProbesIntoRanges(records);
  }, [records]);

  const totalDownMs = useMemo(
    () => offlineRanges.reduce((sum, r) => sum + (r.durationMs ?? 0), 0),
    [offlineRanges],
  );

  const longestMs = useMemo(
    () => offlineRanges.reduce((max, r) => Math.max(max, r.durationMs ?? 0), 0),
    [offlineRanges],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Offline Time Ranges</h2>
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
              <div className="text-lg font-bold text-red-300 tabular-nums">{offlineRanges.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Outage Periods</div>
            </div>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div className="text-lg font-bold text-amber-300 tabular-nums">
                {fmtDuration(longestMs)}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Longest Outage</div>
            </div>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-2.5 text-center">
              <div className="text-lg font-bold text-slate-100 tabular-nums">
                {totalDownMs > 0 ? fmtDuration(totalDownMs) : "—"}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Total Down</div>
            </div>
          </div>
        </div>

        {/* Scrollable range list */}
        <div className="flex-1 overflow-y-auto p-6">
          {offlineRanges.length === 0 ? (
            <div className="py-16 text-center">
              <Wifi className="h-10 w-10 mx-auto text-emerald-400/50 mb-3" />
              <p className="text-slate-400 font-medium">No downtime recorded</p>
              <p className="text-slate-500 text-sm mt-1">
                This device was online throughout the selected period.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {offlineRanges.map((range, idx) => {
                const sameDay =
                  range.end !== null &&
                  fmtDate(range.start) === fmtDate(range.end);

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: date + time range */}
                      <div className="flex items-start gap-3">
                        {/* Red dot indicator */}
                        <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />

                        <div>
                          {/* Date line */}
                          <div className="text-sm font-semibold text-slate-100">
                            {fmtDate(range.start)}
                            {!sameDay && range.end && (
                              <span className="text-slate-400 font-normal">
                                {" "}→ {fmtDate(range.end)}
                              </span>
                            )}
                          </div>

                          {/* Time range */}
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300">
                            <Clock className="h-3 w-3 text-slate-500 flex-shrink-0" />
                            <span className="text-red-300 font-mono font-semibold">
                              {fmtTime(range.start)}
                            </span>
                            <span className="text-slate-500 mx-0.5">→</span>
                            {range.end ? (
                              <span className="text-emerald-300 font-mono font-semibold">
                                {fmtTime(range.end)}
                              </span>
                            ) : (
                              <span className="text-amber-300 font-semibold italic">
                                Still offline
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: duration badge */}
                      <span
                        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border"
                        style={
                          range.durationMs === null
                            ? { background: "rgba(245,158,11,0.12)", color: "#fbbf24", borderColor: "rgba(245,158,11,0.3)" }
                            : range.durationMs > 30 * 60_000
                            ? { background: "rgba(239,68,68,0.12)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.25)" }
                            : { background: "rgba(251,191,36,0.12)", color: "#fde68a", borderColor: "rgba(251,191,36,0.25)" }
                        }
                      >
                        {fmtDuration(range.durationMs)}
                      </span>
                    </div>

                    {/* Progress bar visualising proportion of 24 h */}
                    {range.durationMs !== null && (
                      <div className="mt-3">
                        <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (range.durationMs / (24 * 3600_000)) * 100)}%`,
                              background:
                                range.durationMs > 30 * 60_000
                                  ? "linear-gradient(90deg, #ef4444, #f87171)"
                                  : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5 text-right">
                          {((range.durationMs / (24 * 3600_000)) * 100).toFixed(1)}% of 24 h
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

  const onlineCount  = devices.filter((d) => d.isOnline === true).length;
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