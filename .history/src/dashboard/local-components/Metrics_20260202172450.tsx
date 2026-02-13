import Metric1 from "./Metric-1";
import Metric2 from "./Metric-2";
import Metric3 from "./Metric-3";
import MetricGeneral from "./Metric-4";
import MetricMapSwitcher from "./Metric-Map-Switcher";
import { MapViewer } from "./Map-Viewer";
import type { MapDataPoint } from "./Map-Viewer";
import { useLocation } from "react-router-dom";


import "@/index.css";


export type MetricsProps = {
    metricState?: boolean;
    setMetricState?: (state: boolean) => void;
    metricsData?: any;
    mapData?: MapDataPoint[]; // Real map data from Redux
}

export default function Metrics({ metricState, setMetricState, metricsData, mapData = [] }: MetricsProps) {

    // navigation is handled inside MetricGeneral; parent no longer navigates here
    const handlePointClick = (point: MapDataPoint) => {
        console.log('Clicked point:', point);
    };

    // const handleMetricItemClick = (item: { label: string; value: number }) => {
    //     console.log('Clicked metric item:', item);
        
    //     navigate(`/devices?type=${encodeURIComponent(item.label)}`);
    // };

    const location = useLocation();

    const handleLocationMetricItemClick = (item: { label: string; value: number }) => {
        // parent only receives the click for analytics or side-effects
        console.log('Metric item clicked (parent handler):', item, 'currentPath:', location.pathname);
    };

    return (
        <div className="gap-2 flex flex-row p-0 h-full w-full justify-center items-center">
            {!metricState ? (
                <div className="w-full h-full max-h-[165px] flex flex-row gap-2 justify-center items-center overflow-hidden">
                    {metricsData?.metric1 && (
                        <Metric1
                            {...metricsData.metric1}
                        />
                    )}
                    {metricsData?.metric4 && (
                        <MetricGeneral
                            title={metricsData.metric4Title || "Summary by Type"}
                            data={metricsData.metric4}
                            onItemClick={handleLocationMetricItemClick}
                        />
                    )}
                    {metricsData?.metric2 && (
                        <Metric2 {...metricsData.metric2} />
                    )}
                    {metricsData?.metric3 && (
                        <Metric3  />
                    )}
                    
                </div>
            ) : (
                <div className="w-full bg-(--dark) h-full rounded-xl min-h-[300px] w-max-[80vw] overflow-hidden">
                    <MapViewer
                        data={mapData}
                        centerCoordinates={[78.9629, 20.5937]} // Center of India
                        zoom={4}
                        showLabels={false}
                        pointSize={12}
                        enableZoom={true}
                        enablePan={true}
                        onPointClick={handlePointClick}
                        className=""
                        bounds={{
                            minLongitude: 68.1766,
                            maxLongitude: 97.4025,
                            minLatitude: 8.4,
                            maxLatitude: 37.6
                        }}
                        heatmapZoomThreshold={6}
                        pointsZoomThreshold={6}
                        mapFlavor="dark"
                    />
                </div>
            )}

            <MetricMapSwitcher state={metricState} state_changer={setMetricState} />
        </div>
    );
}