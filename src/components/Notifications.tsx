import React, { useState } from "react";

//-- ShadCN Components
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "./ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";

//-- Lucide Icons
import { Bell, BellDot, ChevronUp, Bird, TriangleAlert, ChevronDown } from "lucide-react";

export type NotificationType = {
    id:number;
    message: string;
    priority: "low" | "medium" | "high";
    data?: {
        label: string;
        value: string;
    }[];
    notificaitonState: "new" | "acknowledged" | "resolved";
    notificationOnClick?: () => void;
};

export type NotificationsType = {
    Notifications?:NotificationType[];
}

export function NotificationPopUp(Notifications: NotificationsType) {
    const [expandedNotifications, setExpandedNotifications] = useState<Set<number>>(new Set());

    const toggleNotification = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedNotifications(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };


    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "low":
                return "text-(--green)";
            case "medium":
                return "text-(--azul)";
            case "high":
                return "text-(--red)";
            default:
                return "text-(--contrast)";
        }
    };


    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    className="size-7 flex p-1 bg-(--contrast) border-2 border-(--base) hover:bg-(--contrast)/50 rounded-[10px] items-center justify-center"
                >
                    {(Notifications.Notifications && Notifications.Notifications.length > 0)
                        ? <BellDot className="h-5 w-5 text-(--base) bg-none" />
                        : <Bell className="h-5 w-5 text-(--base) bg-none" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-linear-to-b from-(--base) to-(--dark) min-w-100 drop-shadow-lg p-0 mt-2 \
                                       border-0 min-h-[50vh] background-blur-lg">
                <Card className="bg-(--base)/0 min-w-100 border-0">

                    <CardHeader>
                        <CardTitle>
                            <span className="text-(--contrast) text-[16px] font-medium">Notifications</span>
                        </CardTitle>
                        {/* <CardAction>
                            <Button variant="ghost" className="size-7 p-0 m-0">
                                <X className="h-4 w-4 text-(--base)" />
                            </Button>
                        </CardAction> */}
                    </CardHeader>
                    <CardContent className="p-2">
                        {Notifications.Notifications?.length === 0 && (
                            <div className = "flex flex-col items-center justify-center, w-full h-[50vh] justify-center gap-6">
                                <Bird className="inline-block mr-2 size-10 text-(--contrast)" />
                                <span className="text-(--contrast)/80 text-[14px]">No new notifications.</span>
                            </div>
                        )}
                        {Notifications.Notifications?.map((notification, index) => {
                            const isExpanded = expandedNotifications.has(index);
                            const hasData = notification.data && notification.data.length > 0;
                            
                            return (
                                <div
                                    key={index}
                                    className="mb-3 p-2 border border-(--contrast)/20 rounded-sm bg-(--contrast)/5"
                                >
                                    <div 
                                        className="text-[12px] text-(--contrast) flex items-center justify-between cursor-pointer hover:bg-(--contrast)/10 px-1 py-0.5 rounded"
                                        onClick={notification.notificationOnClick}
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            <TriangleAlert className={`size-4 ${getPriorityColor(notification.priority)}`}/>
                                            <span>{notification.message}</span>
                                        </div>
                                        {hasData && (
                                            <button
                                                onClick={(e) => toggleNotification(index, e)}
                                                className="p-1 hover:bg-(--contrast)/20 rounded transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="size-3 text-(--contrast)"/>
                                                ) : (
                                                    <ChevronDown className="size-3 text-(--contrast)"/>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {hasData && (
                                        <div 
                                            className={`
                                                overflow-hidden transition-all duration-300 ease-in-out
                                                ${isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}
                                            `}
                                        >
                                            <div className="space-y-1 px-2 pt-1 border-t border-(--contrast)/10">
                                                {notification.data!.map((dataItem, dataIndex) => (
                                                    <div key={dataIndex} className="text-(--contrast)/80 text-[11px] flex gap-2">
                                                        <span className="font-semibold">{dataItem.label}:</span> 
                                                        <span>{dataItem.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>



            </PopoverContent>
        </Popover>


    );

}