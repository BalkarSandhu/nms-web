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
    data = [],
    maxRows = 5,
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

    // Show "No data" state if empty
    if (data.length === 0) {
        return (
            <BaseCard title={title} menuGroups={menuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-(--contrast)/40 text-xs">No downtime data</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full">
                {/* Table Headers */}
                <div className="grid grid-cols-[1fr,auto] gap-6 pb-2 mb-1.5 border-b border-(--contrast)/10">
                    <span className="text-(--contrast)/50 text-[10px] font-semibold uppercase tracking-widest pl-1">
                        {headers.col1}
                    </span>
                    <span className="text-(--contrast)/50 text-[10px] font-semibold uppercase tracking-widest text-right pr-1">
                        {headers.col2}
                    </span>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 pr-1">
                    {displayedRows.map((row) => (
                        <button
                            key={row.id}
                            onClick={() => handleRowClick(row.link)}
                            className="grid grid-cols-[1fr,auto] gap-6 py-2.5 px-2 rounded-lg 
                                     hover:bg-(--contrast)/5 transition-all text-left
                                     border border-transparent hover:border-(--contrast)/10"
                        >
                            <span className="text-(--contrast) text-sm truncate font-medium">
                                {row.col1}
                            </span>
                            <span className="text-(--red) text-sm font-bold whitespace-nowrap">
                                {row.col2}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Show "+n More" if there are remaining rows */}
                {remainingCount > 0 && (
                    <button
                        onClick={() => handleRowClick(data[maxRows]?.link)}
                        className="py-2 mt-1 rounded-lg text-center hover:bg-(--contrast)/5 transition-colors border border-transparent hover:border-(--contrast)/10"
                    >
                        <span className="text-(--contrast)/50 text-[10px] font-semibold">
                            + {remainingCount} more
                        </span>
                    </button>
                )}
            </div>
        </BaseCard>
    );
}