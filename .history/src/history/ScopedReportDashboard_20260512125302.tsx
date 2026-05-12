import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from "recharts";
import {
  Activity, Clock, Gauge, AlertCircle, Signal, TrendingUp,
  Download, Loader2, Users, MapPin, Smartphone,
} from "lucide-react";

import {
  fetchDeviceHistory,
  type HistoryEntry,
  type Granularity,
} from "@/lib/useDeviceTelemetry";
import {
  generateAreaReport,
  generateMultipleDevicesReport,
  RANGE_OPTIONS,
  type RangeKey,
  type DeviceMeta,
  type AreaMeta,
  type LocationMeta,
} from "@/lib/report-generator";

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

export interface ScopedReportDashboardProps {
  /** Filtered devices in scope (already narrowed by area/location/type). */
  devices: any[];
  /** All locations (used to label per-location summary). */
  locations: any[];
  /** All workers/areas (used to resolve area name). */
  workers: any[];
  /** Device types — used to label fallback type names. */
  deviceTypes: any[];

  /** Currently selected scope identifiers (any one of these can be set). */
  areaId?: string;
  locationId?: string;
  typeId?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers — local copies kept lightweight; mirror logic in report-generator.ts
// ──────────────────────────────────────────────────────────────────────────────

interface Bucket {
  bucketStart: number;
  timeLabel: string;
  online: number;
  offline: number;
  total: number;
  latencySum: number; latencyCount: number;
  jitterSum: number;  jitterCount: number;
  lossSum: number;    lossCount: number;
}

interface DeviceAggregate {
  uptimePct: number;
  totalChecks: number;
  onlineChecks: number;
  offlineChecks: number;
  avgLatency: number;
  maxLatency: number;
  avgJitter: number;
  avgPacketLoss: number;
  incidentCount: number;
  longestDowntimeMs: number;
}

function emptyAgg(): DeviceAggregate {
  return {
    uptimePct: 0, totalChecks: 0, onlineChecks: 0, offlineChecks: 0,
    avgLatency: 0, maxLatency: 0, avgJitter: 0, avgPacketLoss: 0,
    incidentCount: 0, longestDowntimeMs: 0,
  };
}

function rangeToWindow(range: RangeKey): { start: Date; end: Date; granularity: Granularity } {
  const end = new Date();
  let start: Date;
  let granularity: Granularity;
  switch (range) {
    case "1h":  start = new Date(end.getTime() - 60 * 60 * 1000);                granularity = "raw";    break;
    case "24h": start = new Date(end.getTime() - 24 * 60 * 60 * 1000);           granularity = "hourly"; break;
    case "1w":  start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);       granularity = "hourly"; break;
    case "1m":  start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);      granularity = "daily";  break;
    case "3m":  start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);      granularity = "daily";  break;
  }
  return { start, end, granularity };
}

function bucketMs(granularity: Granularity): number {
  if (granularity === "daily")  return 24 * 60 * 60 * 1000;
  if (granularity === "hourly") return 60 * 60 * 1000;
  return 5 * 60 * 1000;
}

function aggregate(history: HistoryEntry[]): DeviceAggregate {
  if (history.length === 0) return emptyAgg();
  const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let online = 0, offline = 0;
  let latSum = 0, latCount = 0, latMax = 0;
  let jitSum = 0, jitCount = 0;
  let lossSum = 0, lossCount = 0;

  // Outage events
  let incidents = 0;
  let longest = 0;
  let openStart: string | null = null;

  for (const e of sorted) {
    if (e.is_reachable) {
      online++;
      if (openStart !== null) {
        const d = new Date(e.timestamp).getTime() - new Date(openStart).getTime();
        incidents++;
        if (d > longest) longest = d;
        openStart = null;
      }
    } else {
      offline++;
      if (openStart === null) openStart = e.timestamp;
    }
    if (typeof e.latency_ms === "number" && !isNaN(e.latency_ms)) {
      latSum += e.latency_ms; latCount++;
      if (e.latency_ms > latMax) latMax = e.latency_ms;
    }
    if (typeof e.jitter_ms === "number" && !isNaN(e.jitter_ms)) {
      jitSum += e.jitter_ms; jitCount++;
    }
    if (typeof e.packet_loss_percent === "number" && !isNaN(e.packet_loss_percent)) {
      lossSum += e.packet_loss_percent; lossCount++;
    }
  }
  if (openStart !== null) {
    incidents++;
    const d = Date.now() - new Date(openStart).getTime();
    if (d > longest) longest = d;
  }

  const total = online + offline;
  return {
    uptimePct: total ? (online / total) * 100 : 0,
    totalChecks: total,
    onlineChecks: online,
    offlineChecks: offline,
    avgLatency: latCount ? latSum / latCount : 0,
    maxLatency: latMax,
    avgJitter:  jitCount ? jitSum / jitCount : 0,
    avgPacketLoss: lossCount ? lossSum / lossCount : 0,
    incidentCount: incidents,
    longestDowntimeMs: longest,
  };
}

