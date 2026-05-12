import type { ReactNode } from "react";
import BaseCard from "./Base-Card";
import "@/index.css";

export interface GaugeData { low: number; medium: number; high: number; }
export interface GaugeLabels { low?: string; medium?: string; high?: string; }
export interface GaugeLinks  { low?: string; medium?: string; high?: string; }

export interface Metric3Props {
    title?: ReactNode;
    data?: GaugeData;
    labels?: GaugeLabels;
    links?: GaugeLinks;
    className?: string;
    menuGroups?: any[];
}

export default function Metric3({
    title = "Distribution",
    data = { low: 25, medium: 35, high: 40 },
    labels = { low: "Category 1", medium: "Category 2", high: "Category 3" },
    links = { low: "#", medium: "#", high: "#" },
    className = "",
    menuGroups,
}: Metric3Props) {
    const total = data.low + data.medium + data.high;
    const lowPct = total ? (data.low / total) * 100 : 0;
    const medPct = total ? (data.medium / total) * 100 : 0;
    const highPct = total ? (data.high / total) * 100 : 0;

    const go = (url?: string) => { if (url) window.location.href = url; };

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full justify-center gap-3">
                <div className="flex items-baseline gap-2 justify-center">
                    <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-hi)' }}>{total}</span>
                    <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>Total</span>
                </div>

                <div className="w-full h-7 flex rounded-md overflow-hidden" style={{ background: 'rgba(148,163,184,0.10)' }}>
                    <button
                        onClick={() => go(links.low)}
                        className="flex items-center justify-center transition-all"
                        style={{ width: `${lowPct}%`, background: 'linear-gradient(180deg, var(--status-online), #059669)' }}
                    >
                        {lowPct > 10 && <span className="text-[10px] font-semibold text-white">{Math.round(lowPct)}%</span>}
                    </button>
                    <button
                        onClick={() => go(links.medium)}
                        className="flex items-center justify-center transition-all"
                        style={{ width: `${medPct}%`, background: 'linear-gradient(180deg, var(--brand), var(--brand-strong))' }}
                    >
                        {medPct > 10 && <span className="text-[10px] font-semibold text-white">{Math.round(medPct)}%</span>}
                    </button>
                    <button
                        onClick={() => go(links.high)}
                        className="flex items-center justify-center transition-all"
                        style={{ width: `${highPct}%`, background: 'linear-gradient(180deg, var(--status-offline), #DC2626)' }}
                    >
                        {highPct > 10 && <span className="text-[10px] font-semibold text-white">{Math.round(highPct)}%</span>}
                    </button>
                </div>

                <div className="w-full flex justify-center gap-4">
                    <div className="flex items-center gap-1.5"><span className="nms-dot nms-dot-online" /><span className="text-[11px]" style={{ color: 'var(--text-mid)' }}>{labels.low}: {data.low}</span></div>
                    <div className="flex items-center gap-1.5"><span className="nms-dot" style={{ background: 'var(--brand)', boxShadow: '0 0 10px var(--brand)' }} /><span className="text-[11px]" style={{ color: 'var(--text-mid)' }}>{labels.medium}: {data.medium}</span></div>
                    <div className="flex items-center gap-1.5"><span className="nms-dot nms-dot-offline" /><span className="text-[11px]" style={{ color: 'var(--text-mid)' }}>{labels.high}: {data.high}</span></div>
                </div>
            </div>
        </BaseCard>
    );
}
