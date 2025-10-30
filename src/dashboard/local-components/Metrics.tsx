import Metric1 from "./Metric-1";
import Metric2 from "./Metric-2";
import Metric3 from "./Metric-3";
import MetricMapSwitcher from "./Metric-Map-Switcher";

import "@/index.css"


export type MetricsProps = {
    metricState?: boolean;
    setMetricState?: (state: boolean) => void;
}
export default function Metrics({ metricState, setMetricState }: MetricsProps) {

    return (
        <div className="gap-2 flex flex-row p-0 h-full w-full justify-center items-center">
            {!metricState ? (<div className="w-full h-full flex flex-row gap-2 justify-center items-center">
                <Metric1
                    // data={{ value: 45, name: "CPU Usage" }}
                    // title="CPU Utilization"
                    // max={100} 
                    />
                <Metric2 />
                <Metric3 />
            </div>
            ) : (
                <div className=" w-full bg-(--dark) rounded-[10px] h-full"></div>
            )
            }

            <MetricMapSwitcher state={metricState} state_changer={setMetricState} />
        </div>
    );
}