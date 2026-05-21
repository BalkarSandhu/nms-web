import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Legend, Cell,
} from "recharts";
import {
  Clock, Gauge, AlertCircle, Signal, TrendingUp,
  MapPin, Smartphone, TimerOff, Zap,
} from "lucide-react";

import {
  fetchDeviceHistory,
  mapLimit,
  type HistoryEntry,
} from "@/lib/useDeviceTelemetry";
import {
  rangeToWindow, aggregate, combine, emptyAgg, lastReachableState,
  fmtPct, DAY_MS,
  type Bucket, type DeviceAggregate,
} from "@/lib/telemetry-aggregate";
import { useHistoryView } from "@/contexts/HistoryViewContext";
import TelemetryProgressDialog from "@/components/telemetry-progress-dialog";
import {
  ScopedDevicesTable, ScopedLocationsTable,
  type ScopedDeviceRow, type ScopedLocationRow,
  ScopedDevicesDowntimeTable, ScopedLocationsDowntimeTable,
  type ScopedDeviceDowntimeRow, type ScopedLocationDowntimeRow,
} from "@/downtime/scoped-tables";
import { type LocationDeviceDetail } from "@/downtime/DowntimeModal";

const FETCH_CONCURRENCY = 5;

import { type RangeKey } from "@/lib/report-generator";

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

