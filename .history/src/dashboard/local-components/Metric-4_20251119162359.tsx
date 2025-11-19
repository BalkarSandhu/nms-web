import BaseCard from "./Base-Card";
import "@/index.css";
import { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import { useEnrichedDevices } from "../devices/local_components/table";

import { MenuGroupType } from "./Base-Card";

export interface DeviceTypeData {
    type: string;
    count: number;
}

export interface Metric4Props {
    title?: string;
    className?: string;
    chartClassName?: string;
    menuGroups?: MenuGroupType[];
    onTypeClick?: (type: string) => void;
}

export default function Metric4({ 
    title = "Devices by Type",
    className = "",
    chartClassName = "",
    menuGroups,
    onTypeClick
}: Metric4Props) {
    const chartRef = useRef<HTMLDivElement>(null);
    
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
        const contrastColor = root.getPropertyValue('--contrast').trim() || '#FDFFFC';
        const baseColor = root.getPropertyValue('--base').trim() || '#1a1a1a';

        // Color palette for different device types
        const colorPalette = [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
            '#FF6384',
            '#C9CBCF',
        ];

        // Initialize chart
        const chart = echarts.init(chartRef.current);

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} devices ({d}%)',
                backgroundColor: baseColor,
                borderColor: contrastColor,
                textStyle: {
                    color: contrastColor
                }
            },
            series: [
                {
                    name: 'Device Types',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['50%', '50%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: baseColor,
                        borderWidth: 2
                    },
                    label: {
                        show: false
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: contrastColor
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
                    data: data.map((item, index) => ({
                        value: item.count,
                        name: item.type,
                        itemStyle: { 
                            color: colorPalette[index % colorPalette.length] 
                        }
                    }))
                }
            ]
        };

        chart.setOption(option);

        // Handle chart click
        const handleChartClick = (params: any) => {
            if (params && params.name) {
                onTypeClick?.(params.name);
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
            chart.off('click', handleChartClick);
            chart.dispose();
        };
    }, [data, onTypeClick]);

    // Calculate total for percentage display
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div 
                ref={chartRef} 
                className={`flex flex-1 items-center justify-center w-full h-full min-h-0 ${chartClassName}`}
                style={{ minHeight: '250px' }}
            />
            <div id="LegendContainer" className="w-full flex flex-wrap justify-center gap-3 mt-2">
                {data.map((item, index) => {
                    const colorPalette = [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                        '#FF6384',
                        '#C9CBCF',
                    ];
                    const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    
                    return (
                        <div key={item.type} className="flex items-center gap-1">
                            <button 
                                onClick={() => onTypeClick?.(item.type)} 
                                className="w-3 h-3 rounded-full" 
                                style={{ 
                                    backgroundColor: colorPalette[index % colorPalette.length],
                                    border: 0,
                                    padding: 0,
                                    cursor: 'pointer'
                                }}
                                aria-label={`${item.type} devices`}
                            />
                            <button 
                                onClick={() => onTypeClick?.(item.type)} 
                                className="text-(--contrast) text-[10px]" 
                                style={{
                                    background: 'transparent',
                                    border: 0,
                                    padding: 0,
                                    marginLeft: 6,
                                    cursor: 'pointer'
                                }}
                            >
                                {item.type}: {item.count} ({percentage}%)
                            </button>
                        </div>
                    );
                })}
            </div>
        </BaseCard>
    );
}