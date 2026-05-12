import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuGroupType } from "./Base-Card";
import {
    Video, MountainSnow, Computer, HardDrive, DoorClosed,
    Weight, Route, Construction,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ReactNode } from "react";

export interface MetricItem {
    label: string;
    value: number;
    [key: string]: any;
}

export interface MetricGeneralProps {
    title?: ReactNode;
    className?: string;
    menuGroups?: MenuGroupType[];
    onItemClick?: (item: MetricItem) => void;
    data?: MetricItem[];
    navigatePath?: string;
    navigateTarget?: 'auto' | 'devices' | 'locations';
    iconResolver?: (item: MetricItem) => React.ReactNode;
    emptyText?: string;
    maxItems?: number;
}

const COLORS = [
    'var(--c-1)', 'var(--c-2)', 'var(--c-5)', 'var(--c-3)',
    'var(--c-6)', 'var(--c-7)', 'var(--c-4)', 'var(--c-8)',
];

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
}: MetricGeneralProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const sortedData = useMemo(() => {
        if (!data.length) return [];
        return [...data].sort((a, b) => b.value - a.value);
    }, [data]);

    const total = sortedData.reduce((sum, item) => sum + item.value, 0);

    const pieData = useMemo(
        () => sortedData.slice(0, maxItems).map(item => ({ name: item.label, value: item.value })),
        [sortedData, maxItems],
    );

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                { type: "item" as const, label: "Refresh", onClick: () => {} },
                { type: "item" as const, label: "Export",  onClick: () => {} },
            ],
        },
    ];

    const resolveTargetPath = (item: MetricItem) => {
        if (navigatePath) return navigatePath;
        if (item.navigateTarget) {
            const t = item.navigateTarget.toString();
            if (t === '/devices'   || t === 'devices')   return '/devices';
            if (t === '/locations' || t === 'locations') return '/locations';
        }
        if (navigateTarget === 'devices')   return '/devices';
        if (navigateTarget === 'locations') return '/locations';
        const label = (item.label || '').toLowerCase();
        const locationKeywords = ['route','checkpost','check post','checkpoint','static location','area','site','location','depot','terminal','station','weigh'];
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

    const defaultIconResolver = (item: MetricItem) => {
        const label = item.label.toLowerCase();
        if (label.includes("workstation")) return <Computer size={14} />;
        if (label.includes("ptz") || label.includes("camera") || label.includes("dome") || label.includes("bullet")) return <Video size={14} />;
        if (label.includes("coal dump")) return <MountainSnow size={14} />;
        if (label.includes("nvr")) return <HardDrive size={14} />;
        if (label.includes("static location")) return <DoorClosed size={14} />;
        if (label.includes("weighbridge")) return <Weight size={14} />;
        if (label.includes("route")) return <Route size={14} />;
        if (label.includes("checkpost")) return <Construction size={14} />;
        return null;
    };
    const getIcon = iconResolver || defaultIconResolver;

    if (sortedData.length === 0) {
        return (
            <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
                <div className="flex items-center justify-center h-full">
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{emptyText}</span>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="flex items-center h-full py-1 gap-2">
                <div className="h-full shrink-0" style={{ width: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%" cy="50%"
                                innerRadius={28} outerRadius={48}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onClick={(d) => {
                                    const item = sortedData.find(i => i.label === d.name);
                                    if (item) handleItemClick(item);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(15,23,42,0.96)',
                                    border: '1px solid var(--border-strong)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: 'var(--text-hi)',
                                    padding: '8px 12px',
                                }}
                                itemStyle={{ color: 'var(--text-hi)' }}
                                labelStyle={{ color: 'var(--text-mid)', fontWeight: 500 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col flex-1 min-w-0 overflow-y-auto metric-scroll" style={{ maxHeight: '128px' }}>
                    {sortedData.slice(0, maxItems).map((item, index) => {
                        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center justify-between px-2 py-1 rounded-md transition-colors w-full hover:bg-white/[0.04]"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="shrink-0" style={{ color: 'var(--text-mid)' }}>{getIcon(item)}</span>
                                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text-hi)' }}>{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-hi)' }}>{item.value}</span>
                                    <span className="text-[10px] font-medium min-w-8 text-right tabular-nums" style={{ color: 'var(--text-lo)' }}>{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </BaseCard>
    );
}
