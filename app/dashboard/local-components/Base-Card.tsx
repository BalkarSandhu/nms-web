import React, { ReactNode } from "react";
import "./globals.css";
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <div className={`w-full h-full bg-gradient-to-r from-[var(--base)] to-[var(--dark)] 
                        rounded-[10px] p-4 flex flex-col gap-2 ${className}`}>
            <div className="w-full h-[25px] flex flex-row justify-between items-center">
                <span className="text-[var(--contrast)] align-left font-semibold">{title}</span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* <Button variant="outline" className="bg-[var(--base)] border-0 hover:bg-[var(--dark)]">

                        </Button> */}
                        <EllipsisVertical className="text-[var(--contrast)] hover:text-[var(--contrast)]" />
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
