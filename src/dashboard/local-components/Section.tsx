import React, { ReactNode } from "react";
import { EllipsisVertical, ChevronRight } from "lucide-react";

import type { Metric1Props } from "./Metric-1"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Metrics from "./Metrics";
import type { MapDataPoint } from "./Map-Viewer";

export type MenuItemType = {
    type: "item" | "separator" | "label";
    label?: string;
    icon?: ReactNode;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
};

export type MenuGroupType = {
    items: MenuItemType[];
};

export type SectionMetricsData = {
    metric1?: Metric1Props;
    metric2?: any;
    metric3?: any;
    metric4?: { label: string; value: number }[];
};

type SectionProps = {
    title: string;
    link?: ReactNode;
    menuGroups?: MenuGroupType[];
    children?: ReactNode;
    metricsData?: SectionMetricsData;
    mapData?: MapDataPoint[];
}

export default function Section({ title, menuGroups, children, metricsData, mapData }: SectionProps) {
    const [metricState, setMetricState] = React.useState<boolean>(false);
    return (
        <section
            className={`flex flex-col gap-2 w-full overflow-hidden section-expand ${
                metricState
                    ? "h-[560px] min-h-[560px]"
                    : "h-[220px] min-h-[220px] max-h-[220px]"
            }`}
        >
            <div className="flex flex-row gap-3 items-center w-full">
                <span className="nms-section-title">{title}</span>
                <div
                    className="flex-1 h-px"
                    style={{
                        background:
                            'linear-gradient(90deg, var(--border-strong) 0%, var(--border-soft) 30%, transparent 100%)',
                    }}
                />
                <button
                    type="button"
                    onClick={() => setMetricState(!metricState)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-[var(--text-hi)]"
                    style={{ color: 'var(--text-lo)' }}
                >
                    {metricState ? 'Metrics' : 'Map'}
                    <ChevronRight className="size-3" />
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="size-7 inline-flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.04]"
                            style={{ color: 'var(--text-lo)' }}
                            aria-label="Section actions"
                        >
                            <EllipsisVertical className="size-4" />
                        </button>
                    </DropdownMenuTrigger>

                    {menuGroups && menuGroups.length > 0 && (
                        <DropdownMenuContent
                            className="w-56 border"
                            align="end"
                            style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-soft)',
                                color: 'var(--text-hi)',
                            }}
                        >
                            {menuGroups.map((group, groupIndex) => (
                                <React.Fragment key={groupIndex}>
                                    {groupIndex > 0 && (
                                        <DropdownMenuSeparator style={{ backgroundColor: 'var(--border-soft)' }} />
                                    )}
                                    <DropdownMenuGroup>
                                        {group.items.map((item, itemIndex) => {
                                            if (item.type === "separator") {
                                                return (
                                                    <DropdownMenuSeparator
                                                        key={`sep-${itemIndex}`}
                                                        style={{ backgroundColor: 'var(--border-soft)' }}
                                                    />
                                                );
                                            }
                                            if (item.type === "label") {
                                                return (
                                                    <DropdownMenuLabel
                                                        key={`label-${itemIndex}`}
                                                        className="text-[10px] uppercase tracking-[0.16em]"
                                                        style={{ color: 'var(--text-lo)' }}
                                                    >
                                                        {item.label}
                                                    </DropdownMenuLabel>
                                                );
                                            }
                                            return (
                                                <DropdownMenuItem
                                                    key={`item-${itemIndex}`}
                                                    onClick={item.onClick}
                                                    disabled={item.disabled}
                                                    style={{ color: 'var(--text-hi)' }}
                                                >
                                                    {item.icon && <span className="mr-2">{item.icon}</span>}
                                                    {item.label}
                                                    {item.shortcut && (
                                                        <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
                                                    )}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuGroup>
                                </React.Fragment>
                            ))}
                        </DropdownMenuContent>
                    )}
                </DropdownMenu>
            </div>
            {children}
            <Metrics
                metricState={metricState}
                setMetricState={setMetricState}
                metricsData={metricsData}
                mapData={mapData}
            />
        </section>
    );
}
