import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, AreaChart, Area, BarChart, Bar,
} from "recharts";
import { Activity, AlertCircle, Clock, Gauge, Signal, TrendingUp, TrendingDown, Zap } from "lucide-react";
import {
  useDeviceTelemetry,
  type TimeRangeKey,
  type Granularity,
} from "@/lib/useDeviceTelemetry";

const getLatencyColor = (latency: number) => {
  if (latency <= 80)  return { label: "Excellent", color: "#22c55e", className: "text-emerald-300" };
  if (latency <= 120) return { label: "Warning",   color: "#f59e0b", className: "text-amber-300" };
  return                       { label: "High",      color: "#ef4444", className: "text-red-300" };
};

function StatTile({
  label, value, accent = "cyan", icon, sub,
}: {
  label: string; value: string; accent?: "cyan" | "emerald" | "amber" | "red" | "violet"; icon?: React.ReactNode; sub?: string;
}) {
  const accents: Record<string, { fg: string; bg: string; border: string }> = {
    cyan:    { fg: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-600/30" },
    emerald: { fg: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-600/30" },
    amber:   { fg: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-600/30" },
    red:     { fg: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-600/30" },
    violet:  { fg: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-600/30" },
  };
  const a = accents[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-3`}>
      <div className="flex items-center gap-2 text-xs text-slate-300">
        {icon} <span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${a.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export interface DeviceHistoryViewProps {
  deviceId: number;
  deviceName?: string;
}

export default function DeviceHistoryView({ deviceId, deviceName }: DeviceHistoryViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("24h");
  const [granularity, setGranularity] = useState<Granularity>("hourly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const {
    history, historyLoading, historyError,
    uptime,
  } = useDeviceTelemetry(deviceId, { timeRange, granularity, customStart, customEnd });

  const latencySeries = useMemo(
    () => history
      .filter((e) => e.latency_ms !== undefined && e.latency_ms !== null)
      .map((e) => ({
        timestamp: e.timestamp,
        timeLabel: new Date(e.timestamp).toLocaleString(),
        latency: Number(e.latency_ms.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [history],
  );

  const jitterSeries = useMemo(
    () => history
      .filter((e) => e.jitter_ms !== undefined && e.jitter_ms !== null)
      .map((e) => ({
        timeLabel: new Date(e.timestamp).toLocaleString(),
        jitter: Number(e.jitter_ms.toFixed(2)),
      })),
    [history],
  );

  const lossSeries = useMemo(
    () => history
      .filter((e) => e.packet_loss_percent !== undefined && e.packet_loss_percent !== null)
      .map((e) => ({
        timeLabel: new Date(e.timestamp).toLocaleString(),
        loss: Number(e.packet_loss_percent.toFixed(2)),
      })),
    [history],
  );

  const reachabilitySeries = useMemo(
    () => history.map((e) => ({
      timeLabel: new Date(e.timestamp).toLocaleString(),
      reachable: e.is_reachable ? 1 : 0,
    })),
    [history],
  );

  const avgLatency = useMemo(() => {
    if (!latencySeries.length) return 0;
    return latencySeries.reduce((s, e) => s + e.latency, 0) / latencySeries.length;
  }, [latencySeries]);

  const latencySummary = getLatencyColor(avgLatency);

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base text-white">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              {deviceName ? `${deviceName} — History` : "Device History"}
            </span>
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
                  else if (rk === "7d") setGranularity("daily");
                  else if (rk === "30d") setGranularity("daily");
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

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Uptime"
          value={uptime ? `${uptime.uptime_pct.toFixed(1)}%` : "—"}
          accent={uptime && uptime.uptime_pct >= 95 ? "emerald" : uptime && uptime.uptime_pct >= 80 ? "amber" : "red"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          sub={uptime ? `${uptime.online_checks} of ${uptime.total_checks} checks` : undefined}
        />
        <StatTile
          label="Avg Latency"
          value={uptime ? `${uptime.avg_latency_ms.toFixed(1)} ms` : "—"}
          accent="cyan"
          icon={<Clock className="h-3.5 w-3.5" />}
          sub={uptime ? `Max ${uptime.max_latency_ms.toFixed(1)} ms` : undefined}
        />
        <StatTile
          label="Avg Jitter"
          value={uptime ? `${uptime.avg_jitter_ms.toFixed(1)} ms` : "—"}
          accent="violet"
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
        <StatTile
          label="Packet Loss"
          value={uptime ? `${uptime.avg_packet_loss_percent.toFixed(2)}%` : "—"}
          accent={uptime && uptime.avg_packet_loss_percent > 1 ? "red" : "emerald"}
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          sub={uptime ? `Longest down: ${Math.round(uptime.longest_downtime_seconds / 60)}m` : undefined}
        />
      </div>

      {/* Power events row */}
      {uptime && (
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Power Cuts"
            value={String(uptime.power_cut_count ?? 0)}
            accent={uptime.power_cut_count > 0 ? "red" : "emerald"}
            icon={<Zap className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Power Restored"
            value={String(uptime.power_restored_count ?? 0)}
            accent="amber"
            icon={<Zap className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* Latency line */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            Latency over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
          ) : historyError ? (
            <div className="h-64 flex items-center justify-center text-red-300 text-sm">{historyError}</div>
          ) : latencySeries.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data for this range</div>
          ) : (
            <div className="h-64">
              <div className="mb-2 text-xs">
                <span className="text-slate-400">Average:</span>
                <span className={`ml-2 font-semibold ${latencySummary.className}`}>
                  {avgLatency.toFixed(2)} ms ({latencySummary.label})
                </span>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={latencySeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} domain={[0, "dataMax + 10"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Line type="monotone" dataKey="latency" stroke={latencySummary.color} strokeWidth={2} dot={false} name="Latency (ms)" />
                  <ReferenceArea y1={0}   y2={80}        fill="#16a34a" fillOpacity={0.05} />
                  <ReferenceArea y1={80}  y2={120}       fill="#fbbf24" fillOpacity={0.05} />
                  <ReferenceArea y1={120} y2="dataMax"   fill="#ef4444" fillOpacity={0.05} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jitter + Loss side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Gauge className="h-5 w-5 text-violet-300" />
              Jitter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jitterSeries.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={jitterSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="jitter-grad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="jitter" stroke="#8b5cf6" strokeWidth={2} fill="url(#jitter-grad)" name="Jitter (ms)" />
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
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lossSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                      labelStyle={{ color: "#cbd5e1" }}
                    />
                    <Bar dataKey="loss" fill="#ef4444" name="Packet loss (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reachability strip */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Signal className="h-5 w-5 text-emerald-300" />
            Reachability timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reachabilitySeries.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reachabilitySeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="reach-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#cbd5e1" }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} domain={[0, 1]} ticks={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#e2e8f0", fontSize: 12 }}
                    formatter={(v: any) => (v === 1 ? "Online" : "Offline")}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="reachable"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#reach-grad)"
                    name="Reachable"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Trend icon export (small utility used by callers if they want to show a compact trend). */
export function TrendArrow({ pct }: { pct: number }) {
  if (pct > 0.5) return <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />;
  if (pct < -0.5) return <TrendingDown className="h-3.5 w-3.5 text-red-300" />;
  return <span className="h-3.5 w-3.5 inline-block" />;
}
