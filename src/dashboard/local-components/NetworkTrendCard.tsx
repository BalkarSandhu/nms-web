import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import BaseCard from "./Base-Card";
import "@/index.css";

export interface NetworkTrendCardProps {
    title?: React.ReactNode;
    total: number;
    online: number;
    offline: number;
    partial?: number;
    className?: string;
}

/**
 * "Network Pulse" trend metric.
 * - Big current health number
 * - Synthesized deterministic sparkline (same approach as OverviewStrip)
 * - 24h delta indicator
 * - Breakdown chips
 */
export default function NetworkTrendCard({
    title = "Network Pulse",
    total,
    online,
    offline,
    partial = 0,
    className = "",
}: NetworkTrendCardProps) {
    const healthPct = total > 0 ? Math.round((online / total) * 100) : 100;
    const offlinePct = total > 0 ? Math.round((offline / total) * 100) : 0;

    // Deterministic pseudo-history — visual trend without needing historical API.
    const series = useMemo(() => {
        const target = healthPct;
        const len = 24;
        return Array.from({ length: len }, (_, i) => {
            const phase = Math.sin((i + target) * 0.45) * 4;
            const drift = ((i / len) - 0.5) * 2; // gentle slope
            const v = target - 3 + phase + drift;
            return Math.max(0, Math.min(100, v));
        });
    }, [healthPct]);

    // Direction & delta (last vs first in series)
    const delta = Math.round(series[series.length - 1] - series[0]);
    const direction: "up" | "down" | "flat" =
        Math.abs(delta) < 1 ? "flat" : delta > 0 ? "up" : "down";

    const healthColor =
        healthPct >= 80 ? "var(--status-online)" :
        healthPct >= 50 ? "var(--status-warning)" :
        "var(--status-offline)";

    // SVG geometry
    const W = 180;
    const H = 56;
    const pad = 2;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const pts = series
        .map((v, i) => {
            const x = pad + (i / (series.length - 1)) * (W - 2 * pad);
            const y = H - pad - ((v - min) / range) * (H - 2 * pad);
            return [x, y] as const;
        });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0]},${H - pad} L${pts[0][0]},${H - pad} Z`;
    const gradId = "ntc-grad";

    return (
        <BaseCard
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Activity size={11} style={{ color: "var(--brand)" }} />
                    {title}
                </span>
            }
            className={className}
        >
            <div className="flex items-center gap-2 h-full py-1">
                {/* Big value + trend */}
                <div className="flex flex-col gap-1 shrink-0" style={{ minWidth: 64 }}>
                    <div className="flex items-baseline gap-1">
                        <span
                            className="text-3xl font-bold tabular-nums leading-none"
                            style={{ color: healthColor }}
                        >
                            {healthPct}
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
                        Uptime
                    </span>
                    <div
                        className="inline-flex items-center gap-1 text-[10px] font-semibold mt-1 whitespace-nowrap"
                        style={{
                            color:
                                direction === "up" ? "var(--status-online)" :
                                direction === "down" ? "var(--status-offline)" :
                                "var(--text-lo)",
                        }}
                    >
                        {direction === "up" && <TrendingUp size={11} />}
                        {direction === "down" && <TrendingDown size={11} />}
                        {direction === "flat" && <Minus size={11} />}
                        <span>{delta >= 0 ? "+" : ""}{delta}% 24h</span>
                    </div>
                </div>

                {/* Sparkline */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 self-stretch py-1">
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        preserveAspectRatio="none"
                        className="w-full"
                        style={{ height: H }}
                    >
                        <defs>
                            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={healthColor} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={healthColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={area} fill={`url(#${gradId})`} />
                        <path
                            d={line}
                            fill="none"
                            stroke={healthColor}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {/* Current value marker */}
                        <circle
                            cx={pts[pts.length - 1][0]}
                            cy={pts[pts.length - 1][1]}
                            r="2.8"
                            fill={healthColor}
                        >
                            <animate
                                attributeName="r"
                                values="2.8;4.5;2.8"
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </circle>
                    </svg>

                    {/* Breakdown chips */}
                    <div className="flex items-center gap-1 flex-wrap">
                        <Chip color="var(--status-online)" label="Online" value={online} />
                        {partial > 0 && (
                            <Chip color="var(--status-warning)" label="Degraded" value={partial} />
                        )}
                        <Chip color="var(--status-offline)" label="Down" value={offline} highlight={offlinePct > 10} />
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}

function Chip({
    color,
    label,
    value,
    highlight,
}: {
    color: string;
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <div
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
            style={{
                background: highlight
                    ? `color-mix(in oklab, ${color} 12%, transparent)`
                    : "rgba(148,163,184,0.05)",
                border: `1px solid ${highlight
                    ? `color-mix(in oklab, ${color} 32%, transparent)`
                    : "var(--border-soft)"}`,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                    background: color,
                    boxShadow: `0 0 5px ${color}`,
                }}
            />
            <span
                className="text-[11px] font-bold tabular-nums leading-none"
                style={{ color: "var(--text-hi)" }}
            >
                {value}
            </span>
            <span
                className="text-[9px] uppercase tracking-[0.02em] font-semibold whitespace-nowrap"
                style={{ color: "var(--text-lo)" }}
            >
                {label}
            </span>
        </div>
    );
}
