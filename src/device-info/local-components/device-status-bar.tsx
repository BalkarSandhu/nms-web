import { cn } from "@/lib/utils";

export type DeviceStatusBarProps = {
    status: 1|0|2;
    message:string;
    timestamp:string;
    is_reachable:boolean
}

export default function DeviceStatusBar({ status, message, timestamp,is_reachable }: DeviceStatusBarProps)
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
            <span className="text-[12px]">is_reachable: {is_reachable ? 'true' : 'false'}</span>
        </div>
    );
}