function combine(aggs: DeviceAggregate[]): DeviceAggregate {
  const ok = aggs.filter(a => a.totalChecks > 0);
  if (!ok.length) return emptyAgg();
  const total = ok.reduce((s, a) => s + a.totalChecks, 0);
  const online = ok.reduce((s, a) => s + a.onlineChecks, 0);
  const offline = ok.reduce((s, a) => s + a.offlineChecks, 0);
  const weight = (sel: (a: DeviceAggregate) => number) =>
    ok.reduce((s, a) => s + sel(a) * a.totalChecks, 0) / (total || 1);
  return {
    uptimePct: total ? (online / total) * 100 : 0,
    totalChecks: total,
    onlineChecks: online,
    offlineChecks: offline,
    avgLatency: weight(a => a.avgLatency),
    maxLatency: ok.reduce((m, a) => Math.max(m, a.maxLatency), 0),
    avgJitter:  weight(a => a.avgJitter),
    avgPacketLoss: weight(a => a.avgPacketLoss),
    incidentCount: ok.reduce((s, a) => s + a.incidentCount, 0),
    longestDowntimeMs: ok.reduce((m, a) => Math.max(m, a.longestDowntimeMs), 0),
  };
}

function fmtPct(n: number, dp = 1) { return `${n.toFixed(dp)}%`; }
function fmtMs(n: number) { return n > 0 ? `${n.toFixed(1)} ms` : "—"; }
function fmtDuration(ms: number): string {
  if (!ms || ms < 1000) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// ──────────────────────────────────────────────────────────────────────────────
// UI primitives
// ──────────────────────────────────────────────────────────────────────────────

function StatTile({
  label, value, accent = "cyan", icon, sub,
}: {
  label: string; value: string; accent?: "cyan" | "emerald" | "amber" | "red" | "violet" | "slate"; icon?: React.ReactNode; sub?: string;
}) {
  const accents: Record<string, { fg: string; bg: string; border: string }> = {
    cyan:    { fg: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-600/30" },
    emerald: { fg: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-600/30" },
    amber:   { fg: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-600/30" },
    red:     { fg: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-600/30" },
    violet:  { fg: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-600/30" },
    slate:   { fg: "text-slate-100",   bg: "bg-slate-800/60",   border: "border-slate-700" },
  };
  const a = accents[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-3`}>
      <div className="flex items-center gap-2 text-xs text-slate-300">
        {icon}<span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${a.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export default function ScopedReportDashboard({
  devices, locations, workers, deviceTypes, areaId, locationId, typeId,
}: ScopedReportDashboardProps) {
  const [range, setRange] = useState<RangeKey>("24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perDevice, setPerDevice] = useState<Array<{ device: any; agg: DeviceAggregate; history: HistoryEntry[] }>>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string>("");

  const deviceIdsKey = useMemo(() => devices.map((d: any) => d.id).sort().join(","), [devices]);

  // Resolve scope label
  const scopeLabel = useMemo(() => {
    const parts: { icon: React.ReactNode; text: string }[] = [];
    if (areaId) {
      const w = workers.find((x: any) => String(x.id) === areaId);
      parts.push({ icon: <Users className="h-3.5 w-3.5" />, text: w?.name || `Area ${areaId}` });
    }
    if (locationId) {
      const l = locations.find((x: any) => String(x.id) === locationId);
      parts.push({ icon: <MapPin className="h-3.5 w-3.5" />, text: l?.name || `Location ${locationId}` });
    }
    if (typeId) {
      const t = deviceTypes.find((x: any) => String(x.id) === typeId);
      parts.push({ icon: <Smartphone className="h-3.5 w-3.5" />, text: t?.name || `Type ${typeId}` });
    }
    return parts;
  }, [areaId, locationId, typeId, workers, locations, deviceTypes]);

  // Fetch on scope/range change
  useEffect(() => {
    if (devices.length === 0) {
      setPerDevice([]);
      return;
    }
    const { start, end, granularity } = rangeToWindow(range);
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled(
      devices.map(async (d: any) => ({
        device: d,
        history: await fetchDeviceHistory(d.id, start, end, granularity),
      })),
    ).then((settled) => {
      if (cancelled) return;
      const rows = settled.map((r, i) => {
        if (r.status === "fulfilled") {
          return { device: r.value.device, agg: aggregate(r.value.history), history: r.value.history };
        }
        return { device: devices[i], agg: emptyAgg(), history: [] as HistoryEntry[] };
      });
      const anyData = rows.some((r) => r.history.length > 0);
      setPerDevice(rows);
      if (!anyData) setError("No telemetry available for the selected scope.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [deviceIdsKey, range]);

  // Aggregate KPIs across scope
  const overall = useMemo(() => combine(perDevice.map((p) => p.agg)), [perDevice]);

  // Bucketed series for charts
  const buckets = useMemo<Bucket[]>(() => {
    if (perDevice.length === 0) return [];
    const { granularity } = rangeToWindow(range);
    const size = bucketMs(granularity);
    const map = new Map<number, Bucket>();
    for (const p of perDevice) {
      for (const e of p.history) {
        const t = new Date(e.timestamp).getTime();
        const k = Math.floor(t / size) * size;
        let b = map.get(k);
        if (!b) {
          b = {
            bucketStart: k, timeLabel: new Date(k).toLocaleString(),
            online: 0, offline: 0, total: 0,
            latencySum: 0, latencyCount: 0,
            jitterSum: 0, jitterCount: 0,
            lossSum: 0, lossCount: 0,
          };
          map.set(k, b);
        }
        b.total++;
        if (e.is_reachable) b.online++; else b.offline++;
        if (typeof e.latency_ms === "number") { b.latencySum += e.latency_ms; b.latencyCount++; }
        if (typeof e.jitter_ms === "number")  { b.jitterSum  += e.jitter_ms;  b.jitterCount++; }
        if (typeof e.packet_loss_percent === "number") { b.lossSum += e.packet_loss_percent; b.lossCount++; }
      }
    }
    return [...map.values()].sort((a, b) => a.bucketStart - b.bucketStart);
  }, [perDevice, range]);

  // ── Availability: count devices in each state at each time bucket ────────
  // Instead of stacking raw probe counts (which depends on per-device check
  // intervals), we compute "how many devices were online / offline" at the
  // end of every bucket. A device's state at time T is its most recent probe
  // result at or before T. Devices with no probes yet show as "no data".
  const availabilitySeries = useMemo(() => {
    if (perDevice.length === 0 || buckets.length === 0) return [];

    const { granularity } = rangeToWindow(range);
    const size = bucketMs(granularity);

    type Track = { sorted: HistoryEntry[]; pointer: number; state: boolean | null };
    const tracks: Track[] = perDevice.map((p) => ({
      sorted: [...p.history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
      pointer: 0,
      state: null,
    }));

    return buckets.map((b) => {
      const bucketEnd = b.bucketStart + size;
      let online = 0;
      let offline = 0;
      let noData = 0;

      for (const t of tracks) {
        // Advance pointer past every probe at or before this bucket ends
        while (
          t.pointer < t.sorted.length &&
          new Date(t.sorted[t.pointer].timestamp).getTime() <= bucketEnd
        ) {
          t.state = !!t.sorted[t.pointer].is_reachable;
          t.pointer++;
        }
        if (t.state === null) noData++;
        else if (t.state) online++;
        else offline++;
      }

      return {
        timeLabel: b.timeLabel,
        online,
        offline,
        noData,
      };
    });
  }, [perDevice, buckets, range]);
  const latencySeries = buckets.map((b) => ({
    timeLabel: b.timeLabel,
    latency: b.latencyCount ? +(b.latencySum / b.latencyCount).toFixed(2) : null,
  }));
  const jitterSeries = buckets.map((b) => ({
    timeLabel: b.timeLabel,
    jitter: b.jitterCount ? +(b.jitterSum / b.jitterCount).toFixed(2) : null,
  }));
  const lossSeries = buckets.map((b) => ({
    timeLabel: b.timeLabel,
    loss: b.lossCount ? +(b.lossSum / b.lossCount).toFixed(2) : 0,
  }));

  // Per-device ranking
  const ranked = useMemo(
    () => [...perDevice].sort((a, b) => b.agg.uptimePct - a.agg.uptimePct),
    [perDevice],
  );

  // Per-location summary
  const perLocation = useMemo(() => {
    const map = new Map<string, {
      name: string; deviceCount: number; onlineNow: number;
      uptimeSum: number; uptimeCount: number;
      latencySum: number; latencyCount: number;
      incidents: number;
    }>();
    for (const r of perDevice) {
      const name = r.device.location?.name
        || locations.find((l: any) => String(l.id) === String(r.device.location_id))?.name
        || "Unknown";
      let m = map.get(name);
      if (!m) {
        m = { name, deviceCount: 0, onlineNow: 0, uptimeSum: 0, uptimeCount: 0, latencySum: 0, latencyCount: 0, incidents: 0 };
        map.set(name, m);
      }
      m.deviceCount++;
      if (r.device.is_reachable) m.onlineNow++;
      if (r.agg.totalChecks > 0) {
        m.uptimeSum += r.agg.uptimePct;
        m.uptimeCount++;
        m.latencySum += r.agg.avgLatency;
        m.latencyCount++;
        m.incidents += r.agg.incidentCount;
      }
    }
    return [...map.values()]
      .map((m) => ({
        name: m.name,
        deviceCount: m.deviceCount,
        onlineNow: m.onlineNow,
        avgUptime: m.uptimeCount ? m.uptimeSum / m.uptimeCount : 0,
        avgLatency: m.latencyCount ? m.latencySum / m.latencyCount : 0,
        incidents: m.incidents,
      }))
      .sort((a, b) => b.avgUptime - a.avgUptime);
  }, [perDevice, locations]);

  // Top / Bottom 5 by uptime
  const top5 = ranked.filter((r) => r.agg.totalChecks > 0).slice(0, 5);
  const bottom5 = ranked.filter((r) => r.agg.totalChecks > 0).slice(-5).reverse();

  // ─── Download handlers ────────────────────────────────────────────────────
  const onProgress = (m: string) => setDownloadMsg(m);

  const toMeta = (d: any): DeviceMeta => ({
    id: d.id,
    display: d.display,
    hostname: d.hostname,
    ip: d.ip,
    type: d.device_type?.name
      || deviceTypes.find((t: any) => String(t.id) === String(d.device_type_id))?.name
      || "Unknown",
    location: d.location?.name
      || locations.find((l: any) => String(l.id) === String(d.location_id))?.name
      || "Unknown",
    area: d.worker?.name
      || workers.find((w: any) => String(w.id) === String(d.worker_id))?.name
      || "N/A",
    is_reachable: d.is_reachable,
  });

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);
    setDownloadMsg("Preparing…");
    try {
      if (areaId) {
        const w = workers.find((x: any) => String(x.id) === areaId);
        const area: AreaMeta = { id: areaId, name: w?.name || `Area ${areaId}` };
        const locs: LocationMeta[] = locations
          .filter((l: any) => String(l.worker_id ?? "") === areaId)
          .map((l: any) => ({ id: l.id, name: l.name }));
        await generateAreaReport(area, devices.map(toMeta), locs, range, onProgress);
      } else {
        await generateMultipleDevicesReport(devices.map(toMeta), range, onProgress);
      }
      setDownloadMsg("Report downloaded.");
    } catch (e: any) {
      setError(e?.message || "Failed to download report");
      setDownloadMsg("");
    } finally {
      setDownloading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Range + download header */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">
                Report scope
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scopeLabel.length === 0 && (
                  <span className="text-sm text-slate-300">
                    All devices ({devices.length})
                  </span>
                )}
                {scopeLabel.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-cyan-600/40 bg-cyan-500/10 text-cyan-200 text-xs"
                  >
                    {p.icon}
                    {p.text}
                  </span>
                ))}
                <span className="text-xs text-slate-400">
                  · {devices.length} device{devices.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">
                  Timeline
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {RANGE_OPTIONS.map((r) => (
                    <Button
                      key={r.key}
                      size="sm"
                      variant="ghost"
                      className={
                        range === r.key
                          ? "bg-cyan-500 text-white hover:bg-cyan-400 h-8 px-3 text-xs"
                          : "bg-slate-700 text-slate-200 hover:bg-slate-600 h-8 px-3 text-xs"
                      }
                      onClick={() => setRange(r.key)}
                    >
                      {r.label.replace("Last ", "")}
                    </Button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || devices.length === 0}
                className="h-9 px-4 inline-flex items-center gap-2 rounded-md text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #22D3EE 0%, #06B6D4 100%)",
                  color: "#0B1220",
                  boxShadow: "0 8px 18px -8px rgba(6,182,212,0.55)",
                }}
              >
                {downloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Download PDF
              </button>
            </div>
          </div>

          {(loading || downloading || error || downloadMsg) && (
            <div className="mt-3 text-xs">
              {loading && (
                <span className="text-cyan-300 inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading telemetry for {devices.length} device{devices.length !== 1 ? "s" : ""}…
                </span>
              )}
              {!loading && downloading && (
                <span className="text-cyan-300 inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {downloadMsg}
                </span>
              )}
              {!loading && !downloading && downloadMsg && !error && (
                <span className="text-emerald-300">{downloadMsg}</span>
              )}
              {error && <span className="text-amber-300">{error}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregate KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Avg Uptime"
          value={fmtPct(overall.uptimePct)}
          accent={overall.uptimePct >= 95 ? "emerald" : overall.uptimePct >= 80 ? "amber" : "red"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          sub={`${overall.onlineChecks}/${overall.totalChecks} checks`}
        />
        <StatTile
          label="Avg Latency"
          value={fmtMs(overall.avgLatency)}
          accent="cyan"
          icon={<Clock className="h-3.5 w-3.5" />}
          sub={`Max ${fmtMs(overall.maxLatency)}`}
        />
        <StatTile
          label="Avg Jitter"
          value={fmtMs(overall.avgJitter)}
          accent="violet"
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Avg Packet Loss"
          value={fmtPct(overall.avgPacketLoss, 2)}
          accent={overall.avgPacketLoss > 1 ? "red" : "emerald"}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Outage events"
          value={String(overall.incidentCount)}
          accent={overall.incidentCount > 0 ? "red" : "emerald"}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Longest downtime"
          value={fmtDuration(overall.longestDowntimeMs)}
          accent="red"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Devices in scope"
          value={String(devices.length)}
          accent="slate"
          icon={<Smartphone className="h-3.5 w-3.5" />}
          sub={`${devices.filter((d: any) => d.is_reachable).length} online now`}
        />
        <StatTile
          label="Locations"
          value={String(new Set(devices.map((d: any) => d.location_id)).size)}
          accent="slate"
          icon={<MapPin className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Devices online over time — stacked area showing device states (not raw probe counts) */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Signal className="h-5 w-5 text-emerald-300" />
            Devices status
            <span className="ml-auto text-[11px] font-normal text-slate-400">
              of {devices.length} device{devices.length !== 1 ? "s" : ""} in scope
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availabilitySeries.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              {loading ? "Loading…" : "No availability data"}
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={availabilitySeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="srd-online" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#10b981" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="srd-offline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="srd-nodata" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#64748b" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#cbd5e1" }}
                    allowDecimals={false}
                    domain={[0, devices.length]}
                    label={{ value: "Devices", angle: -90, position: "insideLeft", style: { fill: "#94a3b8", fontSize: 11 } }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                    labelStyle={{ color: "#cbd5e1" }}
                    formatter={(value: any, name: any) => {
                      const total = devices.length || 1;
                      const pct = Math.round((Number(value) / total) * 100);
                      return [`${value} (${pct}%)`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                  <Area type="monotone" dataKey="online"  stackId="1" stroke="#10b981" fill="url(#srd-online)"  strokeWidth={2} name="Online" />
                  <Area type="monotone" dataKey="offline" stackId="1" stroke="#ef4444" fill="url(#srd-offline)" strokeWidth={2} name="Offline" />
                  <Area type="monotone" dataKey="noData"  stackId="1" stroke="#64748b" fill="url(#srd-nodata)"  strokeWidth={1} name="No data" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latency */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            Average Latency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latencySeries.every((p) => p.latency === null) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              {loading ? "Loading…" : "No latency data"}
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencySeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} domain={[0, "dataMax + 10"]} />
                  <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }} labelStyle={{ color: "#cbd5e1" }} />
                  <ReferenceArea y1={0}   y2={80}      fill="#16a34a" fillOpacity={0.05} />
                  <ReferenceArea y1={80}  y2={120}     fill="#fbbf24" fillOpacity={0.05} />
                  <ReferenceArea y1={120} y2="dataMax" fill="#ef4444" fillOpacity={0.05} />
                  <Line type="monotone" dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={false} name="Avg latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jitter + Packet loss */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Gauge className="h-5 w-5 text-violet-300" />
              Average Jitter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jitterSeries.every((p) => p.jitter === null) ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={jitterSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="srd-jitter" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} />
                    <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }} labelStyle={{ color: "#cbd5e1" }} />
                    <Area type="monotone" dataKey="jitter" stroke="#8b5cf6" strokeWidth={2} fill="url(#srd-jitter)" name="Jitter (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-300" />
              Packet Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lossSeries.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lossSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} unit="%" />
                    <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }} labelStyle={{ color: "#cbd5e1" }} />
                    <Bar dataKey="loss" fill="#ef4444" name="Avg loss (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-location summary */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-400" />
            Per-location summary
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {perLocation.length === 0 ? (
            <div className="text-slate-400 text-sm">No location data.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 border-b border-slate-700">
                  <th className="py-2 pr-2">Location</th>
                  <th className="py-2 pr-2">Devices</th>
                  <th className="py-2 pr-2">Online now</th>
                  <th className="py-2 pr-2">Avg Uptime</th>
                  <th className="py-2 pr-2">Avg Latency</th>
                  <th className="py-2 pr-2">Outages</th>
                </tr>
              </thead>
              <tbody>
                {perLocation.map((l) => (
                  <tr key={l.name} className="border-b border-slate-700/50">
                    <td className="py-2 pr-2 text-slate-100">{l.name}</td>
                    <td className="py-2 pr-2 tabular-nums text-slate-300">{l.deviceCount}</td>
                    <td className="py-2 pr-2 tabular-nums text-emerald-300">{l.onlineNow}</td>
                    <td className={`py-2 pr-2 tabular-nums font-semibold ${
                      l.avgUptime >= 95 ? "text-emerald-300" :
                      l.avgUptime >= 80 ? "text-amber-300"   : "text-red-300"
                    }`}>{fmtPct(l.avgUptime)}</td>
                    <td className="py-2 pr-2 tabular-nums text-slate-300">{fmtMs(l.avgLatency)}</td>
                    <td className="py-2 pr-2 tabular-nums text-slate-300">{l.incidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Per-device summary */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-cyan-400" />
            Per-device summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <div className="text-slate-400 text-sm">No devices.</div>
          ) : (
            <div className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
              {ranked.map((row) => {
                const u = row.agg.uptimePct;
                const barColor = row.agg.totalChecks === 0 ? "bg-slate-600"
                  : u >= 95 ? "bg-emerald-400"
                  : u >= 80 ? "bg-amber-400"
                  : "bg-red-400";
                const textColor = row.agg.totalChecks === 0 ? "text-slate-400"
                  : u >= 95 ? "text-emerald-300"
                  : u >= 80 ? "text-amber-300"
                  : "text-red-300";
                return (
                  <div key={row.device.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-slate-700/40">
                    <div className="w-1/3 truncate text-sm text-slate-100">
                      {row.device.display || row.device.hostname}
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${u}%` }} />
                    </div>
                    <div className={`w-16 text-right text-xs font-semibold tabular-nums ${textColor}`}>
                      {row.agg.totalChecks === 0 ? "—" : fmtPct(u)}
                    </div>
                    <div className="w-20 text-right text-xs text-slate-400 tabular-nums">
                      {fmtMs(row.agg.avgLatency)}
                    </div>
                    <div className="w-14 text-right text-xs text-slate-400 tabular-nums">
                      {row.agg.incidentCount} out
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top / Bottom */}
      {(top5.length > 0 || bottom5.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                Most reliable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5.length === 0 ? (
                <div className="text-slate-400 text-sm">No data.</div>
              ) : (
                <ol className="space-y-1">
                  {top5.map((r, i) => (
                    <li key={r.device.id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                      <span className="flex-1 truncate text-slate-100">{r.device.display || r.device.hostname}</span>
                      <span className="text-emerald-300 font-semibold tabular-nums">{fmtPct(r.agg.uptimePct)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-300" />
                Least reliable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bottom5.length === 0 ? (
                <div className="text-slate-400 text-sm">No data.</div>
              ) : (
                <ol className="space-y-1">
                  {bottom5.map((r, i) => (
                    <li key={r.device.id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                      <span className="flex-1 truncate text-slate-100">{r.device.display || r.device.hostname}</span>
                      <span className={`font-semibold tabular-nums ${
                        r.agg.uptimePct >= 80 ? "text-amber-300" : "text-red-300"
                      }`}>{fmtPct(r.agg.uptimePct)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
