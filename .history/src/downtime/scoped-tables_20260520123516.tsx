/**
 * Read-only device / location tables for the opened Area Card. They mirror
 * the Dashboard tables' visuals (dark panel, sticky header, nms status dots,
 * badge-info type chips) but are scoped to the report's devices/locations and
 * carry no pagination / add / export / URL coupling. A trailing "Uptime"
 * column is added since this is the historical report context.
 */
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import DowntimeModal, { LocationDetailModal, type DowntimeRecord, type LocationDeviceDetail } from "@/downtime/DowntimeModal";

const headStyle: React.CSSProperties = { color: "var(--text-lo)" };
const headClass = "font-semibold text-[11px] uppercase tracking-[0.14em]";

// ─── Hardcoded remarks options ────────────────────────────────────────────────
const REMARKS_OPTIONS = [
  "",
  "Power Cut",
  "Network Issue",
  "Maintenance",
  "Hardware Fault",
  "Unknown",
];

function StatusCell({ online }: { online: boolean | null }) {
  if (online === null) {
    return (
      <div className="inline-flex items-center justify-center gap-1.5">
        <span className="nms-dot nms-dot-unknown" />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--status-unknown, #8B5CF6)" }}>
          No data
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center justify-center gap-1.5">
      <span className={`nms-dot ${online ? "nms-dot-online" : "nms-dot-offline"}`} />
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: online ? "var(--status-online)" : "var(--status-offline)" }}
      >
        {online ? "Online" : "Offline"}
      </span>
    </div>
  );
}

function uptimeColor(pct: number, hasData: boolean): string {
  if (!hasData) return "var(--text-lo)";
  if (pct >= 95) return "var(--status-online)";
  if (pct >= 80) return "var(--status-warning)";
  return "var(--status-offline)";
}

const AreaIcon = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--text-dim)" }}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// ─── UPTIME TABLES ────────────────────────────────────────────────────────────

export interface ScopedDeviceRow {
  id: number | string;
  name: string;
  hostname?: string;
  area?: string;
  type?: string;
  online: boolean | null;
  uptimePct: number;
  hasData: boolean;
}

