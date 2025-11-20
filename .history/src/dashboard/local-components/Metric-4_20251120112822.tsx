import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useEnrichedDevices } from "../../devices/local_components/table";
import { useNavigate, useSearchParams } from "react-router-dom";
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

export interface DeviceTypeData {
    type: string;
    count: number;
}

export interface Metric4Props {
    title?: string;
    className?: string;
    menuGroups?: MenuGroupType[];
    onTypeClick?: (type: string) => void;
    customData?: DeviceTypeData[];
    navigatePath?: string;
}

export default function Metric4({ 
    title = "Devices by Type",
    className = "",
    menuGroups,
    onTypeClick,
    customData,
    navigatePath = "/devices"
}: Metric4Props) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const enrichedDevices = customData ? [] : useEnrichedDevices();
    
    const data = useMemo(() => {
        if (customData) return customData;
        
        if (!enrichedDevices.length) return [];
        const typeMap: Record<string, number> = {};
        enrichedDevices.forEach((d) => {
            const typeName = d.device_type_name || "Unknown";
            typeMap[typeName] = (typeMap[typeName] || 0) + 1;
        });
        return Object.entries(typeMap)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }, [enrichedDevices, customData]);

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export", onClick: () => console.log("Export") },
            ],
        },
    ];

    const handleTypeClick = (type: string) => {
        onTypeClick?.(type);
        const params = new URLSearchParams(searchParams);
        params.set('type', type);
        navigate(`${navigatePath}?${params.toString()}`);
    };

    const getIcon = (typeName: string) => {
        const name = typeName.toLowerCase();
        if (name.includes('PTZ') || name.includes('PTZ')) return "📹";
        if (name.includes('Workstation') || name.includes('WorkStation')) return "🔐";
        if (name.includes('sensor')) return "📡";
        if (name.includes('gateway') || name.includes('router')) return "🌐";
        if (name.includes('office') || name.includes('building')) return "🏢";
        if (name.includes('warehouse')) return "🏭";
        return "📦";
    };

    if (data.length === 0) {
        return (
            <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-(--contrast)/40 text-xs">No type data</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex items-center gap-4 h-full py-2">
                {/* Left: Total */}
                

                {/* Divider */}
                <div className="h-full w-px bg-(--contrast)/10"></div>

                {/* Right: Type List */}
                <div className="flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {data.slice(0, 6).map((item) => {
                        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                            <button
                                key={item.type}
                                onClick={() => handleTypeClick(item.type)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors"
                            >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="text-sm">{getIcon(item.type)}</span>
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