import { useState } from "react";
import BaseCard from "./Base-Card";
import "@/index.css";
import { MenuGroupType } from "./Base-Card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

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

export interface Metric1Props {
    title?: string;
    data?: MetricData;
    labels?: MetricLabels;
    className?: string;
    menuGroups?: MenuGroupType[];
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void;
    showGraph?: boolean;
    historicalData?: Array<{ timestamp: number; online: number; offline: number }>;
}

export default function Metric1({ 
    title = "Device Status",
    data = { low: 111, medium: 0, high: 26 },
    labels = { low: "Online", medium: "Unknown", high: "Offline" },
    className = "",
    menuGroups,
    onStatusClick,
    showGraph = true,
    historicalData = []
}: Metric1Props) {

    const [viewMode, setViewMode] = useState<'stats' | 'graph'>('stats');

    // merge unknown into offline
    const mergedHigh = data.high + data.medium;

    const total = data.low + mergedHigh;
    const onlinePercent = total > 0 ? Math.round((data.low / total) * 100) : 0;
    const offlinePercent = total > 0 ? Math.round((mergedHigh / total) * 100) : 0;

    // Generate default historical data if none provided
    const defaultHistoricalData = Array.from({ length: 24 }, (_, i) => ({
        timestamp: Date.now() - (23 - i) * 3600000, // Last 24 hours
        online: data.low + Math.floor(Math.random() * 10 - 5),
        offline: mergedHigh + Math.floor(Math.random() * 6 - 3)
    }));

    const chartData = historicalData.length > 0 ? historicalData : defaultHistoricalData;

    // Calculate trend
    const calculateTrend = () => {
        if (chartData.length < 2) return 0;
        const recent = chartData.slice(-6);
        const older = chartData.slice(-12, -6);
        const recentAvg = recent.reduce((sum, d) => sum + d.online, 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d.online, 0) / older.length;
        return ((recentAvg - olderAvg) / olderAvg) * 100;
    };

    const trend = calculateTrend();

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Toggle View", onClick: () => setViewMode(viewMode === 'stats' ? 'graph' : 'stats') },
                { type: "separator" as const },
                { type: "item" as const, label: "Refresh metrics", onClick: () => console.log("Refresh") },
                { type: "item" as const, label: "Export CSV", onClick: () => console.log("Export") },
            ],
        },
    ];

    // Circular Progress Chart
    const CircularProgress = ({ percent, color, size = 60 }: { percent: number; color: string; size?: number }) => {
        const radius = (size - 8) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;

        return (
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-gray-700"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold" style={{ color }}>{percent}%</span>
                </div>
            </div>
        );
    };

    // Mini Line Chart
    const MiniLineChart = () => {
        const maxOnline = Math.max(...chartData.map(d => d.online));
        const maxOffline = Math.max(...chartData.map(d => d.offline));
        const maxValue = Math.max(maxOnline, maxOffline);
        const width = 100;
        const height = 30;
        const padding = 5;

        const getY = (value: number) => {
            return height - padding - ((value / maxValue) * (height - 2 * padding));
        };

        const getX = (index: number) => {
            return padding + (index / (chartData.length - 1)) * (width - 2 * padding);
        };

        const onlinePoints = chartData.map((d, i) => `${getX(i)},${getY(d.online)}`).join(' ');
        const offlinePoints = chartData.map((d, i) => `${getX(i)},${getY(d.offline)}`).join(' ');

        return (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <svg width={width} height={height} className="overflow-visible">
                    <defs>
                        <linearGradient id="onlineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="offlineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Online area */}
                    <polyline
                        points={`${padding},${height - padding} ${onlinePoints} ${width - padding},${height - padding}`}
                        fill="url(#onlineGradient)"
                        stroke="none"
                    />
                    {/* Online line */}
                    <polyline
                        points={onlinePoints}
                        fill="none"
                        stroke="rgb(16, 185, 129)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />

                    {/* Offline area */}
                    <polyline
                        points={`${padding},${height - padding} ${offlinePoints} ${width - padding},${height - padding}`}
                        fill="url(#offlineGradient)"
                        stroke="none"
                    />
                    {/* Offline line */}
                    <polyline
                        points={offlinePoints}
                        fill="none"
                        stroke="rgb(239, 68, 68)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeDasharray="4 2"
                    />
                </svg>

                {/* Legend */}
                <div className="flex gap-1 mt-1 text-[9px] justify-center">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-400">Online</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-gray-400">Offline</span>
                    </div>
                </div>
            </div>
        );
    };

    // Bar Chart for comparison
    const BarChart = () => {
        const maxValue = Math.max(data.low, mergedHigh);
        
        return (
            <div className="flex items-end justify-center gap-4 h-24">
                <div className="flex flex-col items-center gap-1">
                    <div className="relative w-12 bg-gray-700/50 rounded-t-lg overflow-hidden" style={{ height: '80px' }}>
                        <div 
                            className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-green-400 transition-all duration-1000 ease-out rounded-t-lg"
                            style={{ height: `${(data.low / maxValue) * 100}%` }}
                        >
                            <div className="absolute inset-0 bg-white/10"></div>
                        </div>
                    </div>
                    <div className="text-white text-sm font-bold">{data.low}</div>
                    <div className="text-gray-400 text-[9px]">{labels.low}</div>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <div className="relative w-12 bg-gray-700/50 rounded-t-lg overflow-hidden" style={{ height: '80px' }}>
                        <div 
                            className="absolute bottom-0 w-full bg-gradient-to-t from-red-500 to-red-400 transition-all duration-1000 ease-out rounded-t-lg"
                            style={{ height: `${(mergedHigh / maxValue) * 100}%` }}
                        >
                            <div className="absolute inset-0 bg-white/10"></div>
                        </div>
                    </div>
                    <div className="text-white text-sm font-bold">{mergedHigh}</div>
                    <div className="text-gray-400 text-[9px]">{labels.high}</div>
                </div>
            </div>
        );
    };

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            {viewMode === 'stats' ? (
                <div className="flex items-center gap-4 h-full py-2">
                    {/* Left: Total Count with Circular Progress */}
                    <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: '35%' }}>
    {showGraph ? (
        <div className="flex flex-col items-center">
            <CircularProgress 
                percent={onlinePercent} 
                color="rgb(16, 185, 129)"
                size={90}
            />

            {/* Text BELOW circle */}
            <div className="mt-2 text-center">
                <div className="text-xs text-white font-bold">Total : {total}</div>
                <div className="text-2xl font-bold text-(--contrast)">
                    {total}
                </div>
            </div>
        </div>
    ) : (
        <>
            <div className="text-6xl font-bold text-(--contrast) leading-none tracking-tight">
                {total}
            </div>
            <div className="text-(--contrast)/40 text-[9px] mt-1 tracking-wide uppercase">
                Total
            </div>
        </>
    )}
