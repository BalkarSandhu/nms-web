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
    title?: string;
    data?: MetricData;
    labels?: MetricLabels;
    className?: string;
    menuGroups?: MenuGroupType[];
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void;
}

export default function Metric1({ 
    title = "Device Status",
    data = { low: 111, medium: 0, high: 26 },
    labels = { low: "Online", medium: "Unknown", high: "Offline" },
    className = "",
    menuGroups,
    onStatusClick
}: Metric1Props) {

    // merge unknown into offline
    const mergedHigh = data.high + data.medium;

    const total = data.low + mergedHigh; // medium consumed into high
    const onlinePercent = total > 0 ? Math.round((data.low / total) * 100) : 0;
    const offlinePercent = total > 0 ? Math.round((mergedHigh / total) * 100) : 0;

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh metrics", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export CSV", onClick: () => console.log("Export") },
            ],
        },
    ];

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex items-center gap-4 h-full py-2">
                
                {/* Left: Total Count */}
                <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: '45%' }}>
                    <div className="text-6xl font-bold text-(--contrast) leading-none tracking-tight">{total}</div>
                    <div className="text-(--contrast)/40 text-[9px] mt-1 tracking-wide uppercase">Total</div>
                </div>

                {/* Divider */}
                <div className="h-full w-px bg-(--contrast)/10"></div>

                {/* Right Section */}
                <div className="flex flex-col gap-1.5 flex-1">

                    {/* Online */}
                    <button
                        onClick={() => onStatusClick?.('online')}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors"
                    >
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-(--green)"></div>
                            <span className="text-(--contrast) text-xs font-medium">{labels.low}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-(--contrast) text-lg font-bold">{data.low}</span>
                            <span className="text-(--green) text-[10px] font-bold">{onlinePercent}%</span>
                        </div>
                    </button>

                    {/* Offline + Unknown merged */}
                    <button
                        onClick={() => onStatusClick?.('offline')}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors"
                    >
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-(--red)"></div>

                            {/* Label shows both */}
                            <span className="text-(--contrast) text-xs font-medium">
                                {labels.high} 
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-(--contrast) text-lg font-bold">{mergedHigh}</span>
                            <span className="text-(--red) text-[10px] font-bold">{offlinePercent}%</span>
                        </div>
                    </button>
                </div>
            </div>
        </BaseCard>
    );
}
