import { useState } from "react";
import type { ReactNode } from "react";
import BaseCard from "./Base-Card";
import "@/index.css";
import { MenuGroupType } from "./Base-Card";

export interface MetricData {
    low: number;
    medium: number;
    high: number;
}

export interface MetricLabels {
    low?: string;
    medium?: string;
    high?: string;
}

export interface Metric1Props {
    title?: ReactNode;
    data?: MetricData;
    labels?: MetricLabels;
    className?: string;
    menuGroups?: MenuGroupType[];
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void;
    showGraph?: boolean;
    historicalData?: Array<{ timestamp: number; online: number; offline: number }>;
}

export default function Metric1({
    title = "Device Status",
    data = { low: 0, medium: 0, high: 0 },
    labels = { low: "Online", medium: "Unknown", high: "Offline" },
    className = "",
    menuGroups,
    onStatusClick,
    showGraph = true,
}: Metric1Props) {
    const [viewMode, setViewMode] = useState<'stats' | 'graph'>('stats');

    // merge unknown into offline for the headline number
    const mergedHigh = data.high + data.medium;
    const total = data.low + mergedHigh;
    const onlinePercent  = total > 0 ? Math.round((data.low / total) * 100) : 0;
    const offlinePercent = total > 0 ? Math.round((mergedHigh / total) * 100) : 0;

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Toggle view", onClick: () => setViewMode(viewMode === 'stats' ? 'graph' : 'stats') },
                { type: "separator" as const },
                { type: "item" as const, label: "Refresh", onClick: () => {} },
                { type: "item" as const, label: "Export CSV", onClick: () => {} },
            ],
        },
    ];

    const Donut = ({ percent, size = 86 }: { percent: number; size?: number }) => {
        const r = (size - 10) / 2;
        const c = 2 * Math.PI * r;
        const offset = c - (percent / 100) * c;
        return (
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="-rotate-90" width={size} height={size}>
                    <defs>
                        <linearGradient id="m1-donut" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--brand)" />
                            <stop offset="100%" stopColor="var(--status-online)" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        stroke="rgba(148,163,184,0.18)" strokeWidth="6" fill="transparent"
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        stroke="url(#m1-donut)" strokeWidth="6" fill="transparent"
                        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.4,0,.2,1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className="text-xl font-bold" style={{ color: 'var(--text-hi)' }}>{percent}%</span>
                    <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>uptime</span>
                </div>
            </div>
        );
    };

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            {viewMode === 'stats' ? (
                <div className="flex items-center gap-2 min-h-[130px] py-1">
                    <div className="flex flex-col items-center justify-center shrink-0" style={{ width: '36%' }}>
                        <Donut percent={onlinePercent} size={80} />
                        <div className="mt-1 text-center">
                            <div className="text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-lo)' }}>Total</div>
                            <div className="text-base font-semibold tabular-nums" style={{ color: 'var(--text-hi)' }}>{total}</div>
                        </div>
                    </div>

                    <div className="h-full w-px shrink-0" style={{ backgroundColor: 'var(--border-soft)' }} />

                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <button
                            onClick={() => onStatusClick?.('online')}
                            className="flex items-center justify-between gap-1 px-1.5 py-1 rounded-md transition-colors text-left hover:bg-white/[0.04]"
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="nms-dot nms-dot-online shrink-0" />
                                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-mid)' }}>{labels.low}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-base font-bold tabular-nums" style={{ color: 'var(--text-hi)' }}>{data.low}</span>
                                <span className="text-[10px] font-bold tabular-nums px-1 py-0.5 rounded badge-success whitespace-nowrap">{onlinePercent}%</span>
                            </div>
                        </button>
                        {showGraph && (
                            <div className="h-1 mx-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
                                <div
                                    className="h-full"
                                    style={{
                                        width: `${onlinePercent}%`,
                                        background: 'linear-gradient(90deg, var(--status-online), var(--brand))',
                                        transition: 'width 700ms cubic-bezier(.4,0,.2,1)',
                                    }}
                                />
                            </div>
                        )}

                        <button
                            onClick={() => onStatusClick?.('offline')}
                            className="flex items-center justify-between gap-1 px-1.5 py-1 rounded-md transition-colors text-left hover:bg-white/[0.04]"
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="nms-dot nms-dot-offline shrink-0" />
                                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-mid)' }}>{labels.high}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-base font-bold tabular-nums" style={{ color: 'var(--text-hi)' }}>{mergedHigh}</span>
                                <span className="text-[10px] font-bold tabular-nums px-1 py-0.5 rounded badge-critical whitespace-nowrap">{offlinePercent}%</span>
                            </div>
                        </button>
                        {showGraph && (
                            <div className="h-1 mx-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
                                <div
                                    className="h-full"
                                    style={{
                                        width: `${offlinePercent}%`,
                                        background: 'linear-gradient(90deg, var(--status-offline), #FB923C)',
                                        transition: 'width 700ms cubic-bezier(.4,0,.2,1)',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full gap-6 py-2">
                    <div className="text-center">
                        <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--status-online)' }}>{data.low}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>{labels.low}</div>
                    </div>
                    <div className="w-px h-12" style={{ backgroundColor: 'var(--border-soft)' }} />
                    <div className="text-center">
                        <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--status-offline)' }}>{mergedHigh}</div>
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>{labels.high}</div>
                    </div>
                </div>
            )}
        </BaseCard>
    );
}