</div>


                    {/* Divider */}
                    <div className="h-full w-px bg-(--contrast)/10"></div>

                    {/* Right Section */}
                    <div className="flex flex-col gap-1.5 flex-1">
                        {/* Trend Indicator */}
                        

                        {/* Online */}
                        <button
                            onClick={() => onStatusClick?.('online')}
                            className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors group"
                        >
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-(--green) animate-pulse"></div>
                                <span className="text-(--contrast) text-xs font-medium">{labels.low}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-(--contrast) text-lg font-bold">{data.low}</span>
                                <span className="text-(--green) text-[10px] font-bold bg-green-500/10 px-1.5 py-0.5 rounded">
                                    {onlinePercent}%
                                </span>
                            </div>
                        </button>

                        {/* Progress bar for online */}
                        {showGraph && (
                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden mx-2">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000 ease-out"
                                    style={{ width: `${onlinePercent}%` }}
                                />
                            </div>
                        )}

                        {/* Offline + Unknown merged */}
                        <button
                            onClick={() => onStatusClick?.('offline')}
                            className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-(--contrast)/5 transition-colors group"
                        >
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-(--red)"></div>
                                <span className="text-(--contrast) text-xs font-medium">
                                    {labels.high}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-(--contrast) text-lg font-bold">{mergedHigh}</span>
                                <span className="text-(--red) text-[10px] font-bold bg-red-500/10 px-1.5 py-0.5 rounded">
                                    {offlinePercent}%
                                </span>
                            </div>
                        </button>

                        {/* Progress bar for offline */}
                        {showGraph && (
                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden mx-2">
                                <div 
                                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000 ease-out"
                                    style={{ width: `${offlinePercent}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    {/* Toggle between different graph types */}
                    <div className="w-full flex justify-center">
                        {chartData.length > 0 ? <MiniLineChart /> : <BarChart />}
                    </div>
                    
                    {/* Stats summary */}
                    <div className="flex gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-green-400">{data.low}</div>
                            <div className="text-[9px] text-gray-400 uppercase">{labels.low}</div>
                        </div>
                        <div className="w-px bg-gray-700"></div>
                        <div>
                            <div className="text-2xl font-bold text-red-400">{mergedHigh}</div>
                            <div className="text-[9px] text-gray-400 uppercase">{labels.high}</div>
                        </div>
                    </div>
                </div>
            )}
        </BaseCard>
    );
}