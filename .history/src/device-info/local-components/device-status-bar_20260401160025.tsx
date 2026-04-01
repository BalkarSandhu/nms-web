import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export type DeviceStatusBarProps = {
    status: 1 | 0 | 2;
    message: string;
    timestamp: string;
    is_reachable: boolean
}

export default function DeviceStatusBar({ status, message, timestamp, is_reachable }: DeviceStatusBarProps) {
    const getStatusConfig = (status: number) => {
        switch (status) {
            case 1:
                return {
                    bg: 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-500/50',
                    text: 'text-emerald-300',
                    icon: 'text-emerald-400',
                    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                };
            case 0:
                return {
                    bg: 'bg-gradient-to-r from-red-500/20 to-red-500/5 border border-red-500/30 hover:border-red-500/50',
                    text: 'text-red-300',
                    icon: 'text-red-400',
                    badge: 'bg-red-500/20 text-red-300 border border-red-500/40'
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-blue-500/20 to-blue-500/5 border border-blue-500/30 hover:border-blue-500/50',
                    text: 'text-blue-300',
                    icon: 'text-blue-400',
                    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                };
        }
    };

    const config = getStatusConfig(status);
    const Icon = status === 1 ? CheckCircle2 : status === 0 ? AlertCircle : Clock;

    return (
        <div className={cn(
            "flex items-center justify-between gap-4 px-4 py-3 rounded-lg w-full",
            "backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-black/20",
            config.bg
        )}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Icon className={cn("w-4 h-4 flex-shrink-0", config.icon)} />
                <span className={cn("text-sm font-medium truncate", config.text)}>
                    {message}
                </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                        {timestamp}
                    </span>
                </div>
                <div className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold",
                    config.badge
                )}>
                    {is_reachable ? 'Reachable' : 'Unreachable'}
                </div>
            </div>
        </div>
    );
}