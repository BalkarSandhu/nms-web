import Metric1 from "./Metric-1";
import Metric2 from "./Metric-2";
import Metric3 from "./Metric-3";
import MetricMapSwitcher from "./Metric-Map-Switcher";
import { MapViewerExample } from "./Map-Viewer-Example";

import "@/index.css"


export type MetricsProps = {
    metricState?: boolean;
    setMetricState?: (state: boolean) => void;
    metricsData?:any;
}
export default function Metrics({ metricState, setMetricState, metricsData }: MetricsProps) {

    return (
        <div className="gap-2 flex flex-row p-0 h-full w-full justify-center items-center">
            {!metricState ? (
                <div className="w-full h-full max-h-[165px] flex flex-row gap-2 justify-center items-center overflow-hidden">
                    <Metric1
                        {...metricsData.metric1}
                    />
                    <Metric2 />
                    <Metric3 />
                </div>
            ) : (
                <div className="w-full bg-(--dark) rounded-[10px] h-full min-h-[500px]">
                    <MapViewerExample />
                </div>
            )
            }

            <MetricMapSwitcher state={metricState} state_changer={setMetricState} />
        </div>
    );
}