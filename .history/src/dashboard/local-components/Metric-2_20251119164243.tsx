import BaseCard from "./Base-Card";
import "@/index.css";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export interface TableRow {
    id: string | number;
    col1: string | number;
    col2: string | number;
    link?: string;
}

export interface Metric2Props {
    title?: string;
    headers?: {
        col1: string;
        col2: string;
    };
    data?: TableRow[];
    maxRows?: number;
    className?: string;
    chartClassName?: string;
    menuGroups?: any[];
    onBarClick?: (item: TableRow) => void;
}

export default function Metric2({
    title = "Metric 2",
    headers = { col1: "Name", col2: "Value" },
    data = [
        { id: 1, col1: "Item 1", col2: "100", link: "#" },
        { id: 2, col1: "Item 2", col2: "200", link: "#" },
        { id: 3, col1: "Item 3", col2: "300", link: "#" },
        { id: 4, col1: "Item 4", col2: "400", link: "#" },
        { id: 5, col1: "Item 5", col2: "500", link: "#" },
    ],
    maxRows = 5,
    className = "",
    chartClassName = "",
    menuGroups,
    onBarClick
}: Metric2Props) {
    const chartRef = useRef<HTMLDivElement>(null);

    const displayedRows = data.slice(0, maxRows);
    const remainingCount = data.length - maxRows;

    useEffect(() => {
        if (!chartRef.current) return;

        // Get CSS variable colors
        const root = getComputedStyle(document.documentElement);
        const azulColor = root.getPropertyValue('--azul').trim() || '#246EB9';
        const contrastColor = root.getPropertyValue('--contrast').trim() || '#FDFFFC';
        const baseColor = root.getPropertyValue('--base').trim() || '#1a1a1a';

        // Initialize chart
        const chart = echarts.init(chartRef.current);

        // Prepare data for chart
        const chartData = displayedRows.map(row => ({
            name: String(row.col1),
            value: typeof row.col2 === 'number' ? row.col2 : parseFloat(String(row.col2)) || 0,
            itemData: row
        }));

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params: any) => {
                    const data = params[0];
                    return `${data.name}: ${data.value}`;
                },
                backgroundColor: baseColor,
                borderColor: contrastColor,
                textStyle: {
                    color: contrastColor
                }
            },
            grid: {
                left: '5%',
                right: '5%',
                bottom: remainingCount > 0 ? '15%' : '10%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.map(d => d.name),
                axisLabel: {
                    color: contrastColor,
                    fontSize: 10,
                    rotate: 30,
                    interval: 0
                },
                axisLine: {
                    lineStyle: {
                        color: contrastColor + '33'
                    }
                }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: contrastColor,
                    fontSize: 10
                },
                axisLine: {
                    show: false
                },
                splitLine: {
                    lineStyle: {
                        color: contrastColor + '1a'
                    }
                }
            },
            series: [
                {
                    name: headers.col2,
                    type: 'bar',
                    data: chartData.map(d => d.value),
                    itemStyle: {
                        color: azulColor,
                        borderRadius: [4, 4, 0, 0]
                    },
                    emphasis: {
                        itemStyle: {
                            color: azulColor,
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    barWidth: '60%'
                }
            ]
        };

        chart.setOption(option);

        // Handle chart click
        const handleChartClick = (params: any) => {
            if (params && params.dataIndex !== undefined) {
                const clickedRow = displayedRows[params.dataIndex];
                if (onBarClick) {
                    onBarClick(clickedRow);
                } else if (clickedRow.link) {
                    window.location.href = clickedRow.link;
                }
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
    }, [data, maxRows, displayedRows, headers, onBarClick, remainingCount]);

    return (
        <BaseCard title={title} menuGroups={menuGroups} className={className}>
            <div className="flex flex-col w-full h-full">
                <div 
                    ref={chartRef} 
                    className={`flex-1 w-full h-full min-h-0 ${chartClassName}`}
                    style={{ minHeight: '120px' }}
                />
                
                {/* Show "+n More" if there are remaining rows */}
                {remainingCount > 0 && (
                    <div className="w-full flex justify-center pt-1">
                        <button
                            onClick={() => onBarClick ? onBarClick(data[maxRows]) : window.location.href = "#"}
                            className="py-1 px-3 rounded-md text-center
                                     hover:bg-(--contrast)/10 transition-colors
                                     border border-transparent hover:border-(--contrast)/20"
                        >
                            <span className="text-(--contrast)/60 text-[10px] font-medium">
                                + {remainingCount} More
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </BaseCard>
    );
}