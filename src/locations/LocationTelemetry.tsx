import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from "recharts";
import { Activity, Clock, Gauge, AlertCircle, Signal, TrendingUp } from "lucide-react";
import {
  computeRange,
  fetchDeviceHistory,
  fetchDeviceUptime,
  type HistoryEntry,
  type UptimeData,
  type TimeRangeKey,
  type Granularity,
} from "@/lib/useDeviceTelemetry";

interface DeviceMin {
  id: number;
  hostname?: string;
}

interface LocationTelemetryProps {
  devices: DeviceMin[];
  title?: string;
  entityLabel?: string;
}

interface Bucket {
  bucketStart: number;       // epoch ms (truncated)
  timeLabel: string;
  online: number;
  offline: number;
  total: number;
  latencySum: number;
  latencyCount: number;
  jitterSum: number;
  jitterCount: number;
  lossSum: number;
  lossCount: number;
}

function bucketSize(granularity: Granularity) {
  if (granularity === "daily")  return 24 * 60 * 60 * 1000;
  if (granularity === "hourly") return 60 * 60 * 1000;
  return 5 * 60 * 1000; // raw → 5-minute aggregation
}

function StatTile({
  label, value, accent = "cyan", icon, sub,
}: {
  label: string; value: string; accent?: "cyan" | "emerald" | "amber" | "red" | "violet"; icon?: React.ReactNode; sub?: string;
}) {
  const a: Record<string, { fg: string; bg: string; border: string }> = {
    cyan:    { fg: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-600/30" },
    emerald: { fg: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-600/30" },
    amber:   { fg: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-600/30" },
    red:     { fg: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-600/30" },
    violet:  { fg: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-600/30" },
  };
  const c = a[accent];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
      <div className="flex items-center gap-2 text-xs text-slate-300">
        {icon}<span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${c.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function LocationTelemetry({
  devices,
  title = "Location Analytics",
  entityLabel = "location",
}: LocationTelemetryProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("24h");
  const [granularity, setGranularity] = useState<Granularity>("hourly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perDeviceHistory, setPerDeviceHistory] = useState<Record<number, HistoryEntry[]>>({});
  const [perDeviceUptime,  setPerDeviceUptime]  = useState<Record<number, UptimeData>>({});

  const deviceIdsKey = useMemo(() => devices.map(d => d.id).sort().join(","), [devices]);

  useEffect(() => {
    if (devices.length === 0) {
      setPerDeviceHistory({});
      setPerDeviceUptime({});
      return;
    }

    const { start, end, granularity: gran } = computeRange({ timeRange, granularity, customStart, customEnd });
    const summaryRange: "24h" | "7d" | "30d" =
      timeRange === "7d"  ? "7d"  :
      timeRange === "30d" ? "30d" : "24h";

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled(
      devices.map(async (d) => {
        const [hist, up] = await Promise.allSettled([
          fetchDeviceHistory(d.id, start, end, gran),
          fetchDeviceUptime(d.id, summaryRange),
        ]);
        return {
          id: d.id,
          hist: hist.status === "fulfilled" ? hist.value : [],
          up:   up.status   === "fulfilled" ? up.value   : null,
        };
      }),
    ).then((settled) => {
      if (cancelled) return;
      const histMap: Record<number, HistoryEntry[]> = {};
      const upMap:   Record<number, UptimeData>     = {};
      let anySuccess = false;
      settled.forEach((r) => {
        if (r.status === "fulfilled") {
          histMap[r.value.id] = r.value.hist;
          if (r.value.up) upMap[r.value.id] = r.value.up;
          if (r.value.hist.length > 0 || r.value.up) anySuccess = true;
        }
      });
      setPerDeviceHistory(histMap);
      setPerDeviceUptime(upMap);
      if (!anySuccess && devices.length > 0) setError("No telemetry available for this location yet");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [deviceIdsKey, timeRange, granularity, customStart, customEnd]);

  // ────────────────────────────────────────────────────────────────────────
  // Bucketed aggregates for the charts
  // ────────────────────────────────────────────────────────────────────────
  const buckets = useMemo<Bucket[]>(() => {
    if (Object.keys(perDeviceHistory).length === 0) return [];

    const { granularity: gran } = computeRange({ timeRange, granularity, customStart, customEnd });
    const size = bucketSize(gran);
    const map = new Map<number, Bucket>();

    Object.values(perDeviceHistory).forEach((entries) => {
      entries.forEach((e) => {
        const t = new Date(e.timestamp).getTime();
        const bucketStart = Math.floor(t / size) * size;
        let b = map.get(bucketStart);
        if (!b) {
          b = {
            bucketStart,
            timeLabel: new Date(bucketStart).toLocaleString(),
            online: 0, offline: 0, total: 0,
            latencySum: 0, latencyCount: 0,
            jitterSum: 0, jitterCount: 0,
            lossSum: 0, lossCount: 0,
          };
          map.set(bucketStart, b);
        }
        b.total++;
        if (e.is_reachable) b.online++; else b.offline++;
        if (typeof e.latency_ms === "number") { b.latencySum += e.latency_ms; b.latencyCount++; }
        if (typeof e.jitter_ms === "number")  { b.jitterSum  += e.jitter_ms;  b.jitterCount++; }
        if (typeof e.packet_loss_percent === "number") { b.lossSum += e.packet_loss_percent; b.lossCount++; }
      });
    });

    return [...map.values()].sort((a, b) => a.bucketStart - b.bucketStart);
  }, [perDeviceHistory, timeRange, granularity, customStart, customEnd]);

  // Devices-online series — counts each device's *current state* at the end of
  // every bucket, not raw probe counts. State at time T = the most recent
  // probe at or before T; devices with no probes yet show as "no data".
  const availabilitySeries = useMemo(() => {
    if (buckets.length === 0 || devices.length === 0) return [];

    const size = bucketSize(
      computeRange({ timeRange, granularity, customStart, customEnd }).granularity,
    );

    type Track = { sorted: HistoryEntry[]; pointer: number; state: boolean | null };
    const tracks: Track[] = devices.map((d) => ({
      sorted: [...(perDeviceHistory[d.id] ?? [])].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
      pointer: 0,
      state: null,
    }));

    return buckets.map((b) => {
      const bucketEnd = b.bucketStart + size;
      let online = 0, offline = 0, noData = 0;
      for (const t of tracks) {
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
      return { timeLabel: b.timeLabel, online, offline, noData };
    });
  }, [buckets, devices, perDeviceHistory, timeRange, granularity, customStart, customEnd]);

  const latencySeries = buckets.map(b => ({
    timeLabel: b.timeLabel,
    latency: b.latencyCount ? +(b.latencySum / b.latencyCount).toFixed(2) : null,
  }));

  const jitterSeries = buckets.map(b => ({
    timeLabel: b.timeLabel,
    jitter: b.jitterCount ? +(b.jitterSum / b.jitterCount).toFixed(2) : null,
  }));

  const lossSeries = buckets.map(b => ({
    timeLabel: b.timeLabel,
    loss: b.lossCount ? +(b.lossSum / b.lossCount).toFixed(2) : 0,
  }));

  // Per-device uptime ranking (for the table)
  const perDeviceRanked = useMemo(() => {
    return devices.map(d => ({
      id: d.id,
      hostname: d.hostname ?? `Device #${d.id}`,
      uptime: perDeviceUptime[d.id]?.uptime_pct ?? null,
      latency: perDeviceUptime[d.id]?.avg_latency_ms ?? null,
      loss: perDeviceUptime[d.id]?.avg_packet_loss_percent ?? null,
      jitter: perDeviceUptime[d.id]?.avg_jitter_ms ?? null,
    })).sort((a, b) => (b.uptime ?? -1) - (a.uptime ?? -1));
  }, [devices, perDeviceUptime]);

  // Aggregate KPIs
  const aggKpis = useMemo(() => {
    const summaries = Object.values(perDeviceUptime);
    if (summaries.length === 0) {
      return { avgUptime: 0, avgLatency: 0, avgJitter: 0, avgLoss: 0, totalChecks: 0 };
    }
    const sum = (sel: (u: UptimeData) => number) => summaries.reduce((s, u) => s + sel(u), 0);
    return {
      avgUptime:   sum(u => u.uptime_pct) / summaries.length,
      avgLatency:  sum(u => u.avg_latency_ms) / summaries.length,
      avgJitter:   sum(u => u.avg_jitter_ms) / summaries.length,
      avgLoss:     sum(u => u.avg_packet_loss_percent) / summaries.length,
      totalChecks: sum(u => u.total_checks),
    };
  }, [perDeviceUptime]);

  const noDevices = devices.length === 0;

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Activity className="h-5 w-5 text-cyan-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {(["24h", "7d", "30d", "custom"] as TimeRangeKey[]).map((rk) => (
              <Button
                key={rk}
                size="sm"
                variant="ghost"
                className={
                  timeRange === rk
                    ? "bg-cyan-500 text-white hover:bg-cyan-400"
                    : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                }
                onClick={() => {
                  setTimeRange(rk);
                  if (rk === "24h") setGranularity("hourly");
                  else if (rk === "7d" || rk === "30d") setGranularity("daily");
                }}
              >
                {rk === "24h" ? "24 hours" : rk === "7d" ? "1 week" : rk === "30d" ? "1 month" : "Custom"}
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400">Granularity:</span>
              <select
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as Granularity)}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="raw">Raw</option>
              </select>
            </div>
          </div>

          {timeRange === "custom" && (
            <div className="flex flex-wrap gap-3 mt-3 items-end">
              <div className="flex flex-col text-xs text-slate-400">
                <label className="mb-1">Start</label>
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
                />
              </div>
              <div className="flex flex-col text-xs text-slate-400">
                <label className="mb-1">End</label>
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Avg Uptime"
          value={aggKpis.avgUptime ? `${aggKpis.avgUptime.toFixed(1)}%` : "—"}
          accent={aggKpis.avgUptime >= 95 ? "emerald" : aggKpis.avgUptime >= 80 ? "amber" : "red"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          sub={`${devices.length} device${devices.length !== 1 ? "s" : ""} · ${aggKpis.totalChecks} checks`}
        />
        <StatTile
          label="Avg Latency"
          value={aggKpis.avgLatency ? `${aggKpis.avgLatency.toFixed(1)} ms` : "—"}
          accent="cyan"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Avg Jitter"
          value={aggKpis.avgJitter ? `${aggKpis.avgJitter.toFixed(1)} ms` : "—"}
          accent="violet"
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Avg Packet Loss"
          value={aggKpis.avgLoss ? `${aggKpis.avgLoss.toFixed(2)}%` : "—"}
          accent={aggKpis.avgLoss > 1 ? "red" : "emerald"}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Loading / empty notices */}
      {loading && (
        <div className="text-xs text-cyan-300 flex items-center gap-2">
          <span className="size-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          Aggregating telemetry across {devices.length} device{devices.length !== 1 ? "s" : ""}…
        </div>
      )}
      {error && !loading && (
        <div className="text-xs text-amber-300">{error}</div>
      )}
      {noDevices && !loading && (
        <div className="text-xs text-slate-400">No devices linked to this {entityLabel} yet.</div>
      )}

      {/* Devices online over time — counts device states, not probes */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Signal className="h-5 w-5 text-emerald-300" />
            Devices Status 
            <span className="ml-auto text-[11px] font-normal text-slate-400">
              of {devices.length} device{devices.length !== 1 ? "s" : ""} at this {entityLabel}
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
                    <linearGradient id="loc-online" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#10b981" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="loc-offline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="loc-nodata" x1="0" y1="0" x2="0" y2="1">
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
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                    labelStyle={{ color: "#cbd5e1" }}
                    formatter={(value: any, name: any) => {
                      const total = devices.length || 1;
                      const pct = Math.round((Number(value) / total) * 100);
                      return [`${value} (${pct}%)`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
                  <Area type="monotone" dataKey="online"  stackId="1" stroke="#10b981" fill="url(#loc-online)"  strokeWidth={2} name="Online" />
                  <Area type="monotone" dataKey="offline" stackId="1" stroke="#ef4444" fill="url(#loc-offline)" strokeWidth={2} name="Offline" />
                  <Area type="monotone" dataKey="noData"  stackId="1" stroke="#64748b" fill="url(#loc-nodata)"  strokeWidth={1} name="No data" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latency average across location */}
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
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
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

      {/* Jitter + Loss */}
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
                      <linearGradient id="loc-jitter" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                      labelStyle={{ color: "#cbd5e1" }}
                    />
                    <Area type="monotone" dataKey="jitter" stroke="#8b5cf6" strokeWidth={2} fill="url(#loc-jitter)" name="Jitter (ms)" />
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
              Average Packet Loss
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
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                      labelStyle={{ color: "#cbd5e1" }}
                    />
                    <Bar dataKey="loss" fill="#ef4444" name="Avg loss (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-device uptime breakdown */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            Per-Device Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          {perDeviceRanked.length === 0 ? (
            <div className="text-slate-400 text-sm">No devices.</div>
          ) : (
            <div className="space-y-1">
              {perDeviceRanked.map((row) => {
                const u = row.uptime;
                const barColor = u === null ? "bg-slate-600"
                  : u >= 95 ? "bg-emerald-400"
                  : u >= 80 ? "bg-amber-400"
                  : "bg-red-400";
                const textColor = u === null ? "text-slate-400"
                  : u >= 95 ? "text-emerald-300"
                  : u >= 80 ? "text-amber-300"
                  : "text-red-300";
                return (
                  <div key={row.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-slate-700/40">
                    <div className="w-1/3 truncate text-sm text-slate-100">{row.hostname}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${u ?? 0}%` }} />
                    </div>
                    <div className={`w-16 text-right text-xs font-semibold tabular-nums ${textColor}`}>
                      {u === null ? "—" : `${u.toFixed(1)}%`}
                    </div>
                    <div className="w-20 text-right text-xs text-slate-400 tabular-nums">
                      {row.latency === null ? "—" : `${row.latency.toFixed(1)} ms`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
