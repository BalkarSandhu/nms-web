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
    labels = { low: "Online", medium: "Supervised", high: "Offline" },
    className = "",
    menuGroups,
    onStatusClick
}: Metric1Props) {
    const total = data.low + data.medium + data.high;
    const onlinePercent = total > 0 ? Math.round((data.low / total) * 100) : 0;
    const offlinePercent = total > 0 ? Math.round((data.high / total) * 100) : 0;
    const mediumPercent = total > 0 ? Math.round((data.medium / total) * 100) : 0;

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                {
                    type: "item" as const,
                    label: "Refresh metrics",
                    onClick: () => console.log("Refresh metrics"),
                },
                {
                    type: "item" as const,
                    label: "Export CSV",
                    onClick: () => console.log("Export CSV"),
                },
                {
                    type: "item" as const,
                    label: "View details",
                    onClick: () => console.log("View metric details"),
                },
            ],
        },
    ];

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex flex-col gap-4 h-full">
                {/* Total Count */}
                <div className="text-center py-2">
                    <div className="text-4xl font-bold text-(--contrast)">{total}</div>
                    <div className="text-(--contrast)/60 text-[10px] mt-1">Total Devices</div>
                </div>

                {/* Status Breakdown */}
                <div className="flex flex-col gap-2 flex-1">
                    {/* Online */}
                    <button
                        onClick={() => onStatusClick?.('online')}
                        className="w-full bg-(--dark) hover:bg-(--dark)/80 rounded-lg p-3 transition-all border border-transparent hover:border-(--green)/30"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-(--green)"></div>
                                <span className="text-(--contrast) font-medium text-sm">{labels.low}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-(--contrast) text-xl font-bold">{data.low}</span>
                                <span className="text-(--green) text-sm font-semibold">{onlinePercent}%</span>
                            </div>
                        </div>
                    </button>

                    {/* Supervised/Unknown */}
                    {data.medium > 0 && (
                        <button
                            onClick={() => onStatusClick?.('unknown')}
                            className="w-full bg-(--dark) hover:bg-(--dark)/80 rounded-lg p-3 transition-all border border-transparent hover:border-(--azul)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-(--azul)"></div>
                                    <span className="text-(--contrast) font-medium text-sm">{labels.medium}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-(--contrast) text-xl font-bold">{data.medium}</span>
                                    <span className="text-(--azul) text-sm font-semibold">{mediumPercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Offline */}
                    <button
                        onClick={() => onStatusClick?.('offline')}
                        className="w-full bg-(--dark) hover:bg-(--dark)/80 rounded-lg p-3 transition-all border border-transparent hover:border-(--red)/30"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-(--red)"></div>
                                <span className="text-(--contrast) font-medium text-sm">{labels.high}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-(--contrast) text-xl font-bold">{data.high}</span>
                                <span className="text-(--red) text-sm font-semibold">{offlinePercent}%</span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </BaseCard>
    );
}