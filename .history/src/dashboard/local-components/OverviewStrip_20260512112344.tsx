import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import "@/index.css";

export type KpiTrend = "up" | "down" | "flat";

export interface KpiTileProps {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    icon?: ReactNode;
    accent?: "brand" | "online" | "offline" | "warning" | "info";
    trend?: { direction: KpiTrend; label: string };
    sparkline?: number[];
    onClick?: () => void;
}

const ACCENT: Record<NonNullable<KpiTileProps["accent"]>, string> = {
    brand:   "var(--brand)",
    online:  "var(--status-online)",
    offline: "var(--status-offline)",
    warning: "var(--status-warning)",
    info:    "var(--status-info)",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (!data.length) return null;
    const w = 120, h = 32, pad = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data
        .map((v, i) => {
            const x = pad + (i / (data.length - 1 || 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x},${y}`;
        })
        .join(" ");
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`spark-${color.replace(/[^a-z]/gi, "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
                fill={`url(#spark-${color.replace(/[^a-z]/gi, "")})`}
                stroke="none"
            />
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function KpiTile({ label, value, sub, icon, accent = "brand", trend, sparkline, onClick }: KpiTileProps) {
    const color = ACCENT[accent];
    return (
        <button
            type="button"
            onClick={onClick}
            className="nms-kpi text-left"
            style={{ cursor: onClick ? "pointer" : "default" }}
        >
            <div className="relative z-10 flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-lo)" }}>
                        {label}
                    </span>
                    <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: "var(--text-hi)" }}>
                        {value}
                    </span>
                    {sub && (
                        <span className="text-[11px] mt-1" style={{ color: "var(--text-mid)" }}>
                            {sub}
                        </span>
                    )}
                </div>
                {icon && (
                    <span
                        className="size-10 inline-flex items-center justify-center rounded-lg shrink-0"
                        style={{
                            background: `color-mix(in oklab, ${color} 14%, transparent)`,
                            color,
                            border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
                        }}
                    >
                        {icon}
                    </span>
                )}
            </div>
            <div className="relative z-10 mt-2 flex items-end justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--text-lo)" }}>
                    {trend && (
                        <>
                            {trend.direction === "up"   && <TrendingUp   className="size-3.5" style={{ color: "var(--status-online)"  }} />}
                            {trend.direction === "down" && <TrendingDown className="size-3.5" style={{ color: "var(--status-offline)" }} />}
                            {trend.direction === "flat" && <Minus        className="size-3.5" style={{ color: "var(--text-lo)"       }} />}
                            <span style={{
                                color:
                                    trend.direction === "up"   ? "var(--status-online)"  :
                                    trend.direction === "down" ? "var(--status-offline)" : "var(--text-lo)",
                            }}>
                                {trend.label}
                            </span>
                        </>
                    )}
                </div>
                {sparkline && sparkline.length > 0 && (
                    <div className="w-28 shrink-0">
                        <Sparkline data={sparkline} color={color} />
                    </div>
                )}
            </div>
        </button>
    );
}

export interface OverviewStripProps {
    devicesTotal: number;
    devicesOnline: number;
    locationsTotal: number;
    locationsOffline: number;
    areasOnline: number;
    areasTotal: number;
    healthScore: number;
    onDevicesClick?: () => void;
    onLocationsClick?: () => void;
    onAreasClick?: () => void;
}

export default function OverviewStrip({
    devicesTotal,
    devicesOnline,
    locationsTotal,
    locationsOffline,
    areasOnline,
    areasTotal,
    healthScore,
    onDevicesClick,
    onLocationsClick,
    onAreasClick,
}: OverviewStripProps) {
    const devicePct = devicesTotal ? Math.round((devicesOnline / devicesTotal) * 100) : 0;
    const areaPct   = areasTotal   ? Math.round((areasOnline   / areasTotal)   * 100) : 0;

    // pseudo sparkline (small drift around the current value) — deterministic so it doesn't jitter every render
    const spark = (base: number) => Array.from({ length: 16 }, (_, i) =>
        Math.max(0, base + Math.round(Math.sin(i * 0.6 + base) * Math.max(2, base * 0.08))),
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <KpiTile
                label="Network Health"
                value={`${healthScore}%`}
                sub={
                    healthScore >= 95 ? "Operating normally" :
                    healthScore >= 80 ? "Minor degradation"  :
                    "Service impacted"
                }
                accent={healthScore >= 95 ? "online" : healthScore >= 80 ? "warning" : "offline"}
                icon={
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                }
                trend={{ direction: healthScore >= 95 ? "up" : "flat", label: `${healthScore >= 95 ? "+" : ""}${healthScore - 92}% vs 24h` }}
                sparkline={spark(healthScore)}
            />
            <KpiTile
                label="Devices Online"
                value={devicesOnline}
                sub={`${devicePct}% of ${devicesTotal} total`}
                accent="brand"
                icon={
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path d="M8 20h8M12 16v4" strokeLinecap="round" />
                    </svg>
                }
                trend={{ direction: devicePct >= 95 ? "up" : "down", label: `${devicesTotal - devicesOnline} offline` }}
                sparkline={spark(devicesOnline)}
                onClick={onDevicesClick}
            />
            <KpiTile
                label="Critical Locations"
                value={locationsOffline}
                sub={`${locationsTotal} locations monitored`}
                accent={locationsOffline > 0 ? "offline" : "online"}
                icon={
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                }
                trend={{ direction: locationsOffline === 0 ? "up" : "down", label: locationsOffline === 0 ? "All clear" : `${locationsOffline} need attention` }}
                sparkline={spark(Math.max(1, locationsOffline))}
                onClick={onLocationsClick}
            />
            <KpiTile
                label="Field Workers"
                value={areasOnline}
                sub={`${areaPct}% of ${areasTotal} active`}
                accent={areaPct >= 80 ? "online" : "warning"}
                icon={
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                }
                trend={{ direction: areaPct >= 80 ? "up" : "flat", label: `${areasTotal - areasOnline} offline` }}
                sparkline={spark(areasOnline || 1)}
                onClick={onAreasClick}
            />
        </div>
    );
}
