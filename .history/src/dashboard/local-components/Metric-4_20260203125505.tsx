import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";
import {Video,MountainSnow,Computer,HardDrive,DoorClosed,Weight,Route,Construction} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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
    /**
     * Preferred navigation target when an item is clicked.
     * - 'auto' will choose between '/devices' and '/locations' based on the item label
     * - 'devices' always navigates to '/devices'
     * - 'locations' always navigates to '/locations'
     */
    navigateTarget?: 'auto' | 'devices' | 'locations';
    iconResolver?: (item: MetricItem) => React.ReactNode;
    emptyText?: string;
    maxItems?: number;
}

// Color palette for pie chart
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6'];

export default function MetricGeneral({
    title = "",
    className = "",
    menuGroups,
    onItemClick,
    data = [],
    navigatePath = "",
    navigateTarget = 'auto',
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

    // Prepare data for pie chart
    const pieData = useMemo(() => {
        return sortedData.slice(0, maxItems).map(item => ({
            name: item.label,
            value: item.value,
        }));
    }, [sortedData, maxItems]);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export", onClick: () => console.log("Export") },
            ],
        },
    ];

    const resolveTargetPath = (item: MetricItem) => {
        // explicit navigatePath prop takes precedence
        if (navigatePath) return navigatePath;

        // honor explicit navigateTarget on the item (data producer can set '/devices' or '/locations')
        if (item.navigateTarget) {
            const t = item.navigateTarget.toString();
            if (t === '/devices' || t === 'devices') return '/devices';
            if (t === '/locations' || t === 'locations') return '/locations';
        }

        const target = (navigateTarget || 'auto');
        if (target === 'devices') return '/devices';
        if (target === 'locations') return '/locations';

        // auto detect based on label keywords that are location-level
        const label = (item.label || '').toString().toLowerCase();
        const locationKeywords = [
            'route', 'checkpost', 'check post', 'checkpoint', 'static location', 'area', 'site', 'location', 'depot', 'terminal', 'station', 'weigh'
        ];
        if (locationKeywords.some(k => label.includes(k))) return '/locations';

        // default to devices
        return '/devices';
    };

    const handleItemClick = (item: MetricItem) => {
        onItemClick?.(item);
        const path = resolveTargetPath(item);
        const params = new URLSearchParams(searchParams);
        params.set('type', String(item.label ?? '').trim());
        navigate(`${path}?${params.toString()}`);
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
        if(label.includes("checkpost")) return <Construction size={16} color="white"/>;
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
            <div className="flex items-left h-full py-1">
                {/* Pie Chart */}
                <div className="h-full" style={{ width: '140px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
    <Pie
        data={pieData}
        cx="50%"
        cy="50%"
        innerRadius={30}
        outerRadius={50}
        paddingAngle={2}
        dataKey="value"
        onClick={(data) => {
            // Find the original item from sortedData
            const item = sortedData.find(i => i.label === data.name);
            if (item) {
                handleItemClick(item);
            }
        }}
        style={{ cursor: 'pointer' }}
    >
        {pieData.map((entry, index) => (
            <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                style={{ cursor: 'pointer' }}
            />
        ))}
    </Pie>
    <Tooltip 
        contentStyle={{ 
            background: 'rgba(0, 0, 0, 0.9)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#ffffff',
            padding: '8px 12px'
        }}
        itemStyle={{
            color: '#ffffff'
        }}
        labelStyle={{
            color: '#ffffff',
            fontWeight: '500'
        }}
    />
</PieChart>
                    </ResponsiveContainer>
                </div>

                

                {/* List */}
                <div className="flex flex-col  flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {sortedData.slice(0, maxItems).map((item, index) => {
                        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors color-white w-full"
                            >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <div 
                                        className="w-2 h-2 rounded-full shrink-0" 
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
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