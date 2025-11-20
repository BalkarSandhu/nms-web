// Metric1.tsx - Device Status (Compact Version)
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

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex flex-col gap-2 h-full justify-between">
                {/* Total Count - Compact */}
                <div className="text-center py-1">
                    <div className="text-5xl font-bold text-(--contrast) leading-none">{total}</div>
                    <div className="text-(--contrast)/50 text-[9px] mt-0.5 tracking-wide">Total Devices</div>
                </div>

                {/* Status Breakdown - Only show significant statuses */}
                <div className="flex flex-col gap-1.5">
                    {/* Online */}
                    {data.low > 0 && (
                        <button
                            onClick={() => onStatusClick?.('online')}
                            className="w-full bg-(--dark)/50 hover:bg-(--dark)/70 rounded-md px-3 py-2 transition-all border border-transparent hover:border-(--green)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-(--green)"></div>
                                    <span className="text-(--contrast) font-medium text-xs">{labels.low}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-(--contrast) text-lg font-bold">{data.low}</span>
                                    <span className="text-(--green) text-xs font-semibold min-w-[35px] text-right">{onlinePercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Supervised/Unknown */}
                    {data.medium > 0 && (
                        <button
                            onClick={() => onStatusClick?.('unknown')}
                            className="w-full bg-(--dark)/50 hover:bg-(--dark)/70 rounded-md px-3 py-2 transition-all border border-transparent hover:border-(--azul)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-(--azul)"></div>
                                    <span className="text-(--contrast) font-medium text-xs">{labels.medium}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-(--contrast) text-lg font-bold">{data.medium}</span>
                                    <span className="text-(--azul) text-xs font-semibold min-w-[35px] text-right">{mediumPercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Offline */}
                    {data.high > 0 && (
                        <button
                            onClick={() => onStatusClick?.('offline')}
                            className="w-full bg-(--dark)/50 hover:bg-(--dark)/70 rounded-md px-3 py-2 transition-all border border-transparent hover:border-(--red)/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-(--red)"></div>
                                    <span className="text-(--contrast) font-medium text-xs">{labels.high}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-(--contrast) text-lg font-bold">{data.high}</span>
                                    <span className="text-(--red) text-xs font-semibold min-w-[35px] text-right">{offlinePercent}%</span>
                                </div>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </BaseCard>
    );
}

// ===================================

// Metric2.tsx - Longest Downtime (Compact Table)
import BaseCard from "./Base-Card";
import "@/index.css";

export interface TableRow {
    id: string | number;
    col1: string | number;
    col2: string | number;
    link?: string;
}

export interface Metric2Props {
    title?: string;
    headers?: { col1: string; col2: string };
    data?: TableRow[];
    maxRows?: number;
    className?: string;
    menuGroups?: any[];
}

export default function Metric2({
    title = "Longest Downtime",
    headers = { col1: "Device", col2: "Downtime" },
    data = [
        { id: 1, col1: "Block-II ICCC Cont...", col2: "< 1h", link: "#" },
        { id: 2, col1: "Block-II ICCC Cont...", col2: "< 1h", link: "#" },
        { id: 3, col1: "KKC Main Railway ...", col2: "< 1h", link: "#" }
    ],
    maxRows = 3,
    className = "",
    menuGroups
}: Metric2Props) {
    const displayedRows = data.slice(0, maxRows);
    const remainingCount = data.length - maxRows;

    const handleRowClick = (link?: string) => {
        if (link) {
            window.location.href = link;
        }
    };

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full">
                {/* Table Headers */}
                <div className="grid grid-cols-[1fr,auto] gap-4 pb-1.5 mb-1 border-b border-(--contrast)/10">
                    <span className="text-(--contrast)/60 text-[9px] font-medium uppercase tracking-wider">{headers.col1}</span>
                    <span className="text-(--contrast)/60 text-[9px] font-medium uppercase tracking-wider text-right">{headers.col2}</span>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col gap-1 overflow-y-auto flex-1">
                    {displayedRows.map((row, index) => (
                        <button
                            key={row.id}
                            onClick={() => handleRowClick(row.link)}
                            className="grid grid-cols-[1fr,auto] gap-4 py-2 px-2 rounded-md 
                                     hover:bg-(--contrast)/5 transition-colors text-left
                                     border border-transparent hover:border-(--contrast)/10"
                        >
                            <span className="text-(--contrast) text-xs truncate font-medium">{row.col1}</span>
                            <span className="text-(--red) text-xs font-semibold whitespace-nowrap">{row.col2}</span>
                        </button>
                    ))}
                </div>

                {/* Show "+n More" if there are remaining rows */}
                {remainingCount > 0 && (
                    <button
                        onClick={() => handleRowClick("#")}
                        className="py-1.5 mt-1 rounded-md text-center hover:bg-(--contrast)/5 transition-colors"
                    >
                        <span className="text-(--contrast)/50 text-[9px] font-medium">
                            + {remainingCount} more
                        </span>
                    </button>
                )}
            </div>
        </BaseCard>
    );
}