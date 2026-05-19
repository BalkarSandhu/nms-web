/**
 * Read-only device / location tables for the opened Area Card. They mirror
 * the Dashboard tables' visuals (dark panel, sticky header, nms status dots,
 * badge-info type chips) but are scoped to the report's devices/locations and
 * carry no pagination / add / export / URL coupling. A trailing "Uptime"
 * column is added since this is the historical report context.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const headStyle: React.CSSProperties = { color: "var(--text-lo)" };
const headClass = "font-semibold text-[11px] uppercase tracking-[0.14em]";

function StatusCell({ online }: { online: boolean | null }) {
  if (online === null) {
    return (
      <div className="inline-flex items-center justify-center gap-1.5">
        <span className="nms-dot nms-dot-unknown" />
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--status-unknown, #8B5CF6)" }}
        >
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

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
              <TableRow
                key={d.id}
                className="transition-colors"
                style={{ borderColor: "var(--border-soft)", borderLeft: "3px solid transparent" }}
              >
                <TableCell className="text-center text-sm tabular-nums" style={{ color: "var(--text-lo)" }}>{index + 1}</TableCell>
                <TableCell>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-hi)" }} title={d.name}>
                    {d.name}
                  </span>
                </TableCell>
                <TableCell>
                  {d.hostname ? (
                    <span
                      className="text-xs font-mono px-2 py-1 rounded inline-block"
                      style={{ background: "rgba(34,211,238,0.10)", color: "var(--brand)", border: "1px solid var(--border-brand)" }}
                    >
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
                <TableCell className="text-center">
                  <StatusCell online={d.online} />
                </TableCell>
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
              <TableRow
                key={l.name}
                className="transition-colors"
                style={{ borderColor: "var(--border-soft)", borderLeft: "3px solid transparent" }}
              >
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
                <TableCell className="text-center">
                  <StatusCell online={l.online} />
                </TableCell>
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
