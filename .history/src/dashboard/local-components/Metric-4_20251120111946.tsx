import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";

export interface MetricItem {
    label: string;
    count: number;
    icon?: string;
}

export interface Metric4Props {
    title?: string;
    data?: MetricItem[];
    className?: string;
    menuGroups?: MenuGroupType[];
    onItemClick?: (label: string) => void;
    navigatePath?: string;
}

export default function Metric4({
    title = "Metric",
    data = [],
    className = "",
    menuGroups,
    onItemClick,
    navigatePath = "/"
}: Metric4Props) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export", onClick: () => console.log("Export") },
            ],
        },
    ];

    const handleItemClick = (label: string) => {
        onItemClick?.(label);
        const params = new URLSearchParams(searchParams);
        params.set("filter", label);
        navigate(`${navigatePath}?${params.toString()}`);
    };

    if (!data.length) {
        return (
            <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-(--contrast)/40 text-xs">No data</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex items-center gap-4 h-full py-2">

                {/* Left: Total */}
                <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: '45%' }}>
                    <div className="text-6xl font-bold text-(--contrast) leading-none tracking-tight">{total}</div>
                    <div className="text-(--contrast)/40 text-[9px] mt-1 tracking-wide uppercase">Total</div>
                </div>

                {/* Divider */}
                <div className="h-full w-px bg-(--contrast)/10"></div>

                {/* Right: Items */}
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {data.slice(0, 6).map((item) => {
                        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item.label)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors"
                            >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {item.icon && <span className="text-sm">{item.icon}</span>}
                                    <span className="text-(--contrast) text-xs font-medium truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-(--contrast) text-lg font-bold">{item.count}</span>
                                    <span className="text-(--contrast)/60 text-[10px] font-bold min-w-[28px] text-right">{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </BaseCard>
    );
}
