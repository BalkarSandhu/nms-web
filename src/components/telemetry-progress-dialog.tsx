/**
 * Blocking progress overlay shown while per-device telemetry is fetched
 * (e.g. after a timeline change). A circular ring fills as devices complete
 * and the "N of M" count climbs. Intentionally a plain fixed overlay rather
 * than a Radix Dialog so it can't be dismissed mid-fetch.
 */
export default function TelemetryProgressDialog({
  open,
  done,
  total,
  label = "Fetching telemetry",
}: {
  open: boolean;
  done: number;
  total: number;
  label?: string;
}) {
  if (!open) return null;

  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center fade-in"
      style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(4px)" }}
      role="alertdialog"
      aria-busy="true"
      aria-label={`${label}: ${done} of ${total} devices`}
    >
      <div
        className="flex flex-col items-center gap-4 px-8 py-7 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)",
          border: "1px solid var(--border-soft)",
          boxShadow: "var(--shadow-elev)",
          minWidth: 260,
        }}
      >
        <div className="relative" style={{ width: 132, height: 132 }}>
          <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
            <circle
              cx="66" cy="66" r={R} fill="none"
              stroke="rgba(148,163,184,0.18)" strokeWidth="9"
            />
            <circle
              cx="66" cy="66" r={R} fill="none"
              stroke="var(--brand)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${dash} ${C - dash}`}
              style={{ transition: "stroke-dasharray 0.35s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: "var(--text-hi)" }}
            >
              {pct}
              <span className="text-sm align-top">%</span>
            </span>
            <span
              className="mt-1 text-[11px] font-semibold tabular-nums"
              style={{ color: "var(--brand)" }}
            >
              {done} / {total}
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text-hi)" }}>
            {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-mid)" }}>
            Fetched {done} of {total} device{total !== 1 ? "s" : ""}…
          </p>
        </div>
      </div>
    </div>
  );
}
