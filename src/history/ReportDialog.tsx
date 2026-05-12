import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Smartphone, Layers, Users, Download, CheckCircle2, Loader2, Search, X,
} from "lucide-react";
import {
  RANGE_OPTIONS,
  generateSingleDeviceReport,
  generateMultipleDevicesReport,
  generateAreaReport,
  type RangeKey,
  type DeviceMeta,
  type AreaMeta,
  type LocationMeta,
} from "@/lib/report-generator";

type Mode = "single" | "multi" | "area";

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;

  // All data from the page so the dialog can compose its scope
  devices: any[];
  locations: any[];
  workers: any[];
  deviceTypes: any[];

  // Pre-selected filters carried from the page toolbar
  preselectedAreaId?: string;
  preselectedDeviceId?: string;
}

export default function ReportDialog({
  open, onOpenChange,
  devices, locations, workers, deviceTypes,
  preselectedAreaId = "",
  preselectedDeviceId = "",
}: ReportDialogProps) {
  const [mode, setMode] = useState<Mode>(() => preselectedDeviceId ? "single" : preselectedAreaId ? "area" : "single");
  const [range, setRange] = useState<RangeKey>("24h");

  // Single
  const [singleDeviceId, setSingleDeviceId] = useState<string>(preselectedDeviceId);
  const [singleQuery, setSingleQuery] = useState("");

  // Multi
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [multiQuery, setMultiQuery] = useState("");

  // Area
  const [areaId, setAreaId] = useState<string>(preselectedAreaId);

  // Status
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setBusy(false); setProgress(""); setError(null); setDone(false);
    } else {
      setSingleDeviceId(preselectedDeviceId);
      setAreaId(preselectedAreaId);
    }
  }, [open, preselectedDeviceId, preselectedAreaId]);

  // ─── Helper maps ──────────────────────────────────────────────────────────
  const locationName = (id: any) =>
    locations.find((l: any) => String(l.id) === String(id))?.name || undefined;
  const areaName = (id: any) =>
    workers.find((w: any) => String(w.id) === String(id))?.name || undefined;
  const deviceTypeName = (id: any) =>
    deviceTypes.find((t: any) => String(t.id) === String(id))?.name || undefined;

  const toMeta = (d: any): DeviceMeta => ({
    id: d.id,
    display: d.display,
    hostname: d.hostname,
    ip: d.ip,
    type: d.device_type?.name || deviceTypeName(d.device_type_id) || "Unknown",
    location: d.location?.name || locationName(d.location_id) || "Unknown",
    area: d.worker?.name || areaName(d.worker_id) || "N/A",
    is_reachable: d.is_reachable,
  });

  // ─── Lists ────────────────────────────────────────────────────────────────
  const filteredSingle = useMemo(() => {
    const q = singleQuery.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d: any) =>
      (d.display || "").toLowerCase().includes(q) ||
      (d.hostname || "").toLowerCase().includes(q) ||
      (d.ip || "").toLowerCase().includes(q),
    );
  }, [devices, singleQuery]);

  const filteredMulti = useMemo(() => {
    const q = multiQuery.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d: any) =>
      (d.display || "").toLowerCase().includes(q) ||
      (d.hostname || "").toLowerCase().includes(q) ||
      (d.ip || "").toLowerCase().includes(q),
    );
  }, [devices, multiQuery]);

  const areaDevices = useMemo(() => {
    if (!areaId) return [];
    return devices.filter((d: any) => String(d.worker_id ?? "") === areaId);
  }, [devices, areaId]);

  const areaLocations = useMemo<LocationMeta[]>(() => {
    if (!areaId) return [];
    return locations
      .filter((l: any) => String(l.worker_id ?? "") === areaId)
      .map((l: any) => ({ id: l.id, name: l.name }));
  }, [locations, areaId]);

  const sortedAreas = useMemo(
    () => [...workers].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")),
    [workers],
  );

  // ─── Submit ───────────────────────────────────────────────────────────────
  const canGenerate =
    !busy && (
      (mode === "single" && !!singleDeviceId) ||
      (mode === "multi"  && multiSelected.size > 0) ||
      (mode === "area"   && !!areaId && areaDevices.length > 0)
    );

  const generate = async () => {
    setError(null);
    setDone(false);
    setBusy(true);
    setProgress("Preparing…");
    try {
      if (mode === "single") {
        const d = devices.find((x: any) => String(x.id) === singleDeviceId);
        if (!d) throw new Error("Selected device not found");
        await generateSingleDeviceReport(toMeta(d), range, setProgress);
      } else if (mode === "multi") {
        const selected = devices.filter((x: any) => multiSelected.has(String(x.id)));
        if (!selected.length) throw new Error("Pick at least one device");
        await generateMultipleDevicesReport(selected.map(toMeta), range, setProgress);
      } else {
        const area: AreaMeta = {
          id: areaId,
          name: areaName(areaId) || `Area ${areaId}`,
        };
        await generateAreaReport(area, areaDevices.map(toMeta), areaLocations, range, setProgress);
      }
      setDone(true);
      setProgress("Report downloaded.");
    } catch (e: any) {
      setError(e?.message || "Failed to generate report");
    } finally {
      setBusy(false);
    }
  };

  const toggleMulti = (id: string) => {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[92vw] p-0 border-slate-700 overflow-hidden"
        style={{ background: "#0F172A", color: "#E2E8F0" }}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-600/30">
              <Download className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">Download Report</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Choose what to include, pick a timeline, and we'll generate a PDF.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Mode tabs */}
          <div className="grid grid-cols-3 gap-2">
            <ModeTab active={mode === "single"} icon={<Smartphone className="h-4 w-4" />}
              title="Single Device" subtitle="One camera or node"
              onClick={() => setMode("single")} />
            <ModeTab active={mode === "multi"} icon={<Layers className="h-4 w-4" />}
              title="Multiple Devices" subtitle="Compare devices side by side"
              onClick={() => setMode("multi")} />
            <ModeTab active={mode === "area"} icon={<Users className="h-4 w-4" />}
              title="Per Area" subtitle="All devices in an area"
              onClick={() => setMode("area")} />
          </div>

          {/* Mode body */}
          {mode === "single" && (
            <div className="space-y-2">
              <SectionLabel>Pick a device</SectionLabel>
              <SearchBox value={singleQuery} onChange={setSingleQuery} placeholder="Search devices…" />
              <div className="rounded-md border border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-700/60">
                {filteredSingle.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No devices match</div>
                ) : (
                  filteredSingle.map((d: any) => {
                    const isSel = String(d.id) === singleDeviceId;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSingleDeviceId(String(d.id))}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                          isSel ? "bg-cyan-500/15 border-l-2 border-cyan-400" : "hover:bg-slate-800 border-l-2 border-transparent"
                        }`}
                      >
                        <span className={`size-2 rounded-full shrink-0 ${d.is_reachable ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-slate-100">{d.display || d.hostname}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {d.ip} · {d.device_type?.name || deviceTypeName(d.device_type_id) || "Unknown"}
                            {d.location?.name && ` · ${d.location.name}`}
                          </div>
                        </div>
                        {isSel && <CheckCircle2 className="h-4 w-4 text-cyan-300 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mode === "multi" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Select devices ({multiSelected.size} chosen)</SectionLabel>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMultiSelected(new Set(filteredMulti.map((d: any) => String(d.id))))}
                    className="text-[11px] text-cyan-300 hover:underline"
                  >Select all shown</button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setMultiSelected(new Set())}
                    className="text-[11px] text-slate-400 hover:underline"
                  >Clear</button>
                </div>
              </div>
              <SearchBox value={multiQuery} onChange={setMultiQuery} placeholder="Filter devices…" />
              <div className="rounded-md border border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-700/60">
                {filteredMulti.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No devices match</div>
                ) : (
                  filteredMulti.map((d: any) => {
                    const idStr = String(d.id);
                    const isSel = multiSelected.has(idStr);
                    return (
                      <label
                        key={d.id}
                        className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors cursor-pointer ${
                          isSel ? "bg-cyan-500/10" : "hover:bg-slate-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleMulti(idStr)}
                          className="accent-cyan-500"
                        />
                        <span className={`size-2 rounded-full shrink-0 ${d.is_reachable ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-slate-100">{d.display || d.hostname}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {d.ip} · {d.device_type?.name || deviceTypeName(d.device_type_id) || "Unknown"}
                            {d.location?.name && ` · ${d.location.name}`}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mode === "area" && (
            <div className="space-y-2">
              <SectionLabel>Pick an area</SectionLabel>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full h-10 px-3 rounded-md text-sm bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="">— Select area —</option>
                {sortedAreas.map((w: any) => (
                  <option key={w.id} value={String(w.id)}>{w.name || `Area #${w.id}`}</option>
                ))}
              </select>

              {areaId && (
                <div className="rounded-md border border-slate-700 p-3 bg-slate-800/50 text-xs grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-slate-400 uppercase tracking-[0.14em]">Devices</div>
                    <div className="text-slate-100 text-base font-semibold tabular-nums">{areaDevices.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-[0.14em]">Locations</div>
                    <div className="text-slate-100 text-base font-semibold tabular-nums">{areaLocations.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-[0.14em]">Online now</div>
                    <div className="text-emerald-300 text-base font-semibold tabular-nums">
                      {areaDevices.filter((d: any) => d.is_reachable).length}
                    </div>
                  </div>
                </div>
              )}
              {areaId && areaDevices.length === 0 && (
                <div className="text-xs text-amber-300">No devices linked to this area yet.</div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <SectionLabel>Timeline</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RANGE_OPTIONS.map((r) => {
                const isSel = range === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                      isSel
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-200"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {r.label.replace("Last ", "")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700 flex items-center justify-between gap-3">
          <div className="text-xs min-w-0 flex-1">
            {busy && (
              <span className="text-cyan-300 inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {progress || "Working…"}
              </span>
            )}
            {!busy && done && (
              <span className="text-emerald-300 inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {progress}
              </span>
            )}
            {error && (
              <span className="text-red-300 inline-flex items-center gap-2">
                <X className="h-3.5 w-3.5" />
                {error}
              </span>
            )}
            {!busy && !done && !error && (
              <span className="text-slate-400">
                {mode === "single" && (singleDeviceId ? "1 device · " : "No device selected · ")}
                {mode === "multi"  && `${multiSelected.size} devices · `}
                {mode === "area"   && (areaId ? `${areaDevices.length} devices · ` : "Pick an area · ")}
                {RANGE_OPTIONS.find((r) => r.key === range)?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              className="px-4 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              style={{
                background: "linear-gradient(180deg, #22D3EE 0%, #06B6D4 100%)",
                color: "#0B1220",
                boxShadow: "0 8px 18px -8px rgba(6,182,212,0.55)",
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate PDF
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function ModeTab({
  active, icon, title, subtitle, onClick,
}: {
  active: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        active
          ? "bg-cyan-500/12 border-cyan-500/60 ring-1 ring-cyan-500/40"
          : "bg-slate-800/60 border-slate-700 hover:border-slate-500"
      }`}
    >
      <div className="flex items-center gap-2 text-slate-100 text-sm font-semibold">
        <span className={active ? "text-cyan-300" : "text-slate-400"}>{icon}</span>
        {title}
      </div>
      <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-2 py-1.5 rounded text-sm bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
      />
    </div>
  );
}
