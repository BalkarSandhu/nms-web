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
}

export default function Section ({title, menuGroups, children, metricsData }: SectionProps) {

    const [metricState, setMetricState] = React.useState<boolean>(false);
return (
    <section className={`flex flex-col gap-2 w-full overflow-hidden transition-[height,min-height] duration-500 ease-in-out ${
        metricState 
            ? "h-[550px] min-h-[550px]" // Fixed height for map
            : "h-[210px] min-h-[210px] max-h-[210px]" // Fixed collapsed height with max constraint
    }`}>
        <div className="flex flex-row gap-2 items-center w-full">
            <div className="bg-(--contrast) w-5 h-0.5"/>
            <span className="text-(--contrast) text-[12px]">{title}</span>
            <div className="bg-(--contrast) w-full h-0.5"/>
            
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
        />
    </section>
)
}
