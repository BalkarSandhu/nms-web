import type { ReactNode } from "react";
import BaseCard from "./Base-Card";
import "@/index.css";

export interface TableRow {
    id: string | number;
    col1: string | number;
    col2: string | number;
    link?: string;
}

export interface Metric2Props {
    title?: ReactNode;
    headers?: { col1: string; col2: string };
    data?: TableRow[];
    maxRows?: number;
    className?: string;
    menuGroups?: any[];
    onRowClick?: (row: TableRow) => void;
}

export default function Metric2({
    title = "Critical",
    data = [],
    maxRows = 5,
    className = "",
    menuGroups,
    onRowClick,
}: Metric2Props) {
    const displayedRows = data.slice(0, maxRows);
    const remainingCount = data.length - maxRows;

    const handleRowClick = (row: TableRow) => {
        if (onRowClick) onRowClick(row);
        else if (row.link) window.location.href = row.link;
    };

    if (data.length === 0) {
        return (
            <BaseCard title={title} menuGroups={menuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>All clear</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full">
                <div className="flex flex-col overflow-y-auto flex-1 metric-scroll">
                    {displayedRows.map((row) => (
                        <button
                            key={row.id}
                            onClick={() => handleRowClick(row)}
                            className="grid grid-cols-[1fr,auto] gap-3 py-1.5 px-2 rounded-md transition-colors text-left hover:bg-white/[0.04] stagger-item"
                            style={{ borderLeft: '2px solid transparent' }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = 'var(--status-offline)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = 'transparent')}
                        >
                            <span className="flex justify-between items-center text-xs font-medium gap-3 w-full">
                                <span className="flex items-center gap-2 truncate" style={{ color: 'var(--text-hi)' }}>
                                    <span className="nms-dot nms-dot-offline shrink-0" />
                                    <span className="truncate">{row.col1}</span>
                                </span>
                                <span className="font-mono tabular-nums text-[11px]" style={{ color: 'var(--status-offline)' }}>
                                    {row.col2}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                {remainingCount > 0 && (
                    <button
                        onClick={() => data[maxRows] && handleRowClick(data[maxRows])}
                        className="py-1 mt-1 text-center rounded-md transition-colors hover:bg-white/[0.04]"
                    >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-lo)' }}>
                            + {remainingCount} more
                        </span>
                    </button>
                )}
            </div>
        </BaseCard>
    );
}
