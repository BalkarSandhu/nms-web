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
                { type: "item" as const, label: "Refresh metrics", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export CSV", onClick: () => console.log("Export") },
                { type: "item" as const, label: "View details", onClick: () => console.log("Details") },
            ],
        },
    ];

    // Determine which status to show prominently
    const hasOnline = data.low > 0;
    const hasMedium = data.medium > 0;
    const hasOffline = data.high > 0;

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex flex-col gap-3 h-full justify-between py-1">
                {/* Total Count */}
                <div className="text-center">
                    <div className="text-3xl font-bold text-(--contrast) leading-none tracking-tight">{total}</div>
                    <div className="text-(--contrast)/40 text-[10px] mt-1 tracking-wide">Total Devices</div>
                </div>

                {/* Single Prominent Status - Show the most relevant one */}
                <div className="flex flex-col gap-1.5">
                    {/* Show Online if exists */}
                    {hasOnline && (
                        <button
                            onClick={() => onStatusClick?.('online')}
                            className="w-full bg-(--dark)/50 hover:bg-(--dark)/70 rounded-lg px-4 py-2.5 transition-all border border-transparent hover:border-(--green)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-3 h-3 rounded-full bg-(--green) shadow-lg shadow-(--green)/50"></div>
                                    <span className="text-(--contrast) font-semibold text-sm">{labels.low}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-(--contrast) text-2xl font-bold tracking-tight">{data.low}</span>
                                    <span className="text-(--green) text-sm font-bold min-w-[40px] text-right">{onlinePercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Show Medium/Unknown if exists */}
                    {hasMedium && (
                        <button
                            onClick={() => onStatusClick?.('unknown')}
                            className="w-full bg-(--dark)/50 hover:bg-(--dark)/70 rounded-lg px-4 py-2.5 transition-all border border-transparent hover:border-(--azul)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-3 h-3 rounded-full bg-(--azul) shadow-lg shadow-(--azul)/50"></div>
                                    <span className="text-(--contrast) font-semibold text-sm">{labels.medium}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-(--contrast) text-2xl font-bold tracking-tight">{data.medium}</span>
                                    <span className="text-(--azul) text-sm font-bold min-w-[40px] text-right">{mediumPercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Show Offline if exists */}
                    {hasOffline && (
                        <button
                            onClick={() => onStatusClick?.('offline')}
                            className="w-full bg-(--dark)/50 hover:bg-(--dark)/70 rounded-lg px-4 py-2.5 transition-all border border-transparent hover:border-(--red)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-3 h-3 rounded-full bg-(--red) shadow-lg shadow-(--red)/50"></div>
                                    <span className="text-(--contrast) font-semibold text-sm">{labels.high}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-(--contrast) text-2xl font-bold tracking-tight">{data.high}</span>
                                    <span className="text-(--red) text-sm font-bold min-w-[40px] text-right">{offlinePercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </BaseCard>
    );
}