export function ScopedDevicesTable({ rows }: { rows: ScopedDeviceRow[] }) {
  return (
    <div className="overflow-auto max-h-[460px] rounded-lg border" style={{ borderColor: "var(--border-soft)" }}>
      <Table className="table-fixed w-full [&_td]:align-top [&_td]:whitespace-normal [&_td]:break-words [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
        <TableHeader className="sticky top-0 z-10" style={{ background: "rgba(15,23,42,0.92)" }}>
          <TableRow style={{ borderColor: "var(--border-soft)" }}>
            <TableHead className={`w-[5%] text-center ${headClass}`} style={headStyle}>#</TableHead>
            <TableHead className={`w-[24%] ${headClass}`} style={headStyle}>Device Name</TableHead>
            <TableHead className={`w-[16%] ${headClass}`} style={headStyle}>Hostname</TableHead>
            <TableHead className={`w-[17%] ${headClass}`} style={headStyle}>Area</TableHead>
            <TableHead className={`w-[14%] ${headClass}`} style={headStyle}>Type</TableHead>
            <TableHead className={`w-[12%] text-center ${headClass}`} style={headStyle}>Status</TableHead>
            <TableHead className={`w-[12%] text-right ${headClass}`} style={headStyle}>Uptime</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12" style={{ color: "var(--text-lo)" }}>
                No devices in scope
              </TableCell>
            </TableRow>
          ) : (
            rows.map((d, index) => (
              <TableRow key={d.id} className="transition-colors" style={{ borderColor: "var(--border-soft)", borderLeft: "3px solid transparent" }}>
                <TableCell className="text-center text-sm tabular-nums" style={{ color: "var(--text-lo)" }}>{index + 1}</TableCell>
                <TableCell>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-hi)" }} title={d.name}>{d.name}</span>
                </TableCell>
                <TableCell>
                  {d.hostname ? (
                    <span className="text-xs font-mono px-2 py-1 rounded inline-block"
                      style={{ background: "rgba(34,211,238,0.10)", color: "var(--brand)", border: "1px solid var(--border-brand)" }}>
                      {d.hostname}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {AreaIcon}
                    <span className="text-sm truncate" style={{ color: "var(--text-mid)" }}>{d.area || "N/A"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {d.type ? <span className="badge-info">{d.type}</span> : <span className="text-xs" style={{ color: "var(--text-dim)" }}>—</span>}
                </TableCell>
                <TableCell className="text-center"><StatusCell online={d.online} /></TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums" style={{ color: uptimeColor(d.uptimePct, d.hasData) }}>
                  {d.hasData ? `${d.uptimePct.toFixed(1)}%` : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export interface ScopedLocationRow {
  name: string;
  type?: string;
  area?: string;
  online: boolean | null;
  devicesOnline: number;
  devicesOffline: number;
  devicesTotal: number;
  uptimePct: number;
  hasData: boolean;
}

export function ScopedLocationsTable({ rows }: { rows: ScopedLocationRow[] }) {
  return (
    <div className="overflow-auto max-h-[460px] rounded-lg border" style={{ borderColor: "var(--border-soft)" }}>
      <Table className="table-fixed w-full [&_td]:align-top [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
        <TableHeader className="sticky top-0 z-10" style={{ background: "rgba(15,23,42,0.92)" }}>
          <TableRow style={{ borderColor: "var(--border-soft)" }}>
            <TableHead className={`w-[5%] text-center ${headClass}`} style={headStyle}>#</TableHead>
            <TableHead className={`w-[28%] ${headClass}`} style={headStyle}>Location Name</TableHead>
            <TableHead className={`w-[15%] ${headClass}`} style={headStyle}>Type</TableHead>
            <TableHead className={`w-[14%] ${headClass}`} style={headStyle}>Area</TableHead>
            <TableHead className={`w-[12%] text-center ${headClass}`} style={headStyle}>Status</TableHead>
            <TableHead className={`w-[15%] ${headClass}`} style={headStyle}>Devices</TableHead>
            <TableHead className={`w-[11%] text-right ${headClass}`} style={headStyle}>Avg Uptime</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12" style={{ color: "var(--text-lo)" }}>
                No locations in scope
              </TableCell>
            </TableRow>
          ) : (
            rows.map((l, index) => (
              <TableRow key={l.name} className="transition-colors" style={{ borderColor: "var(--border-soft)", borderLeft: "3px solid transparent" }}>
                <TableCell className="text-center text-sm tabular-nums" style={{ color: "var(--text-lo)" }}>{index + 1}</TableCell>
                <TableCell className="whitespace-normal break-words">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-hi)" }} title={l.name}>{l.name}</span>
                </TableCell>
                <TableCell className="whitespace-normal break-words">
                  {l.type ? <span className="badge-info">{l.type}</span> : <span className="text-xs" style={{ color: "var(--text-dim)" }}>—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {AreaIcon}
                    <span className="text-sm truncate" style={{ color: "var(--text-mid)" }} title={l.area}>{l.area || "N/A"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center"><StatusCell online={l.online} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: "var(--status-online)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-online)" }} />
                      {l.devicesOnline}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: "var(--status-offline)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-offline)" }} />
                      {l.devicesOffline}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: "var(--text-lo)" }}>
                      / {l.devicesTotal}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums" style={{ color: uptimeColor(l.uptimePct, l.hasData) }}>
                  {l.hasData ? `${l.uptimePct.toFixed(1)}%` : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── DOWNTIME TABLES ──────────────────────────────────────────────────────────

export interface ScopedDeviceDowntimeRow {
  id: string | number;
  deviceName: string;
  ip: string;
  area: string;
  location: string;
  type: string;
  downtimePct: number;
  offlineCount: number;
  onlineCount: number;
  downtimeRecords?: DowntimeRecord[];
}

export interface ScopedLocationDowntimeRow {
  id: string | number;
  locationName: string;
  area: string;
  deviceCount: number;
  avgDowntimePct: number;
  totalOutageEvents?: number;
  /** Per-device breakdown — used by the location detail modal. */
  devices?: LocationDeviceDetail[];
}

function DowntimeColorCell({ pct }: { pct: number }) {
  const color =
    pct <= 5 ? "var(--status-online)"
    : pct <= 15 ? "var(--status-warning)"
    : "var(--status-offline)";
  return <span style={{ color }} className="font-semibold tabular-nums">{pct}%</span>;
}

// ─── Remarks dropdown (inline in the table row) ───────────────────────────────
function RemarksDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()} // prevent row click / modal open
      className="w-full rounded-md px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
      style={{
        background: "rgba(15,23,42,0.85)",
        borderColor: value ? "rgba(34,211,238,0.45)" : "var(--border-soft)",
        color: value ? "#22d3ee" : "var(--text-lo)",
        minWidth: 120,
      }}
    >
      <option value="">— Select —</option>
      {REMARKS_OPTIONS.filter(Boolean).map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

// ─── Device downtime table ─────────────────────────────────────────────────

export function ScopedDevicesDowntimeTable({
  rows,
  onRowClick,
}: {
  rows: ScopedDeviceDowntimeRow[];
  onRowClick?: (row: ScopedDeviceDowntimeRow) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ScopedDeviceDowntimeRow | null>(null);
  // Local remarks state: deviceId → selected remark string
  const [remarks, setRemarks] = useState<Record<string | number, string>>({});

  const handleRowClick = (row: ScopedDeviceDowntimeRow) => {
    setSelectedDevice(row);
    setModalOpen(true);
    onRowClick?.(row);
  };

  const handleRemarkChange = (id: string | number, value: string) => {
    setRemarks((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <div className="overflow-auto max-h-[460px] rounded-lg border" style={{ borderColor: "var(--border-soft)" }}>
        <Table className="table-fixed w-full [&_td]:align-top [&_td]:whitespace-normal [&_td]:break-words [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
          <TableHeader className="sticky top-0 z-10" style={{ background: "rgba(15,23,42,0.92)" }}>
            <TableRow style={{ borderColor: "var(--border-soft)" }}>
              <TableHead className={`w-[4%] text-center ${headClass}`} style={headStyle}>#</TableHead>
              <TableHead className={`w-[17%] ${headClass}`} style={headStyle}>Device Name</TableHead>
              <TableHead className={`w-[13%] ${headClass}`} style={headStyle}>IP Address</TableHead>
              <TableHead className={`w-[12%] ${headClass}`} style={headStyle}>Area</TableHead>
              <TableHead className={`w-[12%] ${headClass}`} style={headStyle}>Location</TableHead>
              <TableHead className={`w-[10%] ${headClass}`} style={headStyle}>Type</TableHead>
              <TableHead className={`w-[9%] text-right ${headClass}`} style={headStyle}>Downtime %</TableHead>
              <TableHead className={`w-[6%] text-right ${headClass}`} style={headStyle}>Events</TableHead>
              <TableHead className={`w-[17%] ${headClass}`} style={headStyle}>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12" style={{ color: "var(--text-lo)" }}>
                  No devices in scope
                </TableCell>
              </TableRow>
            ) : (
              rows.map((d, index) => (
                <TableRow
                  key={d.id}
                  className="transition-colors hover:bg-white/[0.05] cursor-pointer"
                  style={{ borderColor: "var(--border-soft)", borderLeft: "3px solid transparent" }}
                  onClick={() => handleRowClick(d)}
                  title="Click to see downtime ranges"
                >
                  <TableCell className="text-center text-sm tabular-nums" style={{ color: "var(--text-lo)" }}>{index + 1}</TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-hi)" }} title={d.deviceName}>
                      {d.deviceName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono px-2 py-1 rounded inline-block"
                      style={{ background: "rgba(34,211,238,0.10)", color: "var(--brand)", border: "1px solid var(--border-brand)" }}>
                      {d.ip}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {AreaIcon}
                      <span className="text-sm truncate" style={{ color: "var(--text-mid)" }}>{d.area || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm" style={{ color: "var(--text-mid)" }}>{d.location}</span>
                  </TableCell>
                  <TableCell>
                    {d.type ? <span className="badge-info">{d.type}</span> : <span className="text-xs" style={{ color: "var(--text-dim)" }}>—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DowntimeColorCell pct={d.downtimePct} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums" style={{ color: "var(--text-mid)" }}>
                    {d.offlineCount}
                  </TableCell>
                  <TableCell>
                    <RemarksDropdown
                      value={remarks[d.id] ?? ""}
                      onChange={(v) => handleRemarkChange(d.id, v)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedDevice && (
        <DowntimeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          device={{
            hostname: selectedDevice.deviceName,
            display: selectedDevice.deviceName,
            ip_address: selectedDevice.ip,
          }}
          records={selectedDevice.downtimeRecords || []}
        />
      )}
    </>
  );
}

// ─── Location downtime table (with clickable rows → detail modal) ─────────

export function ScopedLocationsDowntimeTable({
  rows,
  onRowClick,
}: {
  rows: ScopedLocationDowntimeRow[];
  onRowClick?: (row: ScopedLocationDowntimeRow) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<ScopedLocationDowntimeRow | null>(null);

  const handleRowClick = (row: ScopedLocationDowntimeRow) => {
    setSelectedLoc(row);
    setModalOpen(true);
    onRowClick?.(row);
  };

  return (
    <>
      <div className="overflow-auto max-h-[460px] rounded-lg border" style={{ borderColor: "var(--border-soft)" }}>
        <Table className="table-fixed w-full [&_td]:align-top [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-3">
          <TableHeader className="sticky top-0 z-10" style={{ background: "rgba(15,23,42,0.92)" }}>
            <TableRow style={{ borderColor: "var(--border-soft)" }}>
              <TableHead className={`w-[8%] text-center ${headClass}`} style={headStyle}>#</TableHead>
              <TableHead className={`w-[30%] ${headClass}`} style={headStyle}>Location Name</TableHead>
              <TableHead className={`w-[20%] ${headClass}`} style={headStyle}>Area</TableHead>
              <TableHead className={`w-[14%] text-center ${headClass}`} style={headStyle}>Devices</TableHead>
              <TableHead className={`w-[14%] text-center ${headClass}`} style={headStyle}>Outage Events</TableHead>
              <TableHead className={`w-[14%] text-right ${headClass}`} style={headStyle}>Avg Downtime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12" style={{ color: "var(--text-lo)" }}>
                  No locations in scope
                </TableCell>
              </TableRow>
            ) : (
              rows.map((l, index) => (
                <TableRow
                  key={l.id}
                  className="transition-colors hover:bg-white/[0.05] cursor-pointer"
                  style={{ borderColor: "var(--border-soft)", borderLeft: "3px solid transparent" }}
                  onClick={() => handleRowClick(l)}
                  title="Click to see location detail"
                >
                  <TableCell className="text-center text-sm tabular-nums" style={{ color: "var(--text-lo)" }}>{index + 1}</TableCell>
                  <TableCell className="whitespace-normal break-words">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-hi)" }} title={l.locationName}>
                      {l.locationName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {AreaIcon}
                      <span className="text-sm truncate" style={{ color: "var(--text-mid)" }} title={l.area}>
                        {l.area || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm" style={{ color: "var(--text-mid)" }}>
                    {l.deviceCount}
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums" style={{ color: "var(--text-mid)" }}>
                    {l.totalOutageEvents ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DowntimeColorCell pct={l.avgDowntimePct} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLoc && (
        <LocationDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          locationName={selectedLoc.locationName}
          area={selectedLoc.area}
          avgDowntimePct={selectedLoc.avgDowntimePct}
          totalOutageEvents={selectedLoc.totalOutageEvents ?? 0}
          devices={selectedLoc.devices ?? []}
        />
      )}
    </>
  );
}