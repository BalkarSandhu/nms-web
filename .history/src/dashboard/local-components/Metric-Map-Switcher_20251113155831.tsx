import { Separator } from "@/components/ui/separator";
import { Map } from "lucide-react";
import { ChartPie } from "lucide-react";
import "@/index.css"


export type MetricMapSwitcherProps = {
    state?: boolean;
    state_changer?: (state: boolean) => void;
}

export default function MetricMapSwitcher({ state, state_changer }: MetricMapSwitcherProps) {
    return (
        <div className="w-25 h-10 md:w-8 md:h-17 flex flex-row md:flex-col bg-dark gap-0 \
                          justify-center items-center bg-(--dark) rounded-[4px]">
            <button
                onClick={() => state_changer?.(false)}
                className={`${!state ? 'bg-(--contrast)' : 'bg-none '}  w-full h-full rounded-t-[4px] \
                flex items-center justify-center transition-all transition-normal`}>
                <ChartPie className={`${!state ? 'text-(--base)' : 'text-(--contrast)'} \
                    size-4 transition-colors`} />
            </button>
            <Separator className="mx-1" />
            <button 
                onClick={() => state_changer?.(true)} 
                className={`${state ? 'bg-(--contrast)' : 'bg-none '} w-full h-full rounded-b-[4px] \
                flex items-center justify-center transition-all transition-normal`}>
                <Map className={`${state ? 'text-(--base)' : 'text-(--contrast)'} size-4`} />
            </button>
        </div>
    )
}