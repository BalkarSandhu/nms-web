import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices, fetchDeviceTypes } from "@/store/deviceSlice";
import { fetchLocations, fetchLocationsforMap } from "@/store/locationsSlice";
import { fetchWorkers } from "@/store/workerSlice";
import { Card, CardContent } from "@/components/ui/card";
import { History as HistoryIcon, Clock, ChevronDown, Download } from "lucide-react";

import DeviceHistoryView from "@/components/device-history-view";
import ScopedReportDashboard from "@/downtime/ScopedReportDashboard";
import ReportDialog from "@/downtime/ReportDialog";
import { useHistoryRange } from "@/contexts/HistoryRangeContext";
import { useHistoryNav } from "@/contexts/HistoryNavContext";
import { useHistoryView } from "@/contexts/HistoryViewContext";
import { fetchDeviceHistory, mapLimit } from "@/lib/useDeviceTelemetry";
import { rangeToWindow } from "@/lib/telemetry-aggregate";
import TelemetryProgressDialog from "@/components/telemetry-progress-dialog";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/report-generator";

// Bounded concurrency for per-device history fetches (mirrors the report view).
const FETCH_CONCURRENCY = 5;

const RANGE_DISPLAY: Record<RangeKey, string> = {
  "1h":  "1 Hour",
  "24h": "24 Hours",
  "7d":  "7 Days",
  "30d": "30 Days",
  "90d": "3 Months",
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL CACHE — Persists across component unmounts and page navigations
// ══════════════════════════════════════════════════════════════════════════════
const telemetryCache = new Map<string, any[]>();

function getCacheKey(deviceId: number, range: string): string {
  const hourBucket = new Date().toISOString().slice(0, 13);
  return `${deviceId}_${range}_${hourBucket}`;
}

export default function DowntimePage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setBack } = useHistoryNav();
  const { range: contextRange } = useHistoryRange();
  const { view } = useHistoryView();

  // Local range state — overrides the context so the dropdown on this page
  // can drive data fetches without requiring a context setter.
  const [range, setRange] = useState<RangeKey>((contextRange as RangeKey) ?? "1h");
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setRangeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);

  const { devices = [], deviceTypes = [] } = useAppSelector((s) => s.devices);
  const { locations = [] }                = useAppSelector((s) => s.locations);
  const { workers = [] }                  = useAppSelector((s) => s.workers);

  useEffect(() => {
    if (devices.length === 0)     dispatch(fetchAllDevices());
    if (deviceTypes.length === 0) dispatch(fetchDeviceTypes());
    if (locations.length === 0) {
      dispatch(fetchLocations());
      dispatch(fetchLocationsforMap());
    }
    if (workers.length === 0)     dispatch(fetchWorkers({}));
  }, [dispatch]);

  // ─── Selection state (deep-linkable) ───────────────────────────────────────
  const [areaId, setAreaId]         = useState<string>(searchParams.get("area")     ?? "");
  const [locationId, setLocationId] = useState<string>(searchParams.get("location") ?? "");
  const [typeId, setTypeId]         = useState<string>(searchParams.get("type")     ?? "");
  const [deviceId, setDeviceId]     = useState<string>(searchParams.get("id")       ?? "");

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (areaId)     next.set("area", areaId);         else next.delete("area");
    if (locationId) next.set("location", locationId); else next.delete("location");
    if (typeId)     next.set("type", typeId);         else next.delete("type");
    if (deviceId)   next.set("id", deviceId);         else next.delete("id");
    setSearchParams(next, { replace: true });
  }, [areaId, locationId, typeId, deviceId]);

  const areasSorted = useMemo(
    () => [...workers].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [workers],
  );

  const devicesFiltered = useMemo(() => {
    let list = devices as any[];
    if (areaId)     list = list.filter((d) => String(d.worker_id ?? "") === areaId);
    if (locationId) list = list.filter((d) => String(d.location_id ?? "") === locationId);
    if (typeId)     list = list.filter((d) => String(d.device_type_id ?? "") === typeId);
    return list;
  }, [devices, areaId, locationId, typeId]);

  useEffect(() => {
    if (!deviceId) return;
    const stillValid = devicesFiltered.some((d: any) => String(d.id) === deviceId);
    if (!stillValid) setDeviceId("");
  }, [devicesFiltered, deviceId]);

  const selectedDevice = useMemo(
    () => devices.find((d: any) => String(d.id) === deviceId) || null,
    [devices, deviceId],
  );

  const hasFilters = !!(areaId || locationId || typeId);
  const clearAll = useCallback(() => {
    setAreaId(""); setLocationId(""); setTypeId(""); setDeviceId("");
  }, []);

  const scoped = !!selectedDevice || (hasFilters && devicesFiltered.length > 0);

  useEffect(() => {
    setBack(scoped ? clearAll : null);
    return () => setBack(null);
  }, [scoped, clearAll, setBack]);

  const landingActive = !selectedDevice && !(hasFilters && devicesFiltered.length > 0);

  // ─── Selected area name ────────────────────────────────────────────────────
  const selectedAreaName = useMemo(() => {
    if (!areaId) return null;
    return workers.find((w: any) => String(w.id) === areaId)?.name || null;
  }, [areaId, workers]);

  // ─── Recompute the area cards from telemetry ───────────────────────────────
  const devicesKey = useMemo(
    () => (devices as any[]).map((d) => d.id).sort().join(","),
    [devices],
  );

  interface DowntimeData {
    id: number;
    downtimePct: number;
    offlineCount: number;
    onlineCount: number;
  }

  const [downtimeState, setDowntimeState] = useState<Map<number | string, DowntimeData | null>>(new Map());
  const [histLoading, setHistLoading] = useState(false);
  const [histProgress, setHistProgress] = useState({ done: 0, total: 0 });
  const loadedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!landingActive) return;
    if (devices.length === 0) { setDowntimeState(new Map()); return; }

    const key = `${devicesKey}|${range}`;
    if (loadedKeyRef.current === key) return;

    const { start, end, granularity } = rangeToWindow(range);
    let cancelled = false;
    setHistLoading(true);
    setHistProgress({ done: 0, total: devices.length });

    mapLimit(
      devices as any[],
      FETCH_CONCURRENCY,
      async (d: any) => {
        const cacheKey = getCacheKey(d.id, range);
        const history = telemetryCache.has(cacheKey)
          ? telemetryCache.get(cacheKey)!
          : await fetchDeviceHistory(d.id, start, end, granularity).then(data => {
              telemetryCache.set(cacheKey, data);
              return data;
            });
        const offlineCount = history.filter((h: any) => !h.is_reachable).length;
        const onlineCount  = history.filter((h: any) =>  h.is_reachable).length;
        const totalCount   = history.length || 1;
        const downtimePct  = Math.round((offlineCount / totalCount) * 100);
        return { id: d.id, downtimePct, offlineCount, onlineCount };
      },
      (done, total) => { if (!cancelled) setHistProgress({ done, total }); },
    ).then((settled) => {
      if (cancelled) return;
      const map = new Map<number | string, DowntimeData | null>();
      settled.forEach((r, i) => {
        if (r.status === "fulfilled") map.set(r.value.id, r.value);
        else map.set((devices as any[])[i].id, null);
      });
      setDowntimeState(map);
      loadedKeyRef.current = key;
    }).finally(() => {
      if (!cancelled) setHistLoading(false);
    });

    return () => { cancelled = true; };
  }, [devicesKey, range, landingActive, devices.length]);

  const areaCards = useMemo(
    () =>
      areasSorted.map((w) => {
        const inArea = (devices as any[]).filter(
          (d) => String(d.worker_id ?? "") === String(w.id),
        );

        if (view === "locations") {
          const byLoc = new Map<any, { totalDowntime: number; count: number }>();
          for (const d of inArea) {
            const data    = downtimeState.get(d.id);
            const downtime = data?.downtimePct ?? 0;
            const loc      = d.location_id;
            if (!byLoc.has(loc)) byLoc.set(loc, { totalDowntime: 0, count: 0 });
            const current = byLoc.get(loc)!;
            byLoc.set(loc, { totalDowntime: current.totalDowntime + downtime, count: current.count + 1 });
          }
          const locCount = byLoc.size;
          let totalDowntime = 0;
          byLoc.forEach((v) => { totalDowntime += v.totalDowntime / v.count; });
          const avgDowntime = locCount > 0 ? Math.round(totalDowntime / locCount) : 0;
          return { id: String(w.id), name: w.name || `Area #${w.id}`, total: locCount, avgDowntime, hasData: true };
        }

        let totalDowntime = 0, count = 0;
        for (const d of inArea) {
          const data = downtimeState.get(d.id);
          if (data) { totalDowntime += data.downtimePct; count++; }
        }
        const avgDowntime = count > 0 ? Math.round(totalDowntime / count) : 0;
        return { id: String(w.id), name: w.name || `Area #${w.id}`, total: inArea.length, avgDowntime, hasData: count > 0 };
      }),
    [areasSorted, devices, view, downtimeState],
  );

  const caption    = view === "locations" ? "Locations" : "Devices";
  const metricLabel = "Avg Downtime %";

  // ─── Toolbar (timeline + report) ──────────────────────────────────────────
  const toolbar = (
    <div className="flex items-center justify-between mb-5">
      {/* Left: scope label */}
      <div className="flex items-center gap-2">
        {selectedAreaName && (
          <span className="text-sm font-semibold text-slate-300">{selectedAreaName}</span>
        )}
        {!selectedAreaName && !selectedDevice && (
          <span className="text-sm font-semibold text-slate-400">All Areas</span>
        )}
        {selectedDevice && (
          <span className="text-sm font-semibold text-slate-300">
            {selectedDevice.display || selectedDevice.hostname}
          </span>
        )}
      </div>

      {/* Right: timeline dropdown + report */}
      <div className="flex items-center gap-2">
        {/* Timeline dropdown */}
        <div className="relative" ref={rangeRef}>
          <button
            type="button"
            onClick={() => setRangeOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-slate-600 text-slate-200 text-sm font-semibold transition-colors"
          >
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>{RANGE_DISPLAY[range] ?? range}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
          </button>

          {rangeOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
              style={{ boxShadow: "0 20px 40px -8px rgba(0,0,0,0.6)" }}
            >
              {(RANGE_OPTIONS as { key: RangeKey; label: string }[]).map((opt) => {
                const active = range === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setRange(opt.key);
                      setRangeOpen(false);
                      loadedKeyRef.current = ""; // force refresh
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-cyan-500/15 text-cyan-200"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className={`h-3.5 w-3.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                      {RANGE_DISPLAY[opt.key] ?? opt.label}
                    </span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Report button */}
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(180deg, rgba(34,211,238,0.15) 0%, rgba(6,182,212,0.10) 100%)",
            border: "1px solid rgba(34,211,238,0.35)",
            color: "#22d3ee",
            boxShadow: "0 4px 12px -4px rgba(6,182,212,0.25)",
          }}
        >
          <Download className="h-4 w-4" />
          Report
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6 fade-in">
      {landingActive && (
        <TelemetryProgressDialog
          open={histLoading}
          done={histProgress.done}
          total={histProgress.total}
          label="Fetching telemetry"
        />
      )}

      {/* Always show toolbar */}
      {toolbar}

      {selectedDevice ? (
        <DeviceHistoryView
          deviceId={selectedDevice.id}
          deviceName={selectedDevice.display || selectedDevice.hostname}
        />
      ) : (hasFilters && devicesFiltered.length > 0) ? (
        <ScopedReportDashboard
          devices={devicesFiltered}
          locations={locations}
          workers={workers}
          deviceTypes={deviceTypes}
          areaId={areaId}
          locationId={locationId}
          typeId={typeId}
          range={range}
        />
      ) : areaCards.length === 0 ? (
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardContent className="p-12 text-center">
            <HistoryIcon className="h-12 w-12 mx-auto text-slate-500 mb-3" />
            <p className="text-base font-medium text-slate-200">No areas available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {areaCards.map((a) => {
            const downtime = a.avgDowntime ?? 0;
            const uptime = 100 - downtime;
            const accent =
              a.total === 0 ? "#64748B"
              : downtime <= 5 ? "#10B981"
              : downtime <= 15 ? "#F59E0B"
              : "#EF4444";
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => { setAreaId(a.id); setLocationId(""); setTypeId(""); setDeviceId(""); }}
                className="group relative rounded-xl overflow-hidden text-left transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.92) 100%)",
                  border: `1px solid color-mix(in oklab, ${accent} 35%, var(--border-soft))`,
                  boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 8%, transparent), var(--shadow-card)`,
                  minHeight: 132,
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0 left-0 right-0"
                  style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }}
                />
                <div className="relative h-full flex flex-col p-4">
                  <span className="text-base font-bold tracking-tight truncate text-slate-100" title={a.name}>
                    {a.name}
                  </span>
                  <div className="flex-1 flex flex-col items-center justify-center py-1">
                    <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: accent }}>
                      {downtime}
                      <span className="text-base align-top">%</span>
                    </span>
                    <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {metricLabel}
                    </span>
                    <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: accent }}>
                      {uptime}
                      <span className="text-base align-top">%</span>
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2 pt-2"
                    style={{ borderTop: "1px solid var(--border-soft)" }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold leading-none tabular-nums" style={{ color: "#F1F5F9" }}>
                        {a.total}
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Total {caption}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold leading-none tabular-nums" style={{ color: accent }}>
                        {downtime}%
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Down
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Report dialog */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        devices={devices as any[]}
        locations={locations as any[]}
        workers={workers as any[]}
        deviceTypes={deviceTypes as any[]}
        preselectedAreaId={areaId}
        preselectedDeviceId={deviceId}
      />
    </div>
  );
}