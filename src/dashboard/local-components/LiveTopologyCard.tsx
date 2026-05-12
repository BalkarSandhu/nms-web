import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Waypoints, ChevronRight } from "lucide-react";
import BaseCard from "./Base-Card";
import "@/index.css";

export interface LiveTopologyArea {
    area: string;
    online: number;
    offline: number;
    partial: number;
    total: number;
}

export interface LiveTopologyCardProps {
    areas: LiveTopologyArea[];
    totalDevices: number;
    onlineDevices: number;
    className?: string;
}

/**
 * Compact "Live Topology" preview.
 * Mini network diagram: a hub node plus a small set of area satellites
 * laid out as a tree-graph, with curved connectors and animated data
 * pulses along each edge.  Click → /topology.
 */
export default function LiveTopologyCard({
    areas,
    totalDevices,
    onlineDevices,
    className = "",
}: LiveTopologyCardProps) {
    const navigate = useNavigate();

    const topAreas = useMemo(
        () => [...areas].sort((a, b) => b.total - a.total).slice(0, 6),
        [areas]
    );

    const healthPct = totalDevices > 0
        ? Math.round((onlineDevices / totalDevices) * 100)
        : 100;

    const healthColor =
        healthPct >= 90 ? "var(--status-online)" :
        healthPct >= 70 ? "var(--status-warning)" :
        "var(--status-offline)";

    const accent = (a: LiveTopologyArea) => {
        if (a.offline > 0) return "var(--status-offline)";
        if (a.partial > 0) return "var(--status-warning)";
        if (a.online > 0) return "var(--status-online)";
        return "var(--text-dim)";
    };

    // ── Layout: hub at left-center, satellites scattered on the right canvas.
    // H is tuned to fit BaseCard's content area (~108px after padding + title).
    const W = 132;
    const H = 108;
    const HUB = { x: 22, y: H / 2 };

    // Deterministic but natural-looking satellite positions across a 2-col layout
    // so it doesn't look radial/circular.
    const satellitePositions = useMemo(() => {
        const n = Math.max(1, topAreas.length);
        // Two columns of nodes, varying y by index to break symmetry
        return topAreas.map((_, i) => {
            const col = i % 2;             // 0 or 1
            const rowIdx = Math.floor(i / 2);
            const colX = col === 0 ? 66 : 112;
            // distribute rows evenly; small phase shift between cols
            const rows = Math.ceil(n / 2);
            const rowH = (H - 26) / Math.max(1, rows);
            const baseY = 14 + rowH * rowIdx + rowH / 2;
            const jitter = col === 0 ? 0 : 5;   // offset right column a touch
            return { x: colX, y: baseY + jitter };
        });
    }, [topAreas]);

    return (
        <BaseCard
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Waypoints size={11} style={{ color: "var(--brand)" }} />
                    Live Topology
                    <span
                        style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: "var(--status-online)",
                            boxShadow: "0 0 5px var(--status-online)",
                            animation: "nms-pulse 1.8s ease-in-out infinite",
                            marginLeft: 2,
                        }}
                    />
                </span>
            }
            className={className}
        >
            <button
                type="button"
                onClick={() => navigate("/topology")}
                className="w-full h-full flex items-center gap-3 text-left transition-colors rounded-md px-1 -mx-1 hover:bg-white/[0.03]"
                aria-label="Open live topology"
            >
                {/* Mini network preview */}
                <div
                    className="shrink-0 relative rounded-lg overflow-hidden"
                    style={{
                        width: W,
                        height: H,
                        background:
                            "linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(11,18,32,0.85) 100%)",
                        border: "1px solid var(--border-soft)",
                    }}
                >
                    {/* dotted grid backdrop */}
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${W} ${H}`}
                        style={{ position: "absolute", inset: 0 }}
                    >
                        <defs>
                            <pattern id="ltc-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                                <circle cx="0" cy="0" r="0.6" fill="rgba(148,163,184,0.18)" />
                            </pattern>
                            <filter id="ltc-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="1.4" result="b" />
                                <feMerge>
                                    <feMergeNode in="b" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#ltc-dots)" />

                        {/* curved edges from hub to each satellite */}
                        {satellitePositions.map((p, i) => {
                            const a = topAreas[i];
                            const color = accent(a);
                            const mx = (HUB.x + p.x) / 2;
                            const offset = (i % 2 === 0 ? -12 : 12);
                            const dPath = `M${HUB.x},${HUB.y} Q${mx},${(HUB.y + p.y) / 2 + offset} ${p.x},${p.y}`;
                            const id = `ltc-path-${i}`;
                            const dead = a.offline > 0;
                            return (
                                <g key={`edge-${a.area}`}>
                                    <path
                                        id={id}
                                        d={dPath}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={dead ? 0.9 : 1.1}
                                        strokeDasharray={dead ? "3 3" : undefined}
                                        opacity={dead ? 0.45 : 0.55}
                                    />
                                    {!dead && (
                                        <circle
                                            r="1.6"
                                            fill={color}
                                            opacity="0.95"
                                        >
                                            <animateMotion
                                                dur={`${2.2 + (i % 3) * 0.4}s`}
                                                repeatCount="indefinite"
                                                begin={`${i * 0.3}s`}
                                            >
                                                <mpath href={`#${id}`} />
                                            </animateMotion>
                                        </circle>
                                    )}
                                </g>
                            );
                        })}

                        {/* hub */}
                        <g transform={`translate(${HUB.x},${HUB.y})`} filter="url(#ltc-glow)">
                            <circle r="11" fill="rgba(15,23,42,0.95)" stroke="var(--brand)" strokeWidth="1.4" />
                            <circle r="3.5" fill="var(--brand)">
                                <animate
                                    attributeName="opacity"
                                    values="1;0.4;1"
                                    dur="2.2s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </g>

                        {/* satellites */}
                        {satellitePositions.map((p, i) => {
                            const a = topAreas[i];
                            const color = accent(a);
                            return (
                                <g key={`node-${a.area}`} transform={`translate(${p.x},${p.y})`} filter="url(#ltc-glow)">
                                    <circle r="7.5" fill={color} opacity="0.15" />
                                    <circle
                                        r="5"
                                        fill="rgba(15,23,42,0.95)"
                                        stroke={color}
                                        strokeWidth="1.4"
                                    />
                                    <circle r="1.6" fill={color} />
                                </g>
                            );
                        })}

                    </svg>
                </div>

                {/* Right side stats */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-1 self-stretch">
                    <div className="flex items-baseline gap-1.5">
                        <span
                            className="text-2xl font-bold tabular-nums leading-none"
                            style={{ color: "var(--text-hi)" }}
                        >
                            {areas.length}
                        </span>
                        <span
                            className="text-[10px] uppercase tracking-[0.08em] font-semibold whitespace-nowrap"
                            style={{ color: "var(--text-lo)" }}
                        >
                            Areas
                        </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                        <Stat label="Online" value={onlineDevices} color="var(--status-online)" />
                        <span className="h-5 w-px shrink-0" style={{ background: "var(--border-soft)" }} />
                        <Stat
                            label="Health"
                            value={`${healthPct}%`}
                            color={healthColor}
                        />
                    </div>

                    <StatusBar areas={areas} />

                    <div
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] mt-auto whitespace-nowrap"
                        style={{ color: "var(--brand)" }}
                    >
                        Open Topology
                        <ChevronRight size={11} />
                    </div>
                </div>
            </button>
        </BaseCard>
    );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span
                className="text-base font-bold tabular-nums leading-none whitespace-nowrap"
                style={{ color }}
            >
                {value}
            </span>
            <span
                className="text-[9px] uppercase tracking-[0.06em] font-semibold whitespace-nowrap"
                style={{ color: "var(--text-lo)" }}
            >
                {label}
            </span>
        </div>
    );
}

