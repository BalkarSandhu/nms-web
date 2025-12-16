import { cn } from "@/lib/utils";

export type DeviceStatusBarProps = {
    is_reachable: 1|0|2;
    message:string;
    timestamp:string;
}

export default function DeviceStatusBar({ is_reachable, message, timestamp }: DeviceStatusBarProps)
 {
    const statusColors = {
        1: 'bg-linear-to-r from-(--green) to-(--green)/70 text-(--contrast)',
        0: 'bg-linear-to-r from-(--red) to-(--red)/70 text-(--contrast)',
        2: 'bg-(--azul)/50 text-(--contrast)',
    };


    return(
        <div className={cn("flex items-center gap-4 px-4 max-h-[30px] rounded-md w-full py-2", statusColors[status])}>
            <span className="text-[12px] capitalize">{message}</span>
            <span className="text-[12px]">{timestamp}</span>  
        </div>
    );
}