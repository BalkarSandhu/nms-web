import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";
import {
    Video,
    MountainSnow,
    Computer,
    HardDrive,
    DoorClosed,
    Weight,
    Route,
    Construction,
    RadioTower,
    Router,
    Building,
    Warehouse
} from "lucide-react";

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
    navigateTarget?: 'auto' | 'devices' | 'locations';
    iconResolver?: (item: MetricItem) => React.ReactNode;
    emptyText?: string;
    maxItems?: number;
    /** Visualization mode: 'list' | 'donut' | 'bars' | 'cards' */
    visualMode?: 'list' | 'donut' | 'bars' | 'cards';
}

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
    visualMode = 'donut',
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

    const resolveTargetPath = (item: MetricItem) => {
        if (navigatePath) return navigatePath;

        if (item.navigateTarget) {
            const t = item.navigateTarget.toString();
            if (t === '/devices' || t === 'devices') return '/devices';
            if (t === '/locations' || t === 'locations') return '/locations';
        }

        const target = (navigateTarget || 'auto');
        if (target === 'devices') return '/devices';
        if (target === 'locations') return '/locations';

        const label = (item.label || '').toString().toLowerCase();
        const locationKeywords = [
            'route', 'checkpost', 'check post', 'checkpoint', 'static location', 'area', 'site', 'location', 'depot', 'terminal', 'station', 'weigh'
        ];
        if (locationKeywords.some(k => label.includes(k))) return '/locations';

        return '/devices';
    };

    const handleItemClick = (item: MetricItem) => {
        onItemClick?.(item);
        const path = resolveTargetPath(item);
        const params = new URLSearchParams(searchParams);
        params.set('type', String(item.label ?? '').trim());
        navigate(`${path}?${params.toString()}`);
    };

    // Color palette for visualization
    const colorPalette = [
        '#6366f1', // indigo
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#f59e0b', // amber
        '#10b981', // emerald
        '#3b82f6', // blue
        '#14b8a6', // teal
        '#f97316', // orange
    ];

    // Built-in icon resolver
    const defaultIconResolver = (item: MetricItem) => {
        const label = item.label.toLowerCase();
        if (label.includes("workstation")) return <Computer size={16} color="white" />;
        if (label.includes("ptz") || label.includes("camera")) return <Video size={16} color="white" />;
        if (label.includes("bullet")) return <Video size={16} color="white"/>;
        if (label.includes("sensor")) return <RadioTower size={16} color="white"/>;
        if(label.includes("dome")) return <Video size={16} color="white"/>;
        if (label.includes("gateway") || label.includes("router")) return <Router size={16} color="white"/>;
        if (label.includes("office") || label.includes("building")) return <Building size={16} color="white"/>;
        if (label.includes("warehouse")) return <Warehouse size={16} color="white"/>;
        if (label.includes("coal dump")) return <MountainSnow size={16} color="white"/>;
        if(label.includes("nvr")) return <HardDrive size={16} color="white"/>;
        if(label.includes("static location")) return <DoorClosed size={16} color="white"/>;
        if(label.includes("weighbridge")) return <Weight size={16} color="white"/>;
        if(label.includes("route")) return <Route size={16} color="white"/>;
        if(label.includes("checkpost")) return <Construction size={16} color="white"/>;
        return "📦";
    };
    const getIcon = iconResolver || defaultIconResolver;

    // Donut Chart Component
    const DonutChart = () => {
        const displayData = sortedData.slice(0, maxItems);
        let cumulativePercent = 0;

        return (
            <div className="flex items-center gap-6 h-full py-3 px-4">
                {/* SVG Donut Chart */}
                <div className="relative flex-shrink-0" style={{ width: '120px', height: '120px' }}>
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        {displayData.map((item, index) => {
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            const strokeDasharray = `${percentage} ${100 - percentage}`;
                            const strokeDashoffset = -cumulativePercent;
                            const color = colorPalette[index % colorPalette.length];
                            cumulativePercent += percentage;

                            return (
                                <circle
                                    key={item.label}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="16"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-500 cursor-pointer hover:opacity-80"
                                    onClick={() => handleItemClick(item)}
                                    style={{
                                        filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))',
                                    }}
                                />
                            );
                        })}
                    </svg>
                    {/* Center Total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-(--contrast)">{total}</span>
                        <span className="text-[10px] text-(--contrast)/60 font-medium">Total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {displayData.map((item, index) => {
                        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        const color = colorPalette[index % colorPalette.length];
                        
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-(--contrast)/5 transition-all group"
                            >
                                <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-(--dark) group-hover:ring-offset-2 transition-all"
                                    style={{ backgroundColor: color, ringColor: color }}
                                />
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="text-sm flex-shrink-0">{getIcon(item)}</span>
                                    <span className="text-(--contrast) text-xs font-medium truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-(--contrast) text-sm font-bold">{item.value}</span>
                                    <span className="text-(--contrast)/60 text-[9px] font-medium min-w-7 text-right">{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Bar Chart Component
    const BarChart = () => {
        const displayData = sortedData.slice(0, maxItems);
        const maxValue = Math.max(...displayData.map(d => d.value));

        return (
            <div className="flex flex-col gap-2 h-full py-3 px-4">
                {displayData.map((item, index) => {
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                    const color = colorPalette[index % colorPalette.length];

                    return (
                        <button
                            key={item.label}
                            onClick={() => handleItemClick(item)}
                            className="group relative"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm flex-shrink-0">{getIcon(item)}</span>
                                <span className="text-(--contrast) text-xs font-medium truncate flex-1 text-left">
                                    {item.label}
                                </span>
                                <span className="text-(--contrast) text-sm font-bold">{item.value}</span>
                                <span className="text-(--contrast)/60 text-[9px] font-medium min-w-7 text-right">
                                    {percentage}%
                                </span>
                            </div>
                            <div className="h-2 bg-(--contrast)/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80"
                                    style={{
                                        width: `${barWidth}%`,
                                        backgroundColor: color,
                                        boxShadow: `0 0 12px ${color}40`,
                                    }}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    // Card Grid Component
    const CardGrid = () => {
        const displayData = sortedData.slice(0, maxItems);

        return (
            <div className="grid grid-cols-3 gap-2 p-3 h-full overflow-y-auto">
                {displayData.map((item, index) => {
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    const color = colorPalette[index % colorPalette.length];

                    return (
                        <button
                            key={item.label}
                            onClick={() => handleItemClick(item)}
                            className="relative overflow-hidden rounded-lg p-3 border border-(--contrast)/10 hover:border-(--contrast)/20 transition-all group"
                            style={{
                                background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
                            }}
                        >
                            {/* Animated border gradient */}
                            <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                    background: `linear-gradient(135deg, ${color}30, transparent)`,
                                }}
                            />
                            
                            <div className="relative flex flex-col items-center gap-1.5">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                                    style={{ backgroundColor: color }}
                                >
                                    {getIcon(item)}
                                </div>
                                <span className="text-(--contrast) text-xs font-medium text-center line-clamp-2">
                                    {item.label}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-(--contrast) text-lg font-bold">{item.value}</span>
                                    <span className="text-(--contrast)/60 text-[10px] font-medium">{percentage}%</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    // List View (Original)
    const ListView = () => {
        const displayData = sortedData.slice(0, maxItems);

        return (
            <div className="flex items-center gap-4 h-full py-2">
                <div className="h-full w-px bg-(--contrast)/10"></div>
                <div className="flex flex-col gap-1 flex-1 overflow-y-auto" style={{ maxHeight: '120px' }}>
                    {displayData.map((item, index) => {
                        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        const color = colorPalette[index % colorPalette.length];
                        
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors group relative overflow-hidden"
                            >
                                {/* Subtle background indicator */}
                                <div 
                                    className="absolute left-0 top-0 bottom-0 transition-all duration-300 group-hover:opacity-20 opacity-10"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: color,
                                    }}
                                />
                                
                                <div className="flex items-center gap-1.5 flex-1 min-w-0 relative z-10">
                                    <div 
                                        className="w-1 h-4 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-sm">{getIcon(item)}</span>
                                    <span className="text-(--contrast) text-xs font-medium truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                                    <span className="text-(--contrast) text-sm font-bold">{item.value}</span>
                                    <span className="text-(--contrast)/60 text-[9px] font-medium min-w-7 text-right">{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

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
            {visualMode === 'donut' && <DonutChart />}
            {visualMode === 'bars' && <BarChart />}
            {visualMode === 'cards' && <CardGrid />}
            {visualMode === 'list' && <ListView />}
        </BaseCard>
    );
}