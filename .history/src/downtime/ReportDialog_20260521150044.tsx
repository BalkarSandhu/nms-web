/**
 * ReportDialog — Redesigned NMS Downtime Report Dialog
 *
 * Features:
 *  - Format selector: PDF or Excel
 *  - Mode: Single device / Multiple devices / Area
 *  - Timeline driven by the range prop from DowntimePage (clock icon)
 *  - Calls buildAndExportReport() from the new report-generator-downtime
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Smartphone, Layers, Users, Download, CheckCircle2,
  Loader2, Search, X, FileText, Table2, Clock,
} from "lucide-react";

import {
  RANGE_OPTIONS,
  buildAndExportReport,
  type RangeKey,
} from "@/lib/report-generator";

// Bring in the telemetry hooks / types the caller has already loaded
import { fetchDeviceHistory, mapLimit, type HistoryEntry } from "@/lib/useDeviceTelemetry";
import { rangeToWindow, aggregate, emptyAgg, lastReachableState } from "@/lib/telemetry-aggregate";

const FETCH_CONCURRENCY = 5;

// ─── Module-level cache (mirrors DowntimePage cache) ────────────────────────
const telemetryCache = new Map<string, HistoryEntry[]>();
function getCacheKey(deviceId: number, range: string) {
  return `${deviceId}_${range}_${new Date().toISOString().slice(0, 13)}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Mode   = "single" | "multi" | "area";
type Format = "pdf" | "excel";

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  devices: any[];
  locations: any[];
  workers: any[];
  deviceTypes: any[];
  preselectedAreaId?: string;
  preselectedDeviceId?: string;
  /** Current range selected in the page toolbar — pre-fills the dialog */
  currentRange?: RangeKey;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportDialog({
  open, onOpenChange,
  devices, locations, workers, deviceTypes,
  preselectedAreaId = "",
  preselectedDeviceId = "",
  currentRange = "24h",
}: ReportDialogProps) {
  const [mode,   setMode]   = useState<Mode>(() => preselectedDeviceId ? "single" : preselectedAreaId ? "area" : "single");
  const [format, setFormat] = useState<Format>("pdf");
  const [range,  setRange]  = useState<RangeKey>(currentRange as RangeKey);

  // Single
  const [singleDeviceId, setSingleDeviceId] = useState<string>(preselectedDeviceId);
  const [singleQuery,    setSingleQuery]    = useState("");

  // Multi
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [multiQuery,    setMultiQuery]    = useState("");

  // Area
  const [areaId, setAreaId] = useState<string>(preselectedAreaId);

  // Status
  const [busy,     setBusy]     = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  // Sync range when parent toolbar changes
  useEffect(() => { setRange(currentRange as RangeKey); }, [currentRange]);

  useEffect(() => {
    if (!open) {
      setBusy(false); setProgress(""); setError(null); setDone(false);
    } else {
      setSingleDeviceId(preselectedDeviceId);
      setAreaId(preselectedAreaId);
    }
  }, [open, preselectedDeviceId, preselectedAreaId]);

  // ─── Helper maps ──────────────────────────────────────────────────────────
  const areaName        = (id: any) => workers.find((w: any)      => String(w.id) === String(id))?.name;
  const deviceTypeName  = (id: any) => deviceTypes.find((t: any)  => String(t.id) === String(id))?.name;

  // ─── Filtered lists ───────────────────────────────────────────────────────
  const filteredSingle = useMemo(() => {
    const q = singleQuery.trim().toLowerCase();
    return q ? devices.filter((d: any) =>
      (d.display || "").toLowerCase().includes(q) ||
      (d.hostname || "").toLowerCase().includes(q) ||
      (d.ip || "").toLowerCase().includes(q),
    ) : devices;
  }, [devices, singleQuery]);

  const filteredMulti = useMemo(() => {
    const q = multiQuery.trim().toLowerCase();
    return q ? devices.filter((d: any) =>
      (d.display || "").toLowerCase().includes(q) ||
      (d.hostname || "").toLowerCase().includes(q) ||
      (d.ip || "").toLowerCase().includes(q),
    ) : devices;
  }, [devices, multiQuery]);

  const areaDevices  = useMemo(() => !areaId ? [] : devices.filter((d: any) => String(d.worker_id ?? "") === areaId), [devices, areaId]);
  const sortedAreas  = useMemo(() => [...workers].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")), [workers]);

  // ─── Scope devices for report ─────────────────────────────────────────────
  const scopedDevices = useMemo((): any[] => {
    if (mode === "single") return singleDeviceId ? devices.filter((d: any) => String(d.id) === singleDeviceId) : [];
    if (mode === "multi")  return devices.filter((d: any) => multiSelected.has(String(d.id)));
    return areaDevices;
  }, [mode, singleDeviceId, multiSelected, areaDevices, devices]);

  const reportTitle = useMemo(() => {
    if (mode === "single" && singleDeviceId) {
      const d = devices.find((x: any) => String(x.id) === singleDeviceId);
      return d?.display || d?.hostname || "Single Device Report";
    }
    if (mode === "multi") return `${multiSelected.size} Devices Report`;
    if (mode === "area"  && areaId) return `${areaName(areaId) || "Area"} Report`;
    return "Downtime Report";
  }, [mode, singleDeviceId, multiSelected, areaId, devices, workers]);

  const canGenerate = !busy && scopedDevices.length > 0;

  // ─── Generate ─────────────────────────────────────────────────────────────
  const generate = async () => {
    setError(null); setDone(false); setBusy(true);
    setProgress("Fetching telemetry…");

    try {
      const { start, end, granularity } = rangeToWindow(range);

      // Fetch telemetry for scoped devices
      const settled = await mapLimit(
        scopedDevices,
        FETCH_CONCURRENCY,
        async (d: any) => {
          const key = getCacheKey(d.id, range);
          const history = telemetryCache.has(key)
            ? telemetryCache.get(key)!
            : await fetchDeviceHistory(d.id, start, end, granularity).then(data => {
                telemetryCache.set(key, data);
                return data;
              });
          return { device: d, history };
        },
        (done, total) => setProgress(`Fetching telemetry… ${done}/${total}`),
      );

      const perDevice = settled.map((r: any, i: number) => {
        if (r.status === "fulfilled") {
          return {
            device: r.value.device,
            agg: aggregate(r.value.history),
            history: r.value.history,
            lastState: lastReachableState(r.value.history),
          };
        }
        return { device: scopedDevices[i], agg: emptyAgg(), history: [], lastState: null };
      });

      setProgress("Building report…");

      await buildAndExportReport(
        {
          title: reportTitle,
          subtitle: mode === "area" ? `Area: ${areaName(areaId) || areaId}` : undefined,
          range: range as RangeKey,
          devices: scopedDevices,
          locations,
          perDevice,
          format,
        },
        setProgress,
      );

      setDone(true);
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
        className="max-w-3xl w-[94vw] p-0 border-slate-700 overflow-hidden"
        style={{ background: "#0F172A", color: "#E2E8F0" }}
      >
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-600/30">
              <Download className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-white text-lg">Downtime Report</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Professional NMS report — choose scope, timeline, and format.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[72vh] overflow-y-auto">

          {/* ── Mode tabs ── */}
          <div>
            <SectionLabel>Report Scope</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              <ModeTab active={mode === "single"} icon={<Smartphone className="h-4 w-4" />}
                title="Single Device" subtitle="One camera or node"
                onClick={() => setMode("single")} />
              <ModeTab active={mode === "multi"} icon={<Layers className="h-4 w-4" />}
                title="Multiple Devices" subtitle="Select devices manually"
                onClick={() => setMode("multi")} />
              <ModeTab active={mode === "area"} icon={<Users className="h-4 w-4" />}
                title="Area / All" subtitle="Full area coverage"
                onClick={() => setMode("area")} />
            </div>
          </div>

          {/* ── Scope body ── */}
          {mode === "single" && (
            <div className="space-y-2">
              <SectionLabel>Select Device</SectionLabel>
              <SearchBox value={singleQuery} onChange={setSingleQuery} placeholder="Search by name, IP, hostname…" />
              <div className="rounded-md border border-slate-700 max-h-56 overflow-y-auto divide-y divide-slate-700/60">
                {filteredSingle.length === 0 ? (
                  <Empty text="No devices match" />
                ) : filteredSingle.map((d: any) => {
                  const isSel = String(d.id) === singleDeviceId;
                  return (
                    <button key={d.id} type="button" onClick={() => setSingleDeviceId(String(d.id))}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                        isSel ? "bg-cyan-500/15 border-l-2 border-cyan-400" : "hover:bg-slate-800 border-l-2 border-transparent"
                      }`}>
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
                })}
              </div>
            </div>
          )}

          {mode === "multi" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionLabel>{multiSelected.size} device{multiSelected.size !== 1 ? "s" : ""} selected</SectionLabel>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMultiSelected(new Set(filteredMulti.map((d: any) => String(d.id))))}
                    className="text-[11px] text-cyan-300 hover:underline">Select all shown</button>
                  <span className="text-slate-600">·</span>
                  <button type="button" onClick={() => setMultiSelected(new Set())}
                    className="text-[11px] text-slate-400 hover:underline">Clear</button>
                </div>
              </div>
              <SearchBox value={multiQuery} onChange={setMultiQuery} placeholder="Filter devices…" />
              <div className="rounded-md border border-slate-700 max-h-56 overflow-y-auto divide-y divide-slate-700/60">
                {filteredMulti.length === 0 ? <Empty text="No devices match" /> : filteredMulti.map((d: any) => {
                  const idStr = String(d.id);
                  const isSel = multiSelected.has(idStr);
                  return (
                    <label key={d.id} className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors cursor-pointer ${
                      isSel ? "bg-cyan-500/10" : "hover:bg-slate-800"}`}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleMulti(idStr)} className="accent-cyan-500" />
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
                })}
              </div>
            </div>
          )}

          {mode === "area" && (
            <div className="space-y-2">
              <SectionLabel>Select Area</SectionLabel>
              <select value={areaId} onChange={(e) => setAreaId(e.target.value)}
                className="w-full h-10 px-3 rounded-md text-sm bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400">
                <option value="">— Select area —</option>
                {sortedAreas.map((w: any) => (
                  <option key={w.id} value={String(w.id)}>{w.name || `Area #${w.id}`}</option>
                ))}
              </select>
              {areaId && (
                <div className="rounded-md border border-slate-700 p-3 bg-slate-800/50 text-xs grid grid-cols-3 gap-3 mt-1">
                  <Stat label="Devices"    value={String(areaDevices.length)} />
                  <Stat label="Locations"  value={String(new Set(areaDevices.map((d: any) => d.location_id)).size)} />
                  <Stat label="Online now" value={String(areaDevices.filter((d: any) => d.is_reachable).length)} color="text-emerald-300" />
                </div>
              )}
              {areaId && areaDevices.length === 0 && (
                <p className="text-xs text-amber-300">No devices linked to this area.</p>
              )}
            </div>
          )}

          {/* ── Timeline ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <SectionLabel>Timeline</SectionLabel>
              <span className="text-[10px] text-cyan-400/70 font-medium">
                (synced with page clock — you can override here)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {RANGE_OPTIONS.map((r) => {
                const isSel = range === r.key;
                return (
                  <button key={r.key} type="button" onClick={() => setRange(r.key as RangeKey)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs border transition-colors ${
                      isSel
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-200 font-semibold"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}>
                    <Clock className={`h-3 w-3 ${isSel ? "text-cyan-400" : "text-slate-500"}`} />
                    {r.label.replace("Last ", "")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Format ── */}
          <div>
            <SectionLabel>Export Format</SectionLabel>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <FormatTab
                active={format === "pdf"}
                icon={<FileText className="h-5 w-5" />}
                title="PDF Report"
                subtitle="Professional multi-page report with charts and colour-coded tables"
                onClick={() => setFormat("pdf")}
                accent="text-red-300"
              />
              <FormatTab
                active={format === "excel"}
                icon={<Table2 className="h-5 w-5" />}
                title="Excel Workbook"
                subtitle="3-sheet workbook: Summary, Device Downtime, Location Summary"
                onClick={() => setFormat("excel")}
                accent="text-emerald-300"
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-slate-700 flex items-center justify-between gap-3">
          {/* Status */}
          <div className="text-xs min-w-0 flex-1 truncate">
            {busy && (
              <span className="text-cyan-300 inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />{progress || "Working…"}
              </span>
            )}
            {!busy && done && (
              <span className="text-emerald-300 inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{progress}
              </span>
            )}
            {error && (
              <span className="text-red-300 inline-flex items-center gap-2">
                <X className="h-3.5 w-3.5 shrink-0" />{error}
              </span>
            )}
            {!busy && !done && !error && (
              <span className="text-slate-400">
                {scopedDevices.length > 0
                  ? `${scopedDevices.length} device${scopedDevices.length !== 1 ? "s" : ""} · ${RANGE_OPTIONS.find(r => r.key === range)?.label} · ${format === "pdf" ? "PDF" : "Excel"}`
                  : "Select a scope to continue"}
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onOpenChange(false)} disabled={busy}
              className="px-3 py-2 rounded-md text-xs font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-50">
              Close
            </button>
            <button type="button" onClick={generate} disabled={!canGenerate}
              className="px-4 py-2 rounded-md text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none transition-all"
              style={{
                background: "linear-gradient(180deg, #22D3EE 0%, #06B6D4 100%)",
                color: "#0B1220",
                boxShadow: canGenerate ? "0 8px 18px -8px rgba(6,182,212,0.55)" : "none",
              }}>
              {busy
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : format === "excel"
                  ? <Table2 className="h-4 w-4" />
                  : <Download className="h-4 w-4" />}
              Export {format === "pdf" ? "PDF" : "Excel"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-6 text-center text-sm text-slate-400">{text}</div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-8 pr-2 py-1.5 rounded text-sm bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400" />
    </div>
  );
}

function Stat({ label, value, color = "text-slate-100" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-slate-400 uppercase tracking-[0.14em] text-[9px]">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ModeTab({ active, icon, title, subtitle, onClick }: {
  active: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        active ? "bg-cyan-500/12 border-cyan-500/60 ring-1 ring-cyan-500/40" : "bg-slate-800/60 border-slate-700 hover:border-slate-500"
      }`}>
      <div className="flex items-center gap-2 text-slate-100 text-sm font-semibold">
        <span className={active ? "text-cyan-300" : "text-slate-400"}>{icon}</span>
        {title}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>
    </button>
  );
}

function FormatTab({ active, icon, title, subtitle, onClick, accent }: {
  active: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; accent: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all ${
        active ? "bg-slate-800 border-slate-600 ring-1 ring-slate-500" : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
      }`}>
      <div className={`flex items-center gap-2 text-sm font-bold mb-1 ${active ? accent : "text-slate-400"}`}>
        {icon}{title}
      </div>
      <div className="text-[11px] text-slate-500 leading-snug">{subtitle}</div>
      {active && (
        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold ${accent}`}>
          <CheckCircle2 className="h-3 w-3" /> Selected
        </div>
      )}
    </button>
  );
}