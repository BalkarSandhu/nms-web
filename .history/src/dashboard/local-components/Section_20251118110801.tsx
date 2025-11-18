import React, { ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";

import type {Metric1Props} from "./Metric-1"

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
// import type { GaugeDataItem } from "./Metric-1";

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
    metric2?: any; // Define proper type when Metric-2 is implemented
    metric3?: any; // Define proper type when Metric-3 is implemented
};

type SectionProps = {
    title: string;
    link?: ReactNode;
    menuGroups?: MenuGroupType[];
    children?: ReactNode;
    metricsData?: SectionMetricsData;
    mapData?: MapDataPoint[]; // Map data to pass to Metrics
}

export default function Section ({title, menuGroups, children, metricsData, mapData }: SectionProps) {

    const [metricState, setMetricState] = React.useState<boolean>(false);
return (
    <section className={`flex flex-col gap-1 w-full overflow-hidden transition-[height,min-height] duration-500 ease-in-out ${
        metricState 
            ? "h-[550px] min-h-[550px]" // Fixed height for map
            : "h-[210px] min-h-[210px] max-h-[210px]" // Fixed collapsed height with max constraint
    }`}>
        <div className="flex flex-row gap-3 items-center w-full py-2">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 w-1 h-8 rounded-full"/>
            <span className="text-white text-xl font-bold tracking-wide uppercase bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{title}</span>
            <div className="bg-gradient-to-r from-cyan-400/50 to-transparent w-full h-[2px]"/>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <EllipsisVertical className="text-(--contrast) w-5 h-5 cursor-pointer hover:opacity-80" />
                </DropdownMenuTrigger>

                {menuGroups && menuGroups.length > 0 && (
                    <DropdownMenuContent className="w-56" align="end">
                        {menuGroups.map((group, groupIndex) => (
                            <React.Fragment key={groupIndex}>
                                {groupIndex > 0 && <DropdownMenuSeparator />}
                                <DropdownMenuGroup>
                                    {group.items.map((item, itemIndex) => {
                                        if (item.type === "separator") {
                                            return <DropdownMenuSeparator key={`sep-${itemIndex}`} />;
                                        }

                                        if (item.type === "label") {
                                            return (
                                                <DropdownMenuLabel key={`label-${itemIndex}`}>
                                                    {item.label}
                                                </DropdownMenuLabel>
                                            );
                                        }

                                        return (
                                            <DropdownMenuItem
                                                key={`item-${itemIndex}`}
                                                onClick={item.onClick}
                                                disabled={item.disabled}
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
)
}
