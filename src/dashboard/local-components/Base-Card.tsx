import React from "react";
import type { ReactNode } from 'react';
import "@/index.css";
import { EllipsisVertical } from "lucide-react";

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

export type BaseCardProps = {
    title: string;
    menuGroups?: MenuGroupType[];
    children: ReactNode;
    className?: string;
};

export default function BaseCard({ title, menuGroups, children, className = "" }: BaseCardProps): ReactNode {
    return (
        <div className={`w-full h-full max-h-[165px] bg-(--dark)
                        rounded-[10px] p-2 flex flex-col gap-2 overflow-hidden ${className}`}>
            <div className="w-full h-[25px] flex flex-row justify-between items-center shrink-0">
                <span className="text-(--contrast) text-sm align-left font-semibold">{title}</span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* <Button variant="outline" className="bg-[var(--base)] border-0 hover:bg-[var(--dark)]">

                        </Button> */}
                        <EllipsisVertical className="text-(--contrast) hover:text-(--contrast) size-4" />
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

            <div className="w-full h-full flex flex-col">
                {children}
            </div>
        </div>
    );
}
