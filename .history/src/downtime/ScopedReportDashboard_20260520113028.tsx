import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Legend,
} from "recharts";
import {
   Clock, Gauge, AlertCircle, Signal, TrendingUp,
  MapPin, Smartphone,
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
} from "@/history/scoped-tables";

// Bounded concurrency for per-device history fetches.
const FETCH_CONCURRENCY = 5;
import {
  type RangeKey,
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

  /** Optional controlled timeline range (owned by the page topbar). When
   *  provided, the in-dashboard Timeline selector is hidden. */
  range?: RangeKey;
  onRangeChange?: (r: RangeKey) => void;

  /** When provided, a back arrow is shown in the Report-scope header. */
  onBack?: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Aggregation helpers now live in @/lib/telemetry-aggregate (shared with the
// History landing page so its area cards can be recomputed from telemetry).
// ──────────────────────────────────────────────────────────────────────────────

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
  // Devices ⇄ Locations toggle — now driven by the global top-bar toggle so
  // it sits just before Logout (mirroring the Dashboard's mode toggle).
  const { view } = useHistoryView();

  const deviceIdsKey = useMemo(() => devices.map((d: any) => d.id).sort().join(","), [devices]);

  // Fetch on scope/range change
  useEffect(() => {
    if (devices.length === 0) {
      setPerDevice([]);
      return;
    }
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
        history: await fetchDeviceHistory(d.id, start, end, granularity),
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

  // ── Availability: count devices in each state at each time bucket ────────
  // Instead of stacking raw probe counts (which depends on per-device check
  // intervals), we compute "how many devices were online / offline" at the
  // end of every bucket. A device's state at time T is its most recent probe
  // result at or before T. Devices with no probes yet show as "no data".
  const availabilitySeries = useMemo(() => {
    if (perDevice.length === 0 || buckets.length === 0) return [];

    const { bucketSize: size } = rangeToWindow(range);

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
  // Two-line "device status" series: Online (green) & Offline (red), with a
  // synthetic zero point at the window start so both lines rise from origin.
  const statusLineSeries = useMemo(() => {
    if (availabilitySeries.length === 0) return [];
    const { start } = rangeToWindow(range);
    return [
      { timeLabel: start.toLocaleString(), online: 0, offline: 0 },
      ...availabilitySeries.map((p) => ({
        timeLabel: p.timeLabel, online: p.online, offline: p.offline,
      })),
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

  // Per-device ranking
  const ranked = useMemo(
    () => [...perDevice].sort((a, b) => b.agg.uptimePct - a.agg.uptimePct),
    [perDevice],
  );

  // Per-location summary. Device state over the range = its last probe in
  // the window (`lastState`), so the location table reflects the timeline.
  const perLocation = useMemo(() => {
    const map = new Map<string, {
      name: string; type?: string; area?: string;
      deviceCount: number;
      onlineLast: number; offlineLast: number; noData: number;
      uptimeSum: number; uptimeCount: number;
      latencySum: number; latencyCount: number;
      incidents: number;
    }>();
    for (const r of perDevice) {
      const locObj: any = locations.find((l: any) => String(l.id) === String(r.device.location_id));
      const name = r.device.location?.name || locObj?.name || "Unknown";
      let m = map.get(name);
      if (!m) {
        m = {
          name,
          type: locObj?.type_name || locObj?.location_type || r.device.location?.type?.name,
          area: locObj?.area || r.device.location?.area || r.device.worker?.name,
          deviceCount: 0, onlineLast: 0, offlineLast: 0, noData: 0,
          uptimeSum: 0, uptimeCount: 0, latencySum: 0, latencyCount: 0, incidents: 0,
        };
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
        name: m.name,
        type: m.type,
        area: m.area,
        deviceCount: m.deviceCount,
        onlineLast: m.onlineLast,
        offlineLast: m.offlineLast,
        noData: m.noData,
        hasData: m.uptimeCount > 0,
        // Location "online" over the range = ≥1 device up at the window end.
        statusOnline: (m.onlineLast > 0 ? true : m.offlineLast > 0 ? false : null) as boolean | null,
        avgUptime: m.uptimeCount ? m.uptimeSum / m.uptimeCount : 0,
        avgLatency: m.latencyCount ? m.latencySum / m.latencyCount : 0,
        incidents: m.incidents,
      }))
      .sort((a, b) => b.avgUptime - a.avgUptime);
  }, [perDevice, locations]);

  // Rows for the Dashboard-styled scoped tables - DOWNTIME VERSION
  const scopedDeviceDowntimeRows = useMemo(
    () => [...perDevice]
      .sort((a, b) =>
        (a.device.display || a.device.hostname || "").localeCompare(
          b.device.display || b.device.hostname || "",
        ),
      )
      .map((r) => {
        const totalProbes = r.history.length || 1;
        const offlineCount = r.history.filter((h: any) => !h.is_reachable).length;
        const onlineCount = r.history.filter((h: any) => h.is_reachable).length;
        const downtimePct = Math.round((offlineCount / totalProbes) * 100);
        return {
          id: r.device.id,
          deviceName: r.device.display || r.device.hostname || `Device ${r.device.id}`,
          ip: r.device.ip_address || r.device.ip || "N/A",
          area: r.device.worker?.name || r.device.location?.area || "N/A",
          location: r.device.location?.name || "N/A",
          type: r.device.device_type?.name || r.device.type || "N/A",
          downtimePct,
          offlineCount,
          onlineCount,
          downtimeRecords: r.history
            .filter((h: any) => !h.is_reachable)
            .map((h: any, idx: number) => ({
              id: idx,
              timestamp: h.timestamp,
              remarks: "",
            })),
        };
      }),
    [perDevice],
  );

  const scopedLocationDowntimeRows = useMemo(() => {
    const map = new Map<string, {
      name: string;
      area?: string;
      locationId: string | number;
      deviceCount: number;
      totalDowntime: number;
    }>();
    for (const r of perDevice) {
      const locObj: any = locations.find((l: any) => String(l.id) === String(r.device.location_id));
      const name = r.device.location?.name || locObj?.name || "Unknown";
      const locId = r.device.location_id;
      let m = map.get(name);
      if (!m) {
        m = {
          name,
          area: locObj?.area || r.device.location?.area || r.device.worker?.name,
          locationId: locId,
          deviceCount: 0,
          totalDowntime: 0,
        };
        map.set(name, m);
      }
      m.deviceCount++;
      const totalProbes = r.history.length || 1;
      const offlineCount = r.history.filter((h: any) => !h.is_reachable).length;
      const downtimePct = Math.round((offlineCount / totalProbes) * 100);
      m.totalDowntime += downtimePct;
    }
    return [...map.values()]
      .map((m) => ({
        id: m.locationId,
        locationName: m.name,
        area: m.area,
        deviceCount: m.deviceCount,
        avgDowntimePct: Math.round(m.totalDowntime / m.deviceCount),
      }))
      .sort((a, b) => b.avgDowntimePct - a.avgDowntimePct);
  }, [perDevice, locations]);

  // Top / Bottom 5 by uptime — devices
  const top5 = ranked.filter((r) => r.agg.totalChecks > 0).slice(0, 5);
  const bottom5 = ranked.filter((r) => r.agg.totalChecks > 0).slice(-5).reverse();

  // ── Summary metrics for the first row ──
  const onlineNow = useMemo(
    () => devices.filter((d: any) => d.is_reachable).length,
    [devices],
  );
  const totalLocations = useMemo(
    () => new Set(devices.map((d: any) => d.location_id)).size,
    [devices],
  );
  // Locations with ≥1 device reachable now — mirrors the "N online now"
  // sub-label on the Total Devices tile.
  const onlineLocations = useMemo(() => {
    const up = new Map<any, boolean>();
    for (const d of devices as any[]) {
      up.set(d.location_id, (up.get(d.location_id) ?? false) || !!d.is_reachable);
    }
    let n = 0;
    up.forEach((v) => { if (v) n++; });
    return n;
  }, [devices]);
  const locationAvgUptime = useMemo(
    () => (perLocation.length
      ? perLocation.reduce((s, l) => s + l.avgUptime, 0) / perLocation.length
      : 0),
    [perLocation],
  );

  // ── Location reliability ranking + chart series ──
  const topLocations = perLocation.slice(0, 5);
  const bottomLocations = perLocation.length > 5
    ? [...perLocation].slice(-5).reverse()
    : [...perLocation].reverse();
  const locSeries = useMemo(
    () => perLocation.map((l) => ({
      name: l.name,
      uptime: +l.avgUptime.toFixed(1),
      latency: +l.avgLatency.toFixed(1),
    })),
    [perLocation],
  );

  const uptimeAccent = (p: number): "emerald" | "amber" | "red" =>
    p >= 95 ? "emerald" : p >= 80 ? "amber" : "red";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Blocking progress modal while per-device telemetry is fetched. */}
      <TelemetryProgressDialog
        open={loading}
        done={progress.done}
        total={progress.total}
        label="Fetching telemetry"
      />

      {error && !loading && (
        <div className="text-amber-300 text-xs px-1">{error}</div>
      )}

      {/* ── First row: 4 summary metrics ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Total Devices"
          value={String(devices.length)}
          accent="slate"
          icon={<Smartphone className="h-3.5 w-3.5" />}
          sub={`${onlineNow} online now`}
        />
        <StatTile
          label="Total Locations"
          value={String(totalLocations)}
          accent="slate"
          icon={<MapPin className="h-3.5 w-3.5" />}
          sub={`${onlineLocations} online now`}
        />
        <StatTile
          label="Devices Avg Uptime"
          value={fmtPct(overall.uptimePct)}
          accent={uptimeAccent(overall.uptimePct)}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          sub={`${overall.onlineChecks}/${overall.totalChecks} checks`}
        />
        <StatTile
          label="Location Avg Uptime"
          value={fmtPct(locationAvgUptime)}
          accent={uptimeAccent(locationAvgUptime)}
          icon={<Gauge className="h-3.5 w-3.5" />}
        />
      </div>

      {/* ── Table (toggle) — Dashboard-styled, scoped & read-only ─────── */}
      {view === "devices" ? (
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-cyan-400" />
              Devices
              <span className="ml-auto text-[11px] font-normal text-slate-400">
                {scopedDeviceRows.length} in scope
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScopedDevicesTable rows={scopedDeviceRows} />
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-cyan-400" />
              Locations
              <span className="ml-auto text-[11px] font-normal text-slate-400">
                {scopedLocationRows.length} in scope
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScopedLocationsTable rows={scopedLocationRows} />
          </CardContent>
        </Card>
      )}

      {/* ── Most / Least reliable (toggle) ────────────────────────────── */}
      {view === "devices" ? (
        (top5.length > 0 || bottom5.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                  Most reliable devices
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
                  Least reliable devices
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
        )
      ) : (
        perLocation.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                  Most reliable locations
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
                  <AlertCircle className="h-5 w-5 text-red-300" />
                  Least reliable locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {bottomLocations.map((l, i) => (
                    <li key={l.name} className="flex items-center gap-2 text-sm">
                      <span className="w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                      <span className="flex-1 truncate text-slate-100">{l.name}</span>
                      <span className={`font-semibold tabular-nums ${
                        l.avgUptime >= 80 ? "text-amber-300" : "text-red-300"
                      }`}>{fmtPct(l.avgUptime)}</span>
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
          {/* Device status over time — Online (green) vs Offline (red),
              both rising from the origin (0) at the window start. */}
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
                      <YAxis
                        tick={{ fontSize: 10, fill: "#cbd5e1" }}
                        allowDecimals={false}
                        domain={[0, Math.max(1, devices.length)]}
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

          {/* Packet loss */}
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
        </>
      ) : (
        <>
          {/* Per-location avg uptime */}
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                Locations — Avg Uptime
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
                <Clock className="h-5 w-5 text-cyan-400" />
                Locations — Avg Latency
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
