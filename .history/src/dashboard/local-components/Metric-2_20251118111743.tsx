
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
    headers?: {
        col1: string;
        col2: string;
    };
    data?: TableRow[];
    maxRows?: number;
    className?: string;
    menuGroups?: any[];
}

export default function Metric2({
    title = "Metric 2",
    headers = { col1: "Name", col2: "Value" },
    data = [
        { id: 1, col1: "Item 1", col2: "100", link: "#" },
        { id: 2, col1: "Item 2", col2: "200", link: "#" },
        { id: 3, col1: "Item 3", col2: "300", link: "#" },
        { id: 4, col1: "Item 4", col2: "400", link: "#" },
        { id: 5, col1: "Item 5", col2: "500", link: "#" },
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
                <div className="grid grid-cols-2 gap-2 pb-0.5 border-b border-(--contrast)/20">
                    <span className="text-(--contrast) text-[10px] font-medium pl-2">{headers.col1}</span>
                    <span className="text-(--contrast) text-[10px] font-medium text-right pr-2">{headers.col2}</span>
                </div>

                {/* Table Rows */}
                <div className="flex flex-col gap-1 mt-2 overflow-y-auto flex-1" style={{ maxHeight: '180px' }}>
                    {data.map((row) => (
                        <button
                            key={row.id}
                            onClick={() => handleRowClick(row.link)}
                            className="grid grid-cols-2 gap-4 py-2 px-2 rounded-lg 
                                     hover:bg-(--contrast)/10 transition-colors text-left
                                     border border-transparent hover:border-(--contrast)/20"
                        >
                            <span className="text-(--contrast) text-sm truncate">{row.col1}</span>
                            <span className="text-(--contrast) text-sm text-right truncate font-xsmall">{row.col2}</span>
                        </button>
                    ))}

                    {/* Show "+n More" if there are remaining rows */}
                    {remainingCount > 0 && (
                        <button
                            onClick={() => handleRowClick("#")}
                            className="py-0 px-2 rounded-[5px] text-center
                                     hover:bg-(--contrast)/10 transition-colors
                                     border border-transparent hover:border-(--contrast)/20"
                        >
                            <span className="text-(--contrast)/60 text-[10px] font-medium">
                                + {remainingCount} More
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </BaseCard>
    );
}