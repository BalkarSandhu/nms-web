import BaseCard from "./Base-Card";
import "@/index.css";
import { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import { useEnrichedDevices } from "../../devices/local_components/table";
import { useNavigate } from "react-router-dom";

import { MenuGroupType } from "./Base-Card";

export interface Metric1Props {
    title?: string;
    className?: string;
    chartClassName?: string;
    menuGroups?: MenuGroupType[];
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void;
}

export default function Metric1({ 
    title = "Device Status",
    className = "",
    chartClassName = "",
    menuGroups,
    onStatusClick
}: Metric1Props) {
    const chartRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const enrichedDevices = useEnrichedDevices();

    // Calculate real device status data
    const deviceStatusData = useMemo(() => {
        const online = enrichedDevices.filter((d) => d.status && !d.disabled).length;
        const offline = enrichedDevices.filter((d) => !d.status && !d.disabled).length;
        const disabled = enrichedDevices.filter((d) => d.disabled).length;

        return {
            online,
            offline,
            disabled,
            total: enrichedDevices.length
        };
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

    // Handle status navigation
    const handleStatusClick = (status: 'online' | 'offline' | 'disabled') => {
        onStatusClick?.(status as any);
        navigate(`/devices?status=${status === 'disabled' ? 'Offline' : status.charAt(0).toUpperCase() + status.slice(1)}`);
    };

    useEffect(() => {
        if (!chartRef.current) return;

        // Get CSS variable colors
        const root = getComputedStyle(document.documentElement);
        const greenColor = root.getPropertyValue('--green').trim() || '#10B981';
        const redColor = root.getPropertyValue('--red').trim() || '#EF4444';
        const grayColor = root.getPropertyValue('--gray').trim() || '#6B7280';
        const contrastColor = root.getPropertyValue('--contrast').trim() || '#FDFFFC';
        const baseColor = root.getPropertyValue('--base').trim() || '#1a1a1a';

        // Initialize chart
        const chart = echarts.init(chartRef.current);

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    if (params.componentSubType === 'pie') {
                        const percentage = ((params.value / deviceStatusData.total) * 100).toFixed(1);
                        return `${params.name}<br/>Count: ${params.value} (${percentage}%)`;
                    }
                    return '';
                },
                backgroundColor: baseColor,
                borderColor: contrastColor,
                textStyle: {
                    color: contrastColor
                }
            },
            series: [
                {
                    name: 'Device Status',
                    type: 'pie',
                    radius: ['55%', '70%'],
                    center: ['50%', '50%'],
                    startAngle:180,
                    endAngle:360,
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 2,
                        borderColor: baseColor,
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: contrastColor,
                        formatter: '{b}\n{c}',
                        position: 'outer',
                        distanceToLabelLine: 5,
                    },
                    labelLine: {
                        show: true,
                        length: 15,
                        length2: 5,
                        smooth: true
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 15,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)',
                            opacity: 0.8
                        }
                    },
                    data: [
                        {
                            value: deviceStatusData.online,
                            name: 'Online',
                            itemStyle: { color: greenColor }
                        },
                        {
                            value: deviceStatusData.offline,
                            name: 'Offline',
                            itemStyle: { color: redColor }
                        },
                        {
                            value: deviceStatusData.disabled,
                            name: 'Disabled',
                            itemStyle: { color: grayColor }
                        }
                    ].filter(item => item.value > 0)
                }
            ]
        };

        chart.setOption(option);

        // Handle chart click - navigate to devices page
        const handleChartClick = (params: any) => {
            if (params && params.name) {
                const statusName = params.name.toLowerCase();
                handleStatusClick(statusName as 'online' | 'offline' | 'disabled');
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
    }, [deviceStatusData]);

    const total = deviceStatusData.total;
    const onlinePercent = total > 0 ? Math.round((deviceStatusData.online / total) * 100) : 0;
    const offlinePercent = total > 0 ? Math.round((deviceStatusData.offline / total) * 100) : 0;
    const disabledPercent = total > 0 ? Math.round((deviceStatusData.disabled / total) * 100) : 0;

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div 
                ref={chartRef} 
                className={`flex flex-1 items-center justify-center w-full h-full min-h-0 ${chartClassName}`}
                style={{ minHeight: '350px' }}
            />
            
            {/* Enhanced Legend with Direct Numbers and Click Action */}
            <div className="w-full flex flex-wrap justify-center gap-6 mt-6 px-4">
                {/* Online */}
                <button
                    onClick={() => handleStatusClick('online')}
                    className="flex flex-col items-center p-4 rounded-lg hover:bg-green-50 transition-all cursor-pointer group"
                    style={{ border: '2px solid #10B981' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-green-600" />
                        <span className="text-sm font-semibold text-gray-700">Online</span>
                    </div>
                    <span className="text-3xl font-bold text-green-600">{deviceStatusData.online}</span>
                    <span className="text-xs text-gray-500 mt-1">{onlinePercent}% of total</span>
                    <span className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
                </button>

                {/* Offline */}
                <button
                    onClick={() => handleStatusClick('offline')}
                    className="flex flex-col items-center p-4 rounded-lg hover:bg-red-50 transition-all cursor-pointer group"
                    style={{ border: '2px solid #EF4444' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-red-600" />
                        <span className="text-sm font-semibold text-gray-700">Offline</span>
                    </div>
                    <span className="text-3xl font-bold text-red-600">{deviceStatusData.offline}</span>
                    <span className="text-xs text-gray-500 mt-1">{offlinePercent}% of total</span>
                    <span className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
                </button>

                {/* Disabled */}
                <button
                    onClick={() => handleStatusClick('disabled')}
                    className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group"
                    style={{ border: '2px solid #6B7280' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">Disabled</span>
                    </div>
                    <span className="text-3xl font-bold text-gray-600">{deviceStatusData.disabled}</span>
                    <span className="text-xs text-gray-500 mt-1">{disabledPercent}% of total</span>
                    <span className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</span>
                </button>

                {/* Total */}
                <div className="flex flex-col items-center p-4 rounded-lg bg-blue-50">
                    <span className="text-sm font-semibold text-gray-700 mb-2">Total Devices</span>
                    <span className="text-3xl font-bold text-blue-600">{total}</span>
                    <span className="text-xs text-gray-500 mt-1">100%</span>
                </div>
            </div>
        </BaseCard>
    );
}