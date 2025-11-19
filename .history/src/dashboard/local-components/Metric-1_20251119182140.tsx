import { useState } from "react";

// Mock BaseCard component
function BaseCard({ title, menuGroups, className, children }) {
    return (
        <div className={`bg-gray-900 rounded-xl p-6 shadow-2xl ${className}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">{title}</h2>
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
    title = "Device Status Overview",
    data = { low: 145, medium: 28, high: 12 },
    labels = { low: "Online", medium: "Supervised", high: "Offline" },
    className = "",
    onStatusClick
}: Metric1Props) {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    
    const total = data.low + data.medium + data.high;
    
    const metrics = [
        {
            key: 'low',
            label: labels.low || "Online",
            value: data.low,
            percentage: Math.round((data.low / total) * 100),
            color: 'emerald',
            bgClass: 'bg-emerald-500',
            hoverBgClass: 'hover:bg-emerald-600',
            textClass: 'text-emerald-400',
            borderClass: 'border-emerald-500/30',
            glowClass: 'shadow-emerald-500/20',
            status: 'online' as const,
            icon: '●'
        },
        {
            key: 'medium',
            label: labels.medium || "Supervised",
            value: data.medium,
            percentage: Math.round((data.medium / total) * 100),
            color: 'blue',
            bgClass: 'bg-blue-500',
            hoverBgClass: 'hover:bg-blue-600',
            textClass: 'text-blue-400',
            borderClass: 'border-blue-500/30',
            glowClass: 'shadow-blue-500/20',
            status: 'unknown' as const,
            icon: '◐'
        },
        {
            key: 'high',
            label: labels.high || "Offline",
            value: data.high,
            percentage: Math.round((data.high / total) * 100),
            color: 'rose',
            bgClass: 'bg-rose-500',
            hoverBgClass: 'hover:bg-rose-600',
            textClass: 'text-rose-400',
            borderClass: 'border-rose-500/30',
            glowClass: 'shadow-rose-500/20',
            status: 'offline' as const,
            icon: '○'
        }
    ];

    return (
        <BaseCard title={title} menuGroups={[]} className={className}>
            <div className="space-y-4">
                {/* Total Count */}
                <div className="text-center mb-8">
                    <div className="text-5xl font-bold text-white mb-2">{total}</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wider">Total Devices</div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {metrics.map((metric) => (
                        <button
                            key={metric.key}
                            onClick={() => onStatusClick?.(metric.status)}
                            onMouseEnter={() => setHoveredCard(metric.key)}
                            onMouseLeave={() => setHoveredCard(null)}
                            className={`
                                relative overflow-hidden rounded-xl p-6 
                                border-2 ${metric.borderClass}
                                bg-gray-800/50 backdrop-blur
                                transition-all duration-300 ease-out
                                ${hoveredCard === metric.key ? `scale-105 ${metric.glowClass} shadow-xl` : 'shadow-md'}
                                cursor-pointer group
                            `}
                        >
                            {/* Background Gradient Overlay */}
                            <div className={`
                                absolute inset-0 opacity-0 group-hover:opacity-10 
                                transition-opacity duration-300
                                ${metric.bgClass}
                            `} />
                            
                            {/* Content */}
                            <div className="relative z-10">
                                {/* Icon & Label */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-3xl ${metric.textClass}`}>
                                        {metric.icon}
                                    </span>
                                    <span className={`
                                        text-xs font-semibold px-3 py-1 rounded-full
                                        ${metric.bgClass} bg-opacity-20 ${metric.textClass}
                                    `}>
                                        {metric.percentage}%
                                    </span>
                                </div>
                                
                                {/* Value */}
                                <div className="text-4xl font-bold text-white mb-1">
                                    {metric.value}
                                </div>
                                
                                {/* Label */}
                                <div className="text-gray-400 text-sm uppercase tracking-wide">
                                    {metric.label}
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${metric.bgClass} transition-all duration-500 ease-out`}
                                        style={{ 
                                            width: hoveredCard === metric.key ? '100%' : `${metric.percentage}%` 
                                        }}
                                    />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Status Bar Visualization */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Distribution</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden shadow-inner bg-gray-800">
                        {metrics.map((metric, index) => (
                            metric.percentage > 0 && (
                                <div
                                    key={metric.key}
                                    className={`${metric.bgClass} transition-all duration-500 cursor-pointer ${metric.hoverBgClass}`}
                                    style={{ width: `${metric.percentage}%` }}
                                    onClick={() => onStatusClick?.(metric.status)}
                                    title={`${metric.label}: ${metric.value} (${metric.percentage}%)`}
                                />
                            )
                        ))}
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}