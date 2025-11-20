import BaseCard from "./Base-Card";
import "@/index.css";
import { useEffect, useRef, useMemo } from "react";
import { useEnrichedDevices } from "../../devices/local_components/table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";

export interface Metric4Props {
    title?: string;
    className?: string;
    menuGroups?: MenuGroupType[];
    onTypeClick?: (type: string) => void;
}

export default function Metric4({ 
    title = "Devices by Type",
    className = "",
    menuGroups,
    onTypeClick
}: Metric4Props) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Get real-time enriched devices data
    const enrichedDevices = useEnrichedDevices();
    
    // Calculate devices per type from real data
    const data = useMemo(() => {
        if (!enrichedDevices.length) return [];
        const typeMap: Record<string, number> = {};
        enrichedDevices.forEach((d) => {
            const typeName = d.device_type_name || "Unknown";
            typeMap[typeName] = (typeMap[typeName] || 0) + 1;
        });
        return Object.entries(typeMap)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }, [enrichedDevices]);

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                {
                    type: "item" as const,
                    label: "Refresh metrics",
                    onClick: () => console.log("Refresh metrics"),
                },
                {
                    type: "item" as const,
                    label: "Export CSV",
                    onClick: () => console.log("Export CSV"),
                },
                {
                    type: "item" as const,
                    label: "View details",
                    onClick: () => console.log("View metric details"),
                },
            ],
        },
    ];

    // Handle device type click with navigation
    const handleTypeClick = (type: string) => {
        onTypeClick?.(type);
        const params = new URLSearchParams(searchParams);
        params.set('type', type);
        navigate(`/devices?${params.toString()}`);
    };

    // Auto-assign icon based on type name
    const getIcon = (typeName: string) => {
        const name = typeName.toLowerCase();
        if (name.includes('camera') || name.includes('cctv')) return "📹";
        if (name.includes('access') || name.includes('control')) return "🔐";
        if (name.includes('sensor')) return "📡";
        if (name.includes('gateway') || name.includes('router')) return "🌐";
        if (name.includes('switch')) return "🔌";
        if (name.includes('server')) return "💾";
        return "📦";
    };

    const colors = [
        { bg: 'bg-(--azul)/20', border: 'border-(--azul)/30', text: 'text-(--azul)', dot: 'bg-(--azul)' },
        { bg: 'bg-(--green)/20', border: 'border-(--green)/30', text: 'text-(--green)', dot: 'bg-(--green)' },
        { bg: 'bg-(--red)/20', border: 'border-(--red)/30', text: 'text-(--red)', dot: 'bg-(--red)' },
        { bg: 'bg-(--contrast)/10', border: 'border-(--contrast)/20', text: 'text-(--contrast)', dot: 'bg-(--contrast)' }
    ];

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex flex-col gap-3 h-full">
                {/* Total Display */}
                <div className="text-center py-2 border-b border-(--contrast)/20">
                    <div className="text-3xl font-bold text-(--contrast)">{total}</div>
                    <div className="text-(--contrast)/60 text-[10px] mt-1">Total Devices</div>
                </div>

                {/* Type Breakdown */}
                <div className="grid grid-cols-2 gap-2 flex-1">
                    {data.slice(0, 4).map((item, index) => {
                        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        const color = colors[index % colors.length];

                        return (
                            <button
                                key={item.type}
                                onClick={() => handleTypeClick(item.type)}
                                className={`${color.bg} border ${color.border} rounded-lg p-3 transition-all hover:scale-105`}
                            >
                                <div className="flex flex-col items-start gap-2">
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="text-xl">{getIcon(item.type)}</span>
                                        <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
                                    </div>
                                    <div className="w-full">
                                        <div className="text-(--contrast) font-bold text-xl">{item.count}</div>
                                        <div className={`${color.text} text-[10px] font-medium truncate`}>{item.type}</div>
                                        <div className={`${color.text} text-[10px] mt-1`}>{percentage}%</div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Show more indicator if there are more than 4 types */}
                {data.length > 4 && (
                    <div className="text-center text-(--contrast)/60 text-[10px]">
                        + {data.length - 4} more types
                    </div>
                )}
            </div>
        </BaseCard>
    );
}