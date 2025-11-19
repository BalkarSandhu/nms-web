import { useState } from "react";

// Mock BaseCard component
function BaseCard({ title, menuGroups, className, children }) {
    return (
        <div className={`bg-gray-800 rounded-lg p-4 shadow-lg ${className}`}>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold text-white">{title}</h2>
                <button className="text-gray-400 hover:text-white text-xl leading-none">⋮</button>
            </div>
            {children}
        </div>
    );
}

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
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void;
}

export default function Metric1({ 
    title = "Device Status",
    data = { low: 111, medium: 0, high: 26 },
    labels = { low: "Online", medium: "Supervised", high: "Offline" },
    className = "",
    onStatusClick
}: Metric1Props) {
    const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
    
    const total = data.low + data.medium + data.high;
    
    const metrics = [
        {
            key: 'low',
            label: labels.low || "Online",
            value: data.low,
            percentage: total > 0 ? (data.low / total) * 100 : 0,
            color: 'rgb(74, 222, 128)', // green-400
            status: 'online' as const
        },
        {
            key: 'medium',
            label: labels.medium || "Supervised",
            value: data.medium,
            percentage: total > 0 ? (data.medium / total) * 100 : 0,
            color: 'rgb(96, 165, 250)', // blue-400
            status: 'unknown' as const
        },
        {
            key: 'high',
            label: labels.high || "Offline",
            value: data.high,
            percentage: total > 0 ? (data.high / total) * 100 : 0,
            color: 'rgb(248, 113, 113)', // red-400
            status: 'offline' as const
        }
    ].filter(m => m.value > 0);

    return (
        <BaseCard title={title} menuGroups={[]} className={className}>
            {/* Main Display Area */}
            <div className="flex flex-col items-center justify-center py-4">
                
                {/* Large Number Display */}
                <div className="flex items-baseline gap-3 mb-4">
                    {metrics.map((metric, index) => (
                        <div key={metric.key} className="flex items-baseline">
                            {index > 0 && <span className="text-gray-600 mx-2">/</span>}
                            <button
                                onClick={() => onStatusClick?.(metric.status)}
                                onMouseEnter={() => setHoveredStatus(metric.key)}
                                onMouseLeave={() => setHoveredStatus(null)}
                                className="group flex items-baseline transition-transform hover:scale-110"
                            >
                                <span 
                                    className="text-4xl font-bold transition-colors"
                                    style={{ 
                                        color: hoveredStatus === metric.key ? metric.color : '#fff'
                                    }}
                                >
                                    {metric.value}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div className="flex h-full">
                        {metrics.map((metric) => (
                            <button
                                key={metric.key}
                                onClick={() => onStatusClick?.(metric.status)}
                                className="transition-all hover:opacity-80 cursor-pointer"
                                style={{ 
                                    width: `${metric.percentage}%`,
                                    backgroundColor: metric.color
                                }}
                                title={`${metric.label}: ${metric.value}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {metrics.map((metric) => (
                        <button
                            key={metric.key}
                            onClick={() => onStatusClick?.(metric.status)}
                            onMouseEnter={() => setHoveredStatus(metric.key)}
                            onMouseLeave={() => setHoveredStatus(null)}
                            className="flex items-center gap-2 group cursor-pointer"
                        >
                            <span 
                                className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                                style={{ backgroundColor: metric.color }}
                            />
                            <span className="text-white text-sm group-hover:text-opacity-80 transition-colors">
                                {metric.label}: {metric.value}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </BaseCard>
    );
}