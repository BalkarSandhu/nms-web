
import BaseCard from "./Base-Card";
import "@/index.css";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

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
    menuGroups?: any[]; // Match BaseCard's menu structure
}

export default function Metric1({ 
    title = "Metric 1",
    data = { low: 25, medium: 35, high: 40 },
    labels = { low: "Online", medium: "Supervised", high: "Offline" },
    className = "",
    chartClassName = "",
    showLabels = true,
    menuGroups
}: Metric1Props) {
    const chartRef = useRef<HTMLDivElement>(null);

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
            // legend: {
            //     orient: 'vertical',
            //     right: '0%',
            //     top: '20%',
            //     textStyle: {
            //         color: contrastColor,
            //         fontSize: 8
            //     },
            //     itemWidth: 5,
            //     itemHeight: 12,
            //     itemGap: 8,
            //     formatter: (name: string) => {
            //         const item = [
            //             { name: labels.low || "Low", value: data.low },
            //             { name: labels.medium || "Medium", value: data.medium },
            //             { name: labels.high || "High", value: data.high }
            //         ].find(d => d.name === name);
            //         return item ? `${name}: ${item.value}` : name;
            //     }
            // },
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
                        { 
                            value: data.low, 
                            name: labels.low || "Low",
                            itemStyle: { color: greenColor }
                        },
                        { 
                            value: data.medium, 
                            name: labels.medium || "Medium",
                            itemStyle: { color: azulColor }
                        },
                        { 
                            value: data.high, 
                            name: labels.high || "High",
                            itemStyle: { color: redColor }
                        }
                    ]
                }
            ]
        };

        chart.setOption(option);

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
            chart.dispose();
        };
    }, [data, labels, showLabels]);

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div 
                ref={chartRef} 
                className={`flex flex-1 items-center justify-center w-full h-full min-h-0 ${chartClassName}`}
            />
            <div id="LegendContainer" className=" w-full flex justify-center gap-4">
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-(--green)"></span>
                    <span className="text-(--contrast) text-[10px]">{labels.low || "Online"}: {data.low}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-(--azul)" ></span>
                    <span className="text-(--contrast) text-[10px]">{labels.medium || "Supervised"}: {data.medium}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-(--red)"></span>
                    <span className="text-(--contrast) text-[10px]">{labels.high || "Offline"}: {data.high}</span>
                </div>
            </div>
        </BaseCard>
    );
}