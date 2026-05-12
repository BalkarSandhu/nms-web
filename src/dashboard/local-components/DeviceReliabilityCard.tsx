import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertTriangle, ChevronRight } from "lucide-react";
import BaseCard from "./Base-Card";
import "@/index.css";

interface DeviceLike {
    id: number;
    is_reachable?: boolean;
    consecutive_failures?: number;
}

export interface DeviceReliabilityCardProps {
    devices: DeviceLike[];
    className?: string;
}

/**
 * "Device Reliability" — failure-distribution metric for NMS.
 * Buckets devices by consecutive_failures (a signal the status donut hides):
 *   • Stable    (failures = 0, reachable)        → all good
 *   • Flapping  (failures 1–2, reachable)        → early warning
 *   • Failing   (failures 3–9)                   → action soon
 *   • Critical  (failures ≥ 10 or unreachable)   → action now
 * The donut shows online/offline; this card shows *risk*, which is more
 * actionable for an NMS operator.
 */
export default function DeviceReliabilityCard({
    devices,
    className = "",
}: DeviceReliabilityCardProps) {
    const navigate = useNavigate();

    const buckets = useMemo(() => {
        const stable: number[] = [];
        const flapping: number[] = [];
        const failing: number[] = [];
        const critical: number[] = [];
        for (const d of devices) {
            const f = d.consecutive_failures ?? 0;
            const reachable = d.is_reachable !== false;
            if (!reachable || f >= 10) critical.push(d.id);
            else if (f >= 3) failing.push(d.id);
            else if (f >= 1) flapping.push(d.id);
            else stable.push(d.id);
        }
        const total = devices.length;
        const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
        return {
            total,
            stable:    { count: stable.length,    pct: pct(stable.length)    },
            flapping:  { count: flapping.length,  pct: pct(flapping.length)  },
            failing:   { count: failing.length,   pct: pct(failing.length)   },
            critical:  { count: critical.length,  pct: pct(critical.length)  },
        };
    }, [devices]);

    const stablePct = Math.round(buckets.stable.pct);
    const atRisk =
        buckets.flapping.count + buckets.failing.count + buckets.critical.count;

    // Reliability colour follows stable %
    const reliabilityColor =
        stablePct >= 95 ? "var(--status-online)" :
        stablePct >= 80 ? "var(--status-warning)" :
        "var(--status-offline)";

    return (
        <BaseCard
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={11} style={{ color: "var(--brand)" }} />
                    Device Reliability
                </span>
            }
            className={className}
        >
            <button
                type="button"
                onClick={() => navigate("/devices")}
                className="w-full h-full flex items-center gap-3 text-left transition-colors rounded-md px-1 -mx-1 hover:bg-white/[0.03]"
                aria-label="Open device reliability"
            >
                {/* Left: big stable% + at-risk count */}
                <div className="flex flex-col gap-1 shrink-0" style={{ minWidth: 68 }}>
                    <div className="flex items-baseline gap-1">
                        <span
                            className="text-3xl font-bold tabular-nums leading-none"
                            style={{ color: reliabilityColor }}
                        >
                            {stablePct}
                        </span>
                        <span
                            className="text-sm font-bold"
                            style={{ color: "var(--text-lo)" }}
                        >
                            %
                        </span>
                    </div>
                    <span
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
                        style={{ color: "var(--text-lo)" }}
                    >
                        Stable
                    </span>
                    <div
                        className="inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5 whitespace-nowrap"
                        style={{
                            color: atRisk === 0 ? "var(--text-lo)" : "var(--status-warning)",
                        }}
                    >
                        {atRisk > 0 && <AlertTriangle size={11} />}
                        <span>
                            {atRisk === 0 ? "All stable" : `${atRisk} at-risk`}
                        </span>
                    </div>
                </div>

                {/* Right: stacked distribution + bucket chips */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 self-stretch py-1">
                    {/* Stacked bar */}
                    <div
                        className="h-2.5 rounded-full overflow-hidden flex"
                        style={{
                            background: "rgba(148,163,184,0.1)",
                            border: "1px solid var(--border-soft)",
                        }}
                        title={
                            `Stable ${buckets.stable.count} · ` +
                            `Flapping ${buckets.flapping.count} · ` +
                            `Failing ${buckets.failing.count} · ` +
                            `Critical ${buckets.critical.count}`
                        }
                    >
                        {(
                            [
                                { key: "stable",   color: "var(--status-online)",  pct: buckets.stable.pct   },
                                { key: "flapping", color: "#FACC15",               pct: buckets.flapping.pct },
                                { key: "failing",  color: "var(--status-warning)", pct: buckets.failing.pct  },
                                { key: "critical", color: "var(--status-offline)", pct: buckets.critical.pct },
                            ] as const
                        ).map((seg) =>
                            seg.pct > 0 ? (
                                <span
                                    key={seg.key}
                                    style={{
                                        width: `${seg.pct}%`,
                                        background: seg.color,
                                        transition: "width .6s cubic-bezier(.4,0,.2,1)",
                                        boxShadow:
                                            seg.key === "critical"
                                                ? "inset 0 0 6px rgba(239,68,68,0.5)"
                                                : "none",
                                    }}
                                />
                            ) : null
                        )}
                    </div>

                    {/* Tick legend */}
                    <div
                        className="text-[9px] font-semibold tabular-nums flex justify-between gap-1"
                        style={{ color: "var(--text-lo)" }}
                    >
                        <span className="whitespace-nowrap">{buckets.total} devices</span>
                        <span className="whitespace-nowrap" style={{ color: reliabilityColor }}>
                            {stablePct}% reliable
                        </span>
                    </div>

                    {/* Bucket chips */}
                    <div className="grid grid-cols-2 gap-1 mt-0.5">
                        <Chip
                            label="Stable"
                            value={buckets.stable.count}
                            color="var(--status-online)"
                        />
                        <Chip
                            label="Flapping"
                            value={buckets.flapping.count}
                            color="#FACC15"
                            highlight={buckets.flapping.count > 0}
                        />
                        <Chip
                            label="Failing"
                            value={buckets.failing.count}
                            color="var(--status-warning)"
                            highlight={buckets.failing.count > 0}
                        />
                        <Chip
                            label="Critical"
                            value={buckets.critical.count}
                            color="var(--status-offline)"
                            highlight={buckets.critical.count > 0}
                        />
                    </div>

                    <div
                        className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.06em] mt-auto whitespace-nowrap"
                        style={{ color: "var(--brand)" }}
                    >
                        Inspect Devices
                        <ChevronRight size={10} />
                    </div>
                </div>
            </button>
        </BaseCard>
    );
}

function Chip({
    label,
    value,
    color,
    highlight = false,
}: {
    label: string;
    value: number;
    color: string;
    highlight?: boolean;
}) {
    return (
        <div
            className="flex items-center justify-between gap-1 rounded-md px-1.5 py-0.5"
            style={{
                background: highlight
                    ? `color-mix(in oklab, ${color} 10%, transparent)`
                    : "rgba(148,163,184,0.04)",
                border: `1px solid ${highlight
                    ? `color-mix(in oklab, ${color} 28%, transparent)`
                    : "var(--border-soft)"}`,
            }}
        >
            <span className="flex items-center gap-1 min-w-0">
                <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                        background: color,
                        boxShadow: `0 0 5px ${color}`,
                    }}
                />
                <span
                    className="text-[9px] uppercase tracking-[0.02em] font-semibold whitespace-nowrap"
                    style={{ color: "var(--text-lo)" }}
                >
                    {label}
                </span>
            </span>
            <span
                className="text-[11px] font-bold tabular-nums shrink-0"
                style={{ color: "var(--text-hi)" }}
            >
                {value}
            </span>
        </div>
    );
}
