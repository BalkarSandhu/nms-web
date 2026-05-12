import Metric1 from "./Metric-1";
import LiveTopologyCard from "./LiveTopologyCard";
import type { LiveTopologyArea } from "./LiveTopologyCard";
import NetworkTrendCard from "./NetworkTrendCard";
import DeviceReliabilityCard from "./DeviceReliabilityCard";
import MetricMapSwitcher from "./Metric-Map-Switcher";
import { MapViewer } from "./Map-Viewer";
import type { MapDataPoint } from "./Map-Viewer";

import "@/index.css";

interface DeviceForReliability {
    id: number;
    is_reachable?: boolean;
    consecutive_failures?: number;
}

export type SectionMetricsBundle = {
    metric1?: any;
    liveTopology?: {
        areas: LiveTopologyArea[];
        totalDevices: number;
        onlineDevices: number;
    };
    trend?: {
        title?: React.ReactNode;
        total: number;
        online: number;
        offline: number;
        partial?: number;
    };
    reliability?: {
        devices: DeviceForReliability[];
    };
    /** legacy metric fields kept so existing sections still render if passed */
    metric2?: any;
    metric3?: any;
    metric4?: any;
};

export type MetricsProps = {
    metricState?: boolean;
    setMetricState?: (state: boolean) => void;
    metricsData?: SectionMetricsBundle;
    mapData?: MapDataPoint[];
};

export default function Metrics({ metricState, setMetricState, metricsData, mapData = [] }: MetricsProps) {
    const handlePointClick = (point: MapDataPoint) => {
        console.log('Clicked point:', point);
    };

    return (
        <div className="gap-2 flex flex-row p-0 h-full w-full justify-center items-center">
            {!metricState ? (
                <div className="w-full h-full max-h-[165px] flex flex-row gap-2 justify-center items-center overflow-hidden">
                    {metricsData?.metric1 && (
                        <Metric1 {...metricsData.metric1} />
                    )}
                    {metricsData?.reliability && (
                        <DeviceReliabilityCard devices={metricsData.reliability.devices} />
                    )}
                    {metricsData?.trend && (
                        <NetworkTrendCard {...metricsData.trend} />
                    )}
                    {metricsData?.liveTopology && (
                        <LiveTopologyCard
                            areas={metricsData.liveTopology.areas}
                            totalDevices={metricsData.liveTopology.totalDevices}
                            onlineDevices={metricsData.liveTopology.onlineDevices}
                        />
                    )}
                </div>
            ) : (
                <div className="w-full bg-(--dark) h-full rounded-xl min-h-[300px] w-max-[80vw] overflow-hidden">
                    <MapViewer
                        data={mapData}
                        centerCoordinates={[78.9629, 20.5937]}
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
                            maxLatitude: 37.6,
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
