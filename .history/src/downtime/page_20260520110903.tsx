import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices, fetchDeviceTypes } from "@/store/deviceSlice";
import { fetchLocations, fetchLocationsforMap } from "@/store/locationsSlice";
import { fetchWorkers } from "@/store/workerSlice";
import { Card, CardContent } from "@/components/ui/card";
import { History as HistoryIcon } from "lucide-react";

import DeviceHistoryView from "@/components/device-history-view";
import ScopedReportDashboard from "@/history/ScopedReportDashboard";
import { useHistoryRange } from "@/contexts/HistoryRangeContext";
import { useHistoryNav } from "@/contexts/HistoryNavContext";
import { useHistoryView } from "@/contexts/HistoryViewContext";
import { fetchDeviceHistory, mapLimit } from "@/lib/useDeviceTelemetry";
import { rangeToWindow, lastReachableState } from "@/lib/telemetry-aggregate";
import TelemetryProgressDialog from "@/components/telemetry-progress-dialog";

// Bounded concurrency for per-device history fetches (mirrors the report view).
const FETCH_CONCURRENCY = 5;

export default function DowntimePage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setBack } = useHistoryNav();
  const { range } = useHistoryRange();
  const { view } = useHistoryView();

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

  // Publish the "back to areas" handler to the global top bar while scoped.
  useEffect(() => {
    setBack(scoped ? clearAll : null);
    return () => setBack(null);
  }, [scoped, clearAll, setBack]);

  // The area-card grid (landing) is only shown when nothing is drilled into.
  const landingActive = !selectedDevice && !(hasFilters && devicesFiltered.length > 0);

  // ─── Recompute the area cards from telemetry for the selected timeline ─────
  // For every device we fetch its history over `range` and remember its state
  // at the END of the window (most recent probe). The cards then reflect the
  // chosen timeline, not just live status.
  const devicesKey = useMemo(
    () => (devices as any[]).map((d) => d.id).sort().join(","),
    [devices],
  );
  const [histState, setHistState] = useState<Map<number | string, boolean | null>>(new Map());
  const [histLoading, setHistLoading] = useState(false);
  const [histProgress, setHistProgress] = useState({ done: 0, total: 0 });
  const loadedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!landingActive) return;
    if (devices.length === 0) { setHistState(new Map()); return; }

    const key = `${devicesKey}|${range}`;
    if (loadedKeyRef.current === key) return; // already have this window cached

    const { start, end, granularity } = rangeToWindow(range);
    let cancelled = false;
    setHistLoading(true);
    setHistProgress({ done: 0, total: devices.length });

    mapLimit(
      devices as any[],
      FETCH_CONCURRENCY,
      async (d: any) => ({
        id: d.id,
        state: lastReachableState(await fetchDeviceHistory(d.id, start, end, granularity)),
      }),
      (done, total) => { if (!cancelled) setHistProgress({ done, total }); },
    ).then((settled) => {
      if (cancelled) return;
      const map = new Map<number | string, boolean | null>();
      settled.forEach((r, i) => {
        if (r.status === "fulfilled") map.set(r.value.id, r.value.state);
        else map.set((devices as any[])[i].id, null);
      });
      setHistState(map);
      loadedKeyRef.current = key;
    }).finally(() => {
      if (!cancelled) setHistLoading(false);
    });

    return () => { cancelled = true; };
  }, [devicesKey, range, landingActive, devices.length]);

  // Per-area tallies derived from the historical states + the active toggle.
  const areaCards = useMemo(
    () =>
      areasSorted.map((w) => {
        const inArea = (devices as any[]).filter(
          (d) => String(d.worker_id ?? "") === String(w.id),
        );

        if (view === "locations") {
          // A location is "online" over the range if ≥1 of its devices was
          // up at the window end.
          const byLoc = new Map<any, boolean>();
          for (const d of inArea) {
            const up = histState.get(d.id) === true;
            byLoc.set(d.location_id, (byLoc.get(d.location_id) ?? false) || up);
          }
          let online = 0;
          byLoc.forEach((v) => { if (v) online++; });
          const total = byLoc.size;
          return { id: String(w.id), name: w.name || `Area #${w.id}`, total, online, offline: total - online };
        }

        const online = inArea.filter((d) => histState.get(d.id) === true).length;
        return {
          id: String(w.id),
          name: w.name || `Area #${w.id}`,
          total: inArea.length,
          online,
          offline: inArea.length - online,
        };
      }),
    [areasSorted, devices, view, histState],
  );

  const caption = view === "locations" ? "Locations Online" : "Devices Online";

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

      {selectedDevice ? (
        // 1. A specific device is selected → its full history.
        //    Back arrow lives in the global top bar.
        <DeviceHistoryView
          deviceId={selectedDevice.id}
          deviceName={selectedDevice.display || selectedDevice.hostname}
        />
      ) : (hasFilters && devicesFiltered.length > 0) ? (
        // 2. An area is selected → scoped report dashboard (global timeline).
        //    Back arrow lives in the global top bar.
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
        // 3a. No areas
        <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
          <CardContent className="p-12 text-center">
            <HistoryIcon className="h-12 w-12 mx-auto text-slate-500 mb-3" />
            <p className="text-base font-medium text-slate-200">No areas available</p>
          </CardContent>
        </Card>
      ) : (
        // 3b. Area cards — click one to open its full history
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {areaCards.map((a) => {
            const pct = a.total > 0 ? Math.round((a.online / a.total) * 100) : 0;
            const accent =
              a.total === 0 ? "#64748B"
              : pct >= 80 ? "#10B981"
              : pct >= 50 ? "#F59E0B"
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
                      {pct}
                      <span className="text-base align-top">%</span>
                    </span>
                    <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {caption}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-2 pt-2"
                    style={{ borderTop: "1px solid var(--border-soft)" }}
                  >
                    {[
                      { label: "Total", value: a.total, color: "#F1F5F9" },
                      { label: "Online", value: a.online, color: "#10B981" },
                      { label: "Offline", value: a.offline, color: "#EF4444" },
                    ].map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-bold leading-none tabular-nums" style={{ color: s.color }}>
                          {s.value}
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
