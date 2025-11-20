
import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";

// General data type for metric items
export interface MetricItem {
    label: string;
    value: number;
    [key: string]: any;
}

export interface MetricGeneralProps {
    title?: string;
    className?: string;
    menuGroups?: MenuGroupType[];
    onItemClick?: (item: MetricItem) => void;
    data?: MetricItem[];
    navigatePath?: string;
    iconResolver?: (item: MetricItem) => React.ReactNode;
    emptyText?: string;
    maxItems?: number;
}

export default function MetricGeneral({
    title = "",
    className = "",
    menuGroups,
    onItemClick,
    data = [],
    navigatePath = "",
    iconResolver,
    emptyText = "No data",
    maxItems = 6,
}: MetricGeneralProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Memoize sorted data by value
    const sortedData = useMemo(() => {
        if (!data.length) return [];
        return [...data].sort((a, b) => b.value - a.value);
    }, [data]);

    const total = sortedData.reduce((sum, item) => sum + item.value, 0);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export", onClick: () => console.log("Export") },
            ],
        },
    ];

    const handleItemClick = (item: MetricItem) => {
        onItemClick?.(item);
        if (navigatePath) {
            const params = new URLSearchParams(searchParams);
            params.set('label', item.label);
            navigate(`${navigatePath}?${params.toString()}`);
        }
    };

    // Default icon resolver if not provided
    // Default icon resolver if not provided
    const defaultIconResolver = () => "📦";
    const getIcon = iconResolver || defaultIconResolver;

    if (sortedData.length === 0) {
        return (
            <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-(--contrast)/40 text-xs">{emptyText}</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex items-center gap-4 h-full py-2">
                {/* Divider */}
                <div className="h-full w-px bg-(--contrast)/10"></div>

                {/* List */}
                <div className="flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {sortedData.slice(0, maxItems).map((item) => {
                        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors"
                            >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="text-sm">{getIcon(item)}</span>
                                    <span className="text-(--contrast) text-xs font-medium truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-(--contrast) text-sm font-bold">{item.value}</span>
                                    <span className="text-(--contrast)/60 text-[9px] font-medium min-w-7 text-right">{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </BaseCard>
    );
}