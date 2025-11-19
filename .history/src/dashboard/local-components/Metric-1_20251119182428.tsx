import { useState } from "react";

// Mock BaseCard component
function BaseCard({ title, menuGroups, className, children }) {
    return (
        <div className={`bg-(--base) rounded-lg p-4 shadow-lg ${className}`}>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold text-(--contrast)">{title}</h2>
                <button className="text-(--contrast) opacity-60 hover:opacity-100 text-xl leading-none">⋮</button>
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
            colorVar: '--green',
            status: 'online' as const
        },
        {
            key: 'medium',
            label: labels.medium || "Supervised",
            value: data.medium,
            percentage: total > 0 ? (data.medium / total) * 100 : 0,
            colorVar: '--azul',
            status: 'unknown' as const
        },
        {
            key: 'high',
            label: labels.high || "Offline",
            value: data.high,
            percentage: total > 0 ? (data.high / total) * 100 : 0,
            colorVar: '--red',
            status: 'offline' as const
        }
    ].filter(m => m.value > 0);

    const getColor = (colorVar: string) => {
        const root = getComputedStyle(document.documentElement);
        return root.getPropertyValue(colorVar).trim() || '#246EB9';
    };

    return (
        <BaseCard title={title} menuGroups={[]} className={className}>
            {/* Main Display Area */}
            <div className="flex flex-col items-center justify-center py-4">
                
                {/* Large Number Display */}
                <div className="flex items-baseline gap-3 mb-4">
                    {metrics.map((metric, index) => (
                        <div key={metric.key} className="flex items-baseline">
                            {index > 0 && <span className="text-(--contrast) opacity-30 mx-2">/</span>}
                            <button
                                onClick={() => onStatusClick?.(metric.status)}
                                onMouseEnter={() => setHoveredStatus(metric.key)}
                                onMouseLeave={() => setHoveredStatus(null)}
                                className="group flex items-baseline transition-transform hover:scale-110"
                                style={{ background: 'transparent', border: 0, padding: 0 }}
                            >
                                <span 
                                    className="text-4xl font-bold transition-colors"
                                    style={{ 
                                        color: hoveredStatus === metric.key ? getColor(metric.colorVar) : 'var(--contrast)'
                                    }}
                                >
                                    {metric.value}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-(--base) rounded-full overflow-hidden mb-4" style={{ opacity: 0.5 }}>
                    <div className="flex h-full">
                        {metrics.map((metric) => (
                            <button
                                key={metric.key}
                                onClick={() => onStatusClick?.(metric.status)}
                                className="transition-all hover:opacity-80 cursor-pointer"
                                style={{ 
                                    width: `${metric.percentage}%`,
                                    backgroundColor: `var(${metric.colorVar})`,
                                    border: 0,
                                    padding: 0
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
                            style={{ background: 'transparent', border: 0, padding: 0 }}
                        >
                            <span 
                                className={`w-3 h-3 rounded-full transition-transform group-hover:scale-125 bg-(${metric.colorVar})`}
                            />
                            <span className="text-(--contrast) text-sm group-hover:opacity-80 transition-opacity">
                                {metric.label}: {metric.value}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </BaseCard>
    );
}