export interface ScopedReportDashboardProps {
  devices: any[];
  locations: any[];
  workers: any[];
  deviceTypes: any[];
  areaId?: string;
  locationId?: string;
  typeId?: string;
  range?: RangeKey;
  onRangeChange?: (r: RangeKey) => void;
  onBack?: () => void;
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
      <div className="flex items-center gap-2 text-xs text-slate-300">{icon}<span>{label}</span></div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${a.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
// Module-level cache — survives component unmounts/remounts
const telemetryCache = new Map<string, any[]>();

function getCacheKey(deviceId: number, range: string): string {
  const hourBucket = new Date().toISOString().slice(0, 13); // "2026-05-20T07"
  return `${deviceId}_${range}_${hourBucket}`;
}

// ─── Horizontal metric bar (for longest-downtime / most-events rankings) ─────
function HorizBar({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-200 truncate flex-1 pr-2" title={label}>{label}</span>
        <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color }}>
          {sub || value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export default function ScopedReportDashboard({
  devices, locations,
  range: rangeProp,
}: ScopedReportDashboardProps) {
  const range: RangeKey = rangeProp ?? "24h";
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [perDevice, setPerDevice] = useState<
    Array<{ device: any; agg: DeviceAggregate; history: HistoryEntry[]; lastState: boolean | null }>
  >([]);
  const { view } = useHistoryView();

  const deviceIdsKey = useMemo(() => devices.map((d: any) => d.id).sort().join(","), [devices]);

  // Fetch on scope/range change
  useEffect(() => {
    if (devices.length === 0) { setPerDevice([]); return; }
    const { start, end, granularity } = rangeToWindow(range);
    let cancelled = false;
    setLoading(true);
    setProgress({ done: 0, total: devices.length });
    setError(null);

    mapLimit(
      devices,
      FETCH_CONCURRENCY,
      async (d: any) => ({
        device: d,
        history: await (async () => {
        const key = getCacheKey(d.id, range);
        if (telemetryCache.has(key)) return telemetryCache.get(key)!;
        const data = await fetchDeviceHistory(d.id, start, end, granularity);
        telemetryCache.set(key, data);
        return data;
})(),
      }),
      (done, total) => { if (!cancelled) setProgress({ done, total }); },
    ).then((settled) => {
      if (cancelled) return;
      const rows = settled.map((r, i) => {
        if (r.status === "fulfilled") {
          return {
            device: r.value.device,
            agg: aggregate(r.value.history),
            history: r.value.history,
            lastState: lastReachableState(r.value.history),
          };
        }
        return { device: devices[i], agg: emptyAgg(), history: [] as HistoryEntry[], lastState: null };
      });
      setPerDevice(rows);
      if (!rows.some((r) => r.history.length > 0))
        setError("No telemetry available for the selected scope.");
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [deviceIdsKey, range]);

  const overall = useMemo(() => combine(perDevice.map((p) => p.agg)), [perDevice]);

  // Bucketed series for charts
  const buckets = useMemo<Bucket[]>(() => {
    if (perDevice.length === 0) return [];
    const { bucketSize: size } = rangeToWindow(range);
    const map = new Map<number, Bucket>();
    for (const p of perDevice) {
      for (const e of p.history) {
        const t = new Date(e.timestamp).getTime();
        const k = Math.floor(t / size) * size;
        let b = map.get(k);
        if (!b) {
          b = {
            bucketStart: k,
            timeLabel: size >= DAY_MS
              ? new Date(k).toLocaleDateString()
              : new Date(k).toLocaleString(),
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

  // Availability series
  const availabilitySeries = useMemo(() => {
    if (perDevice.length === 0 || buckets.length === 0) return [];
    const { bucketSize: size } = rangeToWindow(range);
    type Track = { sorted: HistoryEntry[]; pointer: number; state: boolean | null };
    const tracks: Track[] = perDevice.map((p) => ({
      sorted: [...p.history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      pointer: 0,
      state: null,
    }));
    return buckets.map((b) => {
      const bucketEnd = b.bucketStart + size;
      let online = 0, offline = 0, noData = 0;
      for (const t of tracks) {
        while (t.pointer < t.sorted.length && new Date(t.sorted[t.pointer].timestamp).getTime() <= bucketEnd) {
          t.state = !!t.sorted[t.pointer].is_reachable;
          t.pointer++;
        }
        if (t.state === null) noData++;
        else if (t.state) online++;
        else offline++;
      }
      return { timeLabel: b.timeLabel, online, offline, noData };
    });
  }, [perDevice, buckets, range]);

  const statusLineSeries = useMemo(() => {
    if (availabilitySeries.length === 0) return [];
    const { start } = rangeToWindow(range);
    return [
      { timeLabel: start.toLocaleString(), online: 0, offline: 0 },
      ...availabilitySeries.map((p) => ({ timeLabel: p.timeLabel, online: p.online, offline: p.offline })),
    ];
  }, [availabilitySeries, range]);

  const latencySeries = buckets.map((b) => ({
    timeLabel: b.timeLabel,
    latency: b.latencyCount ? +(b.latencySum / b.latencyCount).toFixed(2) : null,
  }));

  const lossSeries = buckets.map((b) => ({
    timeLabel: b.timeLabel,
    loss: b.lossCount ? +(b.lossSum / b.lossCount).toFixed(2) : 0,
  }));

  const ranked = useMemo(() => [...perDevice].sort((a, b) => b.agg.uptimePct - a.agg.uptimePct), [perDevice]);

  // Per-location summary
  const perLocation = useMemo(() => {
    const map = new Map<string, {
      name: string; type?: string; area?: string;
      deviceCount: number; onlineLast: number; offlineLast: number; noData: number;
      uptimeSum: number; uptimeCount: number;
      latencySum: number; latencyCount: number;
      incidents: number;
    }>();
    for (const r of perDevice) {
      const locObj: any = locations.find((l: any) => String(l.id) === String(r.device.location_id));
      const name = r.device.location?.name || locObj?.name || "Unknown";
      let m = map.get(name);
      if (!m) {
        m = { name, type: locObj?.type_name || locObj?.location_type || r.device.location?.type?.name,
          area: locObj?.area || r.device.location?.area || r.device.worker?.name,
          deviceCount: 0, onlineLast: 0, offlineLast: 0, noData: 0,
          uptimeSum: 0, uptimeCount: 0, latencySum: 0, latencyCount: 0, incidents: 0 };
        map.set(name, m);
      }
      m.deviceCount++;
      if (r.lastState === null) m.noData++;
      else if (r.lastState) m.onlineLast++;
      else m.offlineLast++;
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
        name: m.name, type: m.type, area: m.area,
        deviceCount: m.deviceCount,
        onlineLast: m.onlineLast, offlineLast: m.offlineLast, noData: m.noData,
        hasData: m.uptimeCount > 0,
        statusOnline: (m.onlineLast > 0 ? true : m.offlineLast > 0 ? false : null) as boolean | null,
        avgUptime: m.uptimeCount ? m.uptimeSum / m.uptimeCount : 0,
        avgLatency: m.latencyCount ? m.latencySum / m.latencyCount : 0,
        incidents: m.incidents,
      }))
      .sort((a, b) => b.avgUptime - a.avgUptime);
  }, [perDevice, locations]);

  // ── DOWNTIME rows ──────────────────────────────────────────────────────────

  const scopedDeviceDowntimeRows = useMemo(
    () => [...perDevice]
      .sort((a, b) => (a.device.display || a.device.hostname || "").localeCompare(b.device.display || b.device.hostname || ""))
      .map((r) => {
        const totalProbes  = r.history.length || 1;
        const offlineCount = r.history.filter((h: any) => !h.is_reachable).length;
        const onlineCount  = r.history.filter((h: any) =>  h.is_reachable).length;
        const downtimePct  = Math.round((offlineCount / totalProbes) * 100);
        return {
          id: r.device.id,
          deviceName: r.device.display || r.device.hostname || `Device ${r.device.id}`,
          ip: r.device.ip_address || r.device.ip || "N/A",
          area: r.device.worker?.name || r.device.location?.area || "N/A",
          location: r.device.location?.name || "N/A",
          type: r.device.device_type?.name || r.device.type || "N/A",
          downtimePct, offlineCount, onlineCount,
          downtimeRecords: r.history
            .filter((h: any) => !h.is_reachable)
            .map((h: any, idx: number) => ({ id: idx, timestamp: h.timestamp, remarks: "" })),
        };
      }),
    [perDevice],
  );

  const scopedLocationDowntimeRows = useMemo<ScopedLocationDowntimeRow[]>(() => {
    const map = new Map<string, {
      name: string; area?: string; locationId: string | number;
      deviceCount: number; totalDowntime: number; totalOutageEvents: number;
      deviceDetails: LocationDeviceDetail[];
    }>();
    for (const r of perDevice) {
      const locObj: any = locations.find((l: any) => String(l.id) === String(r.device.location_id));
      const name  = r.device.location?.name || locObj?.name || "Unknown";
      const locId = r.device.location_id;
      let m = map.get(name);
      if (!m) {
        m = { name, area: locObj?.area || r.device.location?.area || r.device.worker?.name,
          locationId: locId, deviceCount: 0, totalDowntime: 0, totalOutageEvents: 0, deviceDetails: [] };
        map.set(name, m);
      }
      m.deviceCount++;
      const totalProbes  = r.history.length || 1;
      const offlineCount = r.history.filter((h: any) => !h.is_reachable).length;
      const downtimePct  = Math.round((offlineCount / totalProbes) * 100);
      m.totalDowntime      += downtimePct;
      m.totalOutageEvents  += offlineCount;
      m.deviceDetails.push({
        id: r.device.id,
        name: r.device.display || r.device.hostname || `Device ${r.device.id}`,
        ip: r.device.ip_address || r.device.ip || "N/A",
        type: r.device.device_type?.name || "Unknown",
        isOnline: r.lastState,
        downtimePct,
        offlineCount,
      });
    }
    return [...map.values()]
      .map((m) => ({
        id: m.locationId,
        locationName: m.name,
        area: m.area ?? "",
        deviceCount: m.deviceCount,
        avgDowntimePct: Math.round(m.totalDowntime / m.deviceCount),
        totalOutageEvents: m.totalOutageEvents,
        devices: m.deviceDetails,
      }))
      .sort((a, b) => b.avgDowntimePct - a.avgDowntimePct);
  }, [perDevice, locations]);

  // ── NEW METRIC: Top 5 devices by downtime % and by outage count ────────────
  const top5DevicesByDowntime = useMemo(
    () => [...scopedDeviceDowntimeRows]
      .sort((a, b) => b.downtimePct - a.downtimePct)
      .slice(0, 7),
    [scopedDeviceDowntimeRows],
  );

  const top5DevicesByOutages = useMemo(
    () => [...scopedDeviceDowntimeRows]
      .sort((a, b) => b.offlineCount - a.offlineCount)
      .slice(0, 7),
    [scopedDeviceDowntimeRows],
  );

  // ── NEW METRIC: Top 5 locations by downtime % and by outage events ────────
  const top5LocationsByDowntime = useMemo(
    () => [...scopedLocationDowntimeRows]
      .sort((a, b) => b.avgDowntimePct - a.avgDowntimePct)
      .slice(0, 7),
    [scopedLocationDowntimeRows],
  );

  const top5LocationsByOutages = useMemo(
    () => [...scopedLocationDowntimeRows]
      .sort((a, b) => (b.totalOutageEvents ?? 0) - (a.totalOutageEvents ?? 0))
      .slice(0, 7),
    [scopedLocationDowntimeRows],
  );

  const top5 = ranked.filter((r) => r.agg.totalChecks > 0).slice(0, 5);
  const bottom5 = ranked.filter((r) => r.agg.totalChecks > 0).slice(-5).reverse();

  const onlineNow = useMemo(() => devices.filter((d: any) => d.is_reachable).length, [devices]);
  const totalLocations = useMemo(() => new Set(devices.map((d: any) => d.location_id)).size, [devices]);
  const onlineLocations = useMemo(() => {
    const up = new Map<any, boolean>();
    for (const d of devices as any[]) up.set(d.location_id, (up.get(d.location_id) ?? false) || !!d.is_reachable);
    let n = 0;
    up.forEach((v) => { if (v) n++; });
    return n;
  }, [devices]);
  const locationAvgUptime = useMemo(
    () => (perLocation.length ? perLocation.reduce((s, l) => s + l.avgUptime, 0) / perLocation.length : 0),
    [perLocation],
  );

  const topLocations    = perLocation.slice(0, 5);
  const bottomLocations = perLocation.length > 5 ? [...perLocation].slice(-5).reverse() : [...perLocation].reverse();
  const locSeries = useMemo(
    () => perLocation.map((l) => ({ name: l.name, uptime: +l.avgUptime.toFixed(1), latency: +l.avgLatency.toFixed(1) })),
    [perLocation],
  );

  const uptimeAccent = (p: number): "emerald" | "amber" | "red" =>
    p >= 95 ? "emerald" : p >= 80 ? "amber" : "red";

  const downtimeBarColor = (pct: number) =>
    pct <= 5 ? "#10b981" : pct <= 15 ? "#f59e0b" : "#ef4444";

  // ─── Recharts data for new metrics ──────────────────────────────────────────
  const deviceDowntimeChartData = top5DevicesByDowntime.map((d) => ({
    name: d.deviceName.length > 14 ? d.deviceName.slice(0, 13) + "…" : d.deviceName,
    fullName: d.deviceName,
    value: d.downtimePct,
    color: downtimeBarColor(d.downtimePct),
  }));

  const deviceOutageChartData = top5DevicesByOutages.map((d) => ({
    name: d.deviceName.length > 14 ? d.deviceName.slice(0, 13) + "…" : d.deviceName,
    fullName: d.deviceName,
    value: d.offlineCount,
  }));

  const locationDowntimeChartData = top5LocationsByDowntime.map((l) => ({
    name: l.locationName.length > 14 ? l.locationName.slice(0, 13) + "…" : l.locationName,
    fullName: l.locationName,
    value: l.avgDowntimePct,
    color: downtimeBarColor(l.avgDowntimePct),
  }));

  const locationOutageChartData = top5LocationsByOutages.map((l) => ({
    name: l.locationName.length > 14 ? l.locationName.slice(0, 13) + "…" : l.locationName,
    fullName: l.locationName,
    value: l.totalOutageEvents ?? 0,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <TelemetryProgressDialog
        open={loading}
        done={progress.done}
        total={progress.total}
        label="Fetching telemetry"
      />

      {error && !loading && (
        <div className="text-amber-300 text-xs px-1">{error}</div>
      )}

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total Devices"       value={String(devices.length)}     accent="slate"                      icon={<Smartphone className="h-3.5 w-3.5" />} sub={`${onlineNow} online now`} />
        <StatTile label="Total Locations"     value={String(totalLocations)}     accent="slate"                      icon={<MapPin className="h-3.5 w-3.5" />}    sub={`${onlineLocations} online now`} />
        <StatTile label="Devices Avg Uptime"  value={fmtPct(overall.uptimePct)} accent={uptimeAccent(overall.uptimePct)} icon={<TrendingUp className="h-3.5 w-3.5" />}  sub={`${overall.onlineChecks}/${overall.totalChecks} checks`} />
        <StatTile label="Location Avg Uptime" value={fmtPct(locationAvgUptime)} accent={uptimeAccent(locationAvgUptime)} icon={<Gauge className="h-3.5 w-3.5" />} />
      </div>

      {/* ── Main table (toggle) ──────────────────────────────────────────── */}
      {view === "devices" ? (
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-cyan-400" />
              Device Downtime
              <span className="ml-auto text-[11px] font-normal text-slate-400">
                {scopedDeviceDowntimeRows.length} in scope · click a row to see records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScopedDevicesDowntimeTable rows={scopedDeviceDowntimeRows} />
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-cyan-400" />
              Location Downtime
              <span className="ml-auto text-[11px] font-normal text-slate-400">
                {scopedLocationDowntimeRows.length} in scope · click a row for detail
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScopedLocationsDowntimeTable rows={scopedLocationDowntimeRows} />
          </CardContent>
        </Card>
      )}

      {/* ══ NEW: METRIC CHARTS (toggle) ══════════════════════════════════════ */}
      {view === "devices" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Devices with Longest Downtime */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TimerOff className="h-5 w-5 text-red-400" />
                Longest Device Downtime
                <span className="ml-auto text-[11px] font-normal text-slate-400">top {top5DevicesByDowntime.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceDowntimeChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={deviceDowntimeChartData}
                        layout="vertical"
                        margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#cbd5e1" }} unit="%" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 10, fill: "#cbd5e1" }}
                        />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                          formatter={(value: any, _: any, props: any) => [`${value}%`, props.payload.fullName]}
                        />
                        <Bar dataKey="value" name="Downtime %" radius={[0, 3, 3, 0]}>
                          {deviceDowntimeChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2.5 border-t border-slate-700 pt-4">
                    {top5DevicesByDowntime.map((d) => (
                      <HorizBar
                        key={d.id}
                        label={d.deviceName}
                        value={d.downtimePct}
                        max={top5DevicesByDowntime[0]?.downtimePct || 1}
                        color={downtimeBarColor(d.downtimePct)}
                        sub={`${d.downtimePct}%`}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Devices with Most Outage Events */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                Most Device Outage Events
                <span className="ml-auto text-[11px] font-normal text-slate-400">top {top5DevicesByOutages.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceOutageChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={deviceOutageChartData}
                        layout="vertical"
                        margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#cbd5e1" }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 10, fill: "#cbd5e1" }}
                        />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                          formatter={(value: any, _: any, props: any) => [`${value} events`, props.payload.fullName]}
                        />
                        <Bar dataKey="value" fill="#f59e0b" name="Outage events" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2.5 border-t border-slate-700 pt-4">
                    {top5DevicesByOutages.map((d) => (
                      <HorizBar
                        key={d.id}
                        label={d.deviceName}
                        value={d.offlineCount}
                        max={top5DevicesByOutages[0]?.offlineCount || 1}
                        color="#f59e0b"
                        sub={`${d.offlineCount} events`}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Locations with Longest Downtime */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TimerOff className="h-5 w-5 text-red-400" />
                Longest Location Downtime
                <span className="ml-auto text-[11px] font-normal text-slate-400">top {top5LocationsByDowntime.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationDowntimeChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={locationDowntimeChartData}
                        layout="vertical"
                        margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#cbd5e1" }} unit="%" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 10, fill: "#cbd5e1" }}
                        />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                          formatter={(value: any, _: any, props: any) => [`${value}%`, props.payload.fullName]}
                        />
                        <Bar dataKey="value" name="Avg Downtime %" radius={[0, 3, 3, 0]}>
                          {locationDowntimeChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2.5 border-t border-slate-700 pt-4">
                    {top5LocationsByDowntime.map((l) => (
                      <HorizBar
                        key={l.id}
                        label={l.locationName}
                        value={l.avgDowntimePct}
                        max={top5LocationsByDowntime[0]?.avgDowntimePct || 1}
                        color={downtimeBarColor(l.avgDowntimePct)}
                        sub={`${l.avgDowntimePct}%`}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Locations with Most Outage Events */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                Most Location Outage Events
                <span className="ml-auto text-[11px] font-normal text-slate-400">top {top5LocationsByOutages.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationOutageChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={locationOutageChartData}
                        layout="vertical"
                        margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#cbd5e1" }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 10, fill: "#cbd5e1" }}
                        />
                        <Tooltip
                          contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                          formatter={(value: any, _: any, props: any) => [`${value} events`, props.payload.fullName]}
                        />
                        <Bar dataKey="value" fill="#f59e0b" name="Outage events" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2.5 border-t border-slate-700 pt-4">
                    {top5LocationsByOutages.map((l) => (
                      <HorizBar
                        key={l.id}
                        label={l.locationName}
                        value={l.totalOutageEvents ?? 0}
                        max={top5LocationsByOutages[0]?.totalOutageEvents || 1}
                        color="#f59e0b"
                        sub={`${l.totalOutageEvents ?? 0} events`}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Most / Least reliable ─────────────────────────────────────── */}
      {view === "devices" ? (
        (top5.length > 0 || bottom5.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />Most reliable devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top5.length === 0 ? <div className="text-slate-400 text-sm">No data.</div> : (
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
                  <AlertCircle className="h-5 w-5 text-red-300" />Least reliable devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bottom5.length === 0 ? <div className="text-slate-400 text-sm">No data.</div> : (
                  <ol className="space-y-1">
                    {bottom5.map((r, i) => (
                      <li key={r.device.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                        <span className="flex-1 truncate text-slate-100">{r.device.display || r.device.hostname}</span>
                        <span className={`font-semibold tabular-nums ${r.agg.uptimePct >= 80 ? "text-amber-300" : "text-red-300"}`}>
                          {fmtPct(r.agg.uptimePct)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        perLocation.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />Most reliable locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {topLocations.map((l, i) => (
                    <li key={l.name} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                      <span className="flex-1 truncate text-slate-100">{l.name}</span>
                      <span className="text-emerald-300 font-semibold tabular-nums">{fmtPct(l.avgUptime)}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-300" />Least reliable locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {bottomLocations.map((l, i) => (
                    <li key={l.name} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                      <span className="flex-1 truncate text-slate-100">{l.name}</span>
                      <span className={`font-semibold tabular-nums ${l.avgUptime >= 80 ? "text-amber-300" : "text-red-300"}`}>
                        {fmtPct(l.avgUptime)}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* ── Charts (toggle) ───────────────────────────────────────────── */}
      {view === "devices" ? (
        <>
          {/* Device status over time */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Signal className="h-5 w-5 text-emerald-300" />
                Device Status
                <span className="ml-auto text-[11px] font-normal text-slate-400">
                  of {devices.length} device{devices.length !== 1 ? "s" : ""} in scope
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusLineSeries.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  {loading ? "Loading…" : "No availability data"}
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statusLineSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} allowDecimals={false}
                        domain={[0, Math.max(1, devices.length)]}
                        label={{ value: "Devices", angle: -90, position: "insideLeft", style: { fill: "#94a3b8", fontSize: 11 } }} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                        labelStyle={{ color: "#cbd5e1" }}
                        formatter={(value: any, name: any) => {
                          const pct = Math.round((Number(value) / (devices.length || 1)) * 100);
                          return [`${value} (${pct}%)`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                      <Line type="monotone" dataKey="online"  stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Online" />
                      <Line type="monotone" dataKey="offline" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Offline" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latency */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" />Average Latency
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

          {/* Packet loss */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-300" />Packet Loss
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
        </>
      ) : (
        <>
          {/* Per-location avg uptime */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-300" />Locations — Avg Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locSeries.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No location data</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#cbd5e1" }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} unit="%" domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }} labelStyle={{ color: "#cbd5e1" }} />
                      <ReferenceArea y1={0}  y2={80}  fill="#ef4444" fillOpacity={0.05} />
                      <ReferenceArea y1={80} y2={95}  fill="#fbbf24" fillOpacity={0.05} />
                      <ReferenceArea y1={95} y2={100} fill="#16a34a" fillOpacity={0.05} />
                      <Bar dataKey="uptime" fill="#10b981" name="Avg uptime (%)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-location avg latency */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" />Locations — Avg Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locSeries.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No location data</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#cbd5e1" }} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} unit=" ms" />
                      <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }} labelStyle={{ color: "#cbd5e1" }} />
                      <Bar dataKey="latency" fill="#22d3ee" name="Avg latency (ms)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}