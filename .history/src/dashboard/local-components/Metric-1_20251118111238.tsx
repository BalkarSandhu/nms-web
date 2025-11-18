
import BaseCard from "./Base-Card";
import "@/index.css";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

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

export interface Metric1Props {
    title?: string;
    data?: MetricData;
    labels?: MetricLabels;
    className?: string;
    chartClassName?: string;
    showLabels?: boolean;
    menuGroups?: MenuGroupType[]; // Match BaseCard's menu structure
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void; // Context-aware navigation callback
}

export default function Metric1({ 
    title = "Metric 1",
    data = { low: 25, medium: 35, high: 40 },
    labels = { low: "Online", medium: "Supervised", high: "Offline" },
    className = "",
    chartClassName = "",
    showLabels = true,
    menuGroups,
    onStatusClick
}: Metric1Props) {
    const chartRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (!chartRef.current) return;

        // Get CSS variable colors
        const root = getComputedStyle(document.documentElement);
        const azulColor = root.getPropertyValue('--azul').trim() || '#246EB9';
        const greenColor = root.getPropertyValue('--green').trim() || '#4CB944';
        const redColor = root.getPropertyValue('--red').trim() || '#D52941';
        const contrastColor = root.getPropertyValue('--contrast').trim() || '#FDFFFC';
        const baseColor = root.getPropertyValue('--base').trim() || '#1a1a1a';

        // Initialize chart
        const chart = echarts.init(chartRef.current);

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)',
                backgroundColor: baseColor,
                borderColor: contrastColor,
                textStyle: {
                    color: contrastColor
                }
            },
            series: [
                {
                    name: 'Metrics',
                    type: 'pie',
                    radius: ['140%', '170%'],
                    center: ['50%', '85%'],
                    startAngle: 180,
                    endAngle: 360,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 4,
                        borderColor: baseColor,
                        borderWidth:1
                    },
                    label: {
                        show: false
                    },
                    emphasis: {
                        label: {
                            show: false
                        },
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        labels.low && data.low > 0 ? { 
                            value: data.low, 
                            name: labels.low || "Low",
                            itemStyle: { color: greenColor }
                        } : null,
                        labels.medium && data.medium > 0 ? { 
                            value: data.medium, 
                            name: labels.medium || "Medium",
                            itemStyle: { color: azulColor }
                        } : null,
                        labels.high && data.high > 0 ? { 
                            value: data.high, 
                            name: labels.high || "High",
                            itemStyle: { color: redColor }
                        } : null
                    ].filter((item): item is { value: number; name: string; itemStyle: { color: string } } => item !== null)
                }
            ]
        };

        chart.setOption(option);
        // Navigate on slice click using context-aware callback
        const handleChartClick = (params: any) => {
            const name = (params && params.name) ? String(params.name).toLowerCase() : '';
            if (name.includes('online')) {
                onStatusClick?.('online');
                return;
            }
            if (name.includes('offline')) {
                onStatusClick?.('offline');
                return;
            }
            if (name.includes('unknown')) {
                onStatusClick?.('unknown');
                return;
            }
        };

        chart.on('click', handleChartClick);

        // Handle window resize
        const handleResize = () => {
            chart.resize();
        };
        window.addEventListener('resize', handleResize);

        // Add ResizeObserver to handle container size changes
        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        
        if (chartRef.current) {
            resizeObserver.observe(chartRef.current);
        }

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            chart.off('click');
            chart.dispose();
        };
    }, [data, labels, showLabels, onStatusClick]);

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className} style={{ width: '280px', minWidth: '280px' }}>
            <div 
                ref={chartRef} 
                className={`flex flex-1 items-center justify-center w-full h-full min-h-0 ${chartClassName}`}
            />
            <div id="LegendContainer" className=" w-full flex justify-center gap-4">
                {labels.low && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => onStatusClick?.('online')} className="w-3 h-3 rounded-full bg-(--green)" aria-label="Online devices" />
                        <button onClick={() => onStatusClick?.('online')} className="text-(--contrast) text-[10px]" style={{background:'transparent',border:0,padding:0,marginLeft:6}}>{labels.low}: {data.low}</button>
                    </div>
                )}
                {labels.medium && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => onStatusClick?.('unknown')} className="w-3 h-3 rounded-full bg-(--azul)" aria-label="Unknown status" />
                        <button onClick={() => onStatusClick?.('unknown')} className="text-(--contrast) text-[10px]" style={{background:'transparent',border:0,padding:0,marginLeft:6}}>{labels.medium}: {data.medium}</button>
                    </div>
                )}
                {labels.high && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => onStatusClick?.('offline')} className="w-3 h-3 rounded-full bg-(--red)" aria-label="Offline devices" />
                        <button onClick={() => onStatusClick?.('offline')} className="text-(--contrast) text-[10px]" style={{background:'transparent',border:0,padding:0,marginLeft:6}}>{labels.high}: {data.high}</button>
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
