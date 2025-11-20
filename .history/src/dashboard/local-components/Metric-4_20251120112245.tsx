import BaseCard from "./Base-Card";
import "@/index.css";
import { MenuGroupType } from "./Base-Card";

export interface CategoryData {
    type: string;
    count: number;
    icon?: string;
}

export interface Metric4Props {
    title?: string;
    data?: CategoryData[];
    className?: string;
    menuGroups?: MenuGroupType[];
    onCategoryClick?: (type: string) => void;
    showIcons?: boolean;
    maxItems?: number;
}

export default function Metric4({ 
    title = "Category Breakdown",
    data = [],
    className = "",
    menuGroups,
    onCategoryClick,
    showIcons = true,
    maxItems = 6
}: Metric4Props) {

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export", onClick: () => console.log("Export") },
            ],
        },
    ];

    const getDefaultIcon = (typeName: string) => {
        const name = typeName.toLowerCase();
        if (name.includes('ptz') || name.includes('camera')) return "📹";
        if (name.includes('workstation') || name.includes('computer')) return "🔐";
        if (name.includes('sensor')) return "📡";
        if (name.includes('gateway') || name.includes('router')) return "🌐";
        if (name.includes('office') || name.includes('building')) return "🏢";
        if (name.includes('warehouse')) return "🏭";
        if (name.includes('location')) return "📍";
        if (name.includes('worker') || name.includes('employee')) return "👷";
        if (name.includes('manager')) return "👔";
        if (name.includes('engineer')) return "🔧";
        return "📦";
    };

    if (data.length === 0) {
        return (
            <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-(--contrast)/40 text-xs">No data available</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex items-center gap-4 h-full py-2">
                {/* Left: Total Count */}
                <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: '35%' }}>
                    <div className="text-6xl font-bold text-(--contrast) leading-none tracking-tight">{total}</div>
                    <div className="text-(--contrast)/40 text-[9px] mt-1 tracking-wide uppercase">Total</div>
                </div>

                {/* Divider */}
                <div className="h-full w-px bg-(--contrast)/10"></div>

                {/* Right: Category List */}
                <div className="flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {data.slice(0, maxItems).map((item) => {
                        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        const icon = item.icon || getDefaultIcon(item.type);
                        
                        return (
                            <button
                                key={item.type}
                                onClick={() => onCategoryClick?.(item.type)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors"
                            >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {showIcons && <span className="text-sm">{icon}</span>}
                                    <span className="text-(--contrast) text-xs font-medium truncate">{item.type}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-(--contrast) text-sm font-bold">{item.count}</span>
                                    <span className="text-(--contrast)/60 text-[9px] font-medium min-w-[28px] text-right">{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </BaseCard>
    );
}