function StatusBar({ areas }: { areas: LiveTopologyArea[] }) {
    const totals = areas.reduce(
        (acc, a) => {
            acc.online += a.online;
            acc.partial += a.partial;
            acc.offline += a.offline;
            acc.total += a.total;
            return acc;
        },
        { online: 0, partial: 0, offline: 0, total: 0 }
    );
    if (totals.total === 0) return null;
    const onlinePct  = (totals.online  / totals.total) * 100;
    const partialPct = (totals.partial / totals.total) * 100;
    const offlinePct = (totals.offline / totals.total) * 100;
    return (
        <div className="flex flex-col gap-1">
            <div
                className="h-1.5 rounded-full overflow-hidden flex"
                style={{ background: "rgba(148,163,184,0.1)" }}
            >
                <span style={{ width: `${onlinePct}%`,  background: "var(--status-online)",  transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
                <span style={{ width: `${partialPct}%`, background: "var(--status-warning)", transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
                <span style={{ width: `${offlinePct}%`, background: "var(--status-offline)", transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
            </div>
            <div
                className="text-[9px] font-medium tabular-nums flex justify-between gap-1"
                style={{ color: "var(--text-lo)" }}
            >
                <span className="whitespace-nowrap" style={{ color: "var(--status-online)"  }}>{totals.online} up</span>
                <span className="whitespace-nowrap" style={{ color: "var(--status-warning)" }}>{totals.partial} deg</span>
                <span className="whitespace-nowrap" style={{ color: "var(--status-offline)" }}>{totals.offline} down</span>
            </div>
        </div>
    );
}
