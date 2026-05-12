import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices, fetchDeviceTypes } from "@/store/deviceSlice";
import { fetchLocations, fetchLocationsforMap } from "@/store/locationsSlice";
import { fetchWorkers } from "@/store/workerSlice";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Search, Smartphone, ChevronDown, History as HistoryIcon, Filter, X,
} from "lucide-react";

import DeviceHistoryView from "@/components/device-history-view";

// ──────────────────────────────────────────────────────────────────────────────
// Toolbar primitives — keep visual language consistent with the rest of the app
// ──────────────────────────────────────────────────────────────────────────────

function ToolbarLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1 block">
      {children}
    </span>
  );
}

function ToolbarSelect({
  value, onChange, children, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full min-w-[140px] px-3 pr-8 rounded-md text-sm bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400 transition-colors"
    >
      {children}
    </select>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DevicePicker — searchable dropdown so the device list never claims layout space
// ──────────────────────────────────────────────────────────────────────────────

interface PickerDevice {
  id: number | string;
  display?: string;
  hostname?: string;
  ip?: string;
  is_reachable?: any;
}

function DevicePicker({
  devices, value, onChange,
}: {
  devices: PickerDevice[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = useMemo(
    () => devices.find((d) => String(d.id) === value) || null,
    [devices, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return devices;
    const q = query.trim().toLowerCase();
    return devices.filter((d) =>
      (d.display || "").toLowerCase().includes(q) ||
      (d.hostname || "").toLowerCase().includes(q) ||
      (d.ip || "").toLowerCase().includes(q),
    );
  }, [devices, query]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-full min-w-[220px] pl-3 pr-8 rounded-md text-sm bg-slate-800 border border-slate-700 text-slate-100 hover:border-slate-500 focus:outline-none focus:border-cyan-400 transition-colors flex items-center gap-2 text-left"
      >
        <Smartphone className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        {selected ? (
          <span className="truncate flex items-center gap-2 min-w-0">
            <span
              className={`size-2 rounded-full shrink-0 ${
                selected.is_reachable ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="truncate text-slate-100">
              {selected.display || selected.hostname}
            </span>
            {selected.ip && (
              <span className="text-[11px] text-slate-400 font-mono truncate">
                {selected.ip}
              </span>
            )}
          </span>
        ) : (
          <span className="text-slate-400 truncate">
            {devices.length === 0 ? "No devices in scope" : `Select device (${devices.length})`}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
      </button>

      {open && (
        <div
          className="absolute z-40 mt-1 left-0 right-0 w-full min-w-[280px] rounded-md border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          style={{ maxHeight: "min(60vh, 420px)" }}
        >
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                type="search"
                placeholder="Search devices…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 rounded text-sm bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(min(60vh, 420px) - 52px)" }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No devices match
              </div>
            ) : (
              <div className="divide-y divide-slate-700/60">
                {filtered.map((d) => {
                  const isSel = String(d.id) === value;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        onChange(String(d.id));
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                        isSel ? "bg-cyan-500/15" : "hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          d.is_reachable ? "bg-emerald-400" : "bg-red-400"
                        }`}
                        style={{
                          boxShadow: d.is_reachable
                            ? "0 0 8px rgba(16,185,129,0.6)"
                            : "0 0 8px rgba(239,68,68,0.6)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-slate-100">
                          {d.display || d.hostname}
                        </div>
                        {d.ip && (
                          <div className="text-[11px] font-mono truncate text-slate-400">
                            {d.ip}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { devices = [], deviceTypes = [] } = useAppSelector((s) => s.devices);
  const { locations = [] }                = useAppSelector((s) => s.locations);
  const { workers = [] }                  = useAppSelector((s) => s.workers);

  useEffect(() => {
    if (devices.length === 0)    dispatch(fetchAllDevices());
    if (deviceTypes.length === 0) dispatch(fetchDeviceTypes());
    if (locations.length === 0) {
      dispatch(fetchLocations());
      dispatch(fetchLocationsforMap());
    }
    if (workers.length === 0)    dispatch(fetchWorkers({}));
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

  // ─── Filters / lists ───────────────────────────────────────────────────────
  const areasSorted = useMemo(
    () => [...workers].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [workers],
  );

  const locationsForArea = useMemo(() => {
    if (!areaId) return locations;
    return locations.filter((l: any) => String(l.worker_id ?? "") === areaId);
  }, [locations, areaId]);

  const devicesFiltered = useMemo(() => {
    let list = devices as any[];
    if (areaId)     list = list.filter((d) => String(d.worker_id ?? "") === areaId);
    if (locationId) list = list.filter((d) => String(d.location_id ?? "") === locationId);
    if (typeId)     list = list.filter((d) => String(d.device_type_id ?? "") === typeId);
    return list;
  }, [devices, areaId, locationId, typeId]);

  // Reset child selections when parent invalidates them
  useEffect(() => {
    if (!locationId) return;
    const stillValid = locations.some((l: any) =>
      String(l.id) === locationId &&
      (!areaId || String(l.worker_id ?? "") === areaId),
    );
    if (!stillValid) setLocationId("");
  }, [areaId, locations, locationId]);

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
  const clearAll = () => {
    setAreaId(""); setLocationId(""); setTypeId(""); setDeviceId("");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6 fade-in">
      {/* Header
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          {devicesFiltered.length} device{devicesFiltered.length !== 1 ? "s" : ""} in scope
        </div>
      </div> */}

      {/* Horizontal toolbar (filters + device picker) — under the page header */}
      <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100 mb-5">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-2">
              <ToolbarLabel>Area</ToolbarLabel>
              <ToolbarSelect
                ariaLabel="Area"
                value={areaId}
                onChange={(v) => { setAreaId(v); setLocationId(""); setDeviceId(""); }}
              >
                <option value="">All areas</option>
                {areasSorted.map((w) => (
                  <option key={w.id} value={String(w.id)}>{w.name || `Area #${w.id}`}</option>
                ))}
              </ToolbarSelect>
            </div>

            <div className="lg:col-span-3">
              <ToolbarLabel>Location</ToolbarLabel>
              <ToolbarSelect
                ariaLabel="Location"
                value={locationId}
                onChange={(v) => { setLocationId(v); setDeviceId(""); }}
              >
                <option value="">All locations</option>
                {locationsForArea.map((l: any) => (
                  <option key={l.id} value={String(l.id)}>{l.name}</option>
                ))}
              </ToolbarSelect>
            </div>

            <div className="lg:col-span-2">
              <ToolbarLabel>Device Type</ToolbarLabel>
              <ToolbarSelect
                ariaLabel="Device type"
                value={typeId}
                onChange={(v) => { setTypeId(v); setDeviceId(""); }}
              >
                <option value="">All types</option>
                {deviceTypes.map((t: any) => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </ToolbarSelect>
            </div>

            <div className="lg:col-span-4">
              <ToolbarLabel>Device</ToolbarLabel>
              <DevicePicker
                devices={devicesFiltered}
                value={deviceId}
                onChange={setDeviceId}
              />
            </div>

            <div className="lg:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={clearAll}
                disabled={!hasFilters && !deviceId}
                className="h-9 w-full inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content area — full width */}
      <div>
        {selectedDevice ? (
          <div className="space-y-4">
            {/* Selected device summary strip */}
            <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={`p-2 rounded-lg ${selectedDevice.is_reachable ? "bg-emerald-900" : "bg-red-900"}`}>
                    <Smartphone className={`h-5 w-5 ${selectedDevice.is_reachable ? "text-emerald-300" : "text-red-300"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-white truncate">
                      {selectedDevice.display || selectedDevice.hostname}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Device history
                    </div>
                  </div>

                  <div className="ml-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400 uppercase tracking-[0.14em]">IP</div>
                      <div className="text-slate-100 font-mono">{selectedDevice.ip}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase tracking-[0.14em]">Type</div>
                      <div className="text-slate-100">{selectedDevice.device_type?.name || "Unknown"}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase tracking-[0.14em]">Location</div>
                      <div className="text-slate-100 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {selectedDevice.location?.name || "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase tracking-[0.14em]">Area</div>
                      <div className="text-slate-100 truncate">{selectedDevice.worker?.name || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All history charts */}
            <DeviceHistoryView
              deviceId={selectedDevice.id}
              deviceName={selectedDevice.display || selectedDevice.hostname}
            />
          </div>
        ) : (
          <Card className="shadow-lg border border-slate-700 bg-slate-800 text-slate-100">
            <CardContent className="p-12 text-center">
              <HistoryIcon className="h-12 w-12 mx-auto text-slate-500 mb-3" />
              <p className="text-base font-medium text-slate-200">Select a device to view its history</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Use the filters above to narrow the scope by area, location or device type, then pick a
                device from the dropdown to load its complete telemetry history.
              </p>
              {devicesFiltered.length > 0 && (
                <p className="text-xs text-cyan-300 mt-3">
                  {devicesFiltered.length} device{devicesFiltered.length !== 1 ? "s" : ""} ready to inspect
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
