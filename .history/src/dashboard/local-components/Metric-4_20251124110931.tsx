import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";
import {Video,MountainSnow,Computer,HardDrive,DoorClosed,Weight,Route} from "lucide-react";

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

        // Instead of 'label', use device_type_name
        params.set('type', item.label);

        navigate(`${navigatePath}?${params.toString()}`);
    }
};

    // Built-in icon resolver based on label keywords
    const defaultIconResolver = (item: MetricItem) => {
        const label = item.label.toLowerCase();
        if (label.includes("workstation")) return <Computer size={16} color="white" />; // Workstation
        if (label.includes("ptz") || label.includes("camera")) return <Video size={16} color="white" />; // PTZ or camera
        if (label.includes("bullet")) return <Video size={16} color="white"/>; // Bullet camera
        if (label.includes("sensor")) return "📡";
        if(label.includes("dome")) return <Video size={16} color="white"/>; // Dome camera
        if (label.includes("gateway") || label.includes("router")) return "🌐";
        if (label.includes("office") || label.includes("building")) return "🏢";
        if (label.includes("warehouse")) return "🏭";
        if (label.includes("coal dump")) return <MountainSnow size={16} color="white"/>;
        if(label.includes("nvr")) return <HardDrive size={16} color="white"/>;
        if(label.includes("static location")) return <DoorClosed size={16} color="white"/>;
        if(label.includes("weighbridge")) return <Weight size={16} color="white"/>;
        if(label.includes("route")) return <Route size={16} color="white"/>;
        return "📦";
    };
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
