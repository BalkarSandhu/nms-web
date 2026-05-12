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
    title: ReactNode;
    menuGroups?: MenuGroupType[];
    children: ReactNode;
    className?: string;
};

export default function BaseCard({ title, menuGroups, children, className = "" }: BaseCardProps): ReactNode {
    return (
        <div
            className={`relative w-full h-full max-h-[165px] rounded-xl p-3 flex flex-col gap-2 overflow-hidden ${className}`}
            style={{
                background:
                    'linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.92) 100%)',
                border: '1px solid var(--border-soft)',
                boxShadow: 'var(--shadow-card)',
            }}
        >
            {/* subtle accent glow in the corner */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(360px 70px at 100% 0%, rgba(34,211,238,0.10), transparent 65%)',
                }}
            />

            <div className="relative z-10 w-full h-[22px] flex flex-row justify-between items-center shrink-0">
                <span
                    className="text-[11px] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: 'var(--text-mid)' }}
                >
                    {title}
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label="Card actions"
                            className="size-6 inline-flex items-center justify-center rounded-md transition-colors"
                            style={{ color: 'var(--text-lo)' }}
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
                                        <DropdownMenuSeparator
                                            style={{ backgroundColor: 'var(--border-soft)' }}
                                        />
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

            <div className="relative z-10 w-full h-full flex flex-col">
                {children}
            </div>
        </div>
    );
}
