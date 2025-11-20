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
    onRowClick?: (row: TableRow) => void;
}

export default function Metric2({
    title = "Longest Downtime",
    headers = { col1: "Device", col2: "Downtime" },
    data = [],
    maxRows = 5,
    className = "",
    menuGroups,
    onRowClick
}: Metric2Props) {
    const displayedRows = data.slice(0, maxRows);
    const remainingCount = data.length - maxRows;

    const handleRowClick = (row: TableRow) => {
        if (onRowClick) {
            onRowClick(row);
        } else if (row.link) {
            window.location.href = row.link;
        }
    };

    if (data.length === 0) {
        return (
            <BaseCard title={title} menuGroups={menuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-(--contrast)/40 text-xs">No data</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full py-1">
                {/* Headers */}
                <div className="grid grid-cols-[1fr,auto] gap-4 pb-1.5 mb-1 border-b border-(--contrast)/10">
                    <span className="text-(--contrast)/50 text-[9px] font-semibold uppercase tracking-wider">
                        {headers.col1}
                    </span>
        
                </div>

                {/* Rows */}
                <div className="flex flex-col overflow-y-auto flex-1">
                    {displayedRows.map((row) => (
                        <button
                            key={row.id}
                            onClick={() => handleRowClick(row)}
                            className="grid grid-cols-[1fr,auto] gap-4 py-2 px-2 rounded-md hover:bg-(--contrast)/5 transition-colors text-left"
                        >
                            <span className="text-(--contrast) text-xs truncate font-medium">
  {row.col1} <span className="text-red-500">{row.col2}</span>
</span>

                            
                        </button>
                    ))}
                </div>

                {remainingCount > 0 && (
                    <button
                        onClick={() => data[maxRows] && handleRowClick(data[maxRows])}
                        className="py-1.5 mt-1 text-center hover:bg-(--contrast)/5 rounded-md transition-colors"
                    >
                        <span className="text-(--contrast)/50 text-[9px] font-medium">+ {remainingCount} more</span>
                    </button>
                )}
            </div>
        </BaseCard>
    );
}