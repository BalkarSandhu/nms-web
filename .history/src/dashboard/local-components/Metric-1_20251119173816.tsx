import BaseCard from "./Base-Card";
import "@/index.css";
import { useMemo } from "react";
import { useEnrichedDevices } from "../../devices/local_components/table";
import { useNavigate } from "react-router-dom";

import { MenuGroupType } from "./Base-Card";

export interface Metric1Props {
    title?: string;
    className?: string;
    menuGroups?: MenuGroupType[];
    onStatusClick?: (status: 'online' | 'offline' | 'unknown') => void;
}

export default function Metric1({ 
    title = "Device Status Overview",
    className = "",
    menuGroups,
    onStatusClick
}: Metric1Props) {
    const navigate = useNavigate();
    const enrichedDevices = useEnrichedDevices();

    // Calculate real device status data
    const deviceStatusData = useMemo(() => {
        const online = enrichedDevices.filter((d) => d.status && !d.disabled).length;
        const offline = enrichedDevices.filter((d) => !d.status && !d.disabled).length;
        const disabled = enrichedDevices.filter((d) => d.disabled).length;
        const total = enrichedDevices.length;

        return {
            online,
            offline,
            disabled,
            total,
            onlinePercent: total > 0 ? Math.round((online / total) * 100) : 0,
            offlinePercent: total > 0 ? Math.round((offline / total) * 100) : 0,
            disabledPercent: total > 0 ? Math.round((disabled / total) * 100) : 0
        };
    }, [enrichedDevices]);

    const resolvedMenuGroups = menuGroups ?? [
        {
            items: [
                {
                    type: "item" as const,
                    label: "Refresh metrics",
                    onClick: () => console.log("Refresh metrics"),
                },
                {
                    type: "item" as const,
                    label: "Export CSV",
                    onClick: () => console.log("Export CSV"),
                },
                {
                    type: "item" as const,
                    label: "View details",
                    onClick: () => console.log("View metric details"),
                },
            ],
        },
    ];

    // Handle status navigation
    const handleStatusClick = (status: 'online' | 'offline' | 'disabled') => {
        onStatusClick?.(status as any);
        navigate(`/devices?status=${status === 'disabled' ? 'Offline' : status.charAt(0).toUpperCase() + status.slice(1)}`);
    };

    return (
        <BaseCard title={title} menuGroups={resolvedMenuGroups} className={className}>
            <div className="w-full h-full flex flex-col justify-center px-6 py-8">
                {/* Main Stats Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Online Status */}
                    <button
                        onClick={() => handleStatusClick('online')}
                        className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-green-500 hover:bg-green-50 transition-all duration-200 group"
                    >
                        <div className="text-sm font-semibold text-green-700 mb-2 uppercase tracking-wide">
                            Online Devices
                        </div>
                        <div className="text-5xl font-bold text-green-600 mb-2">
                            {deviceStatusData.online}
                        </div>
                        <div className="text-lg text-green-600 font-semibold mb-2">
                            {deviceStatusData.onlinePercent}%
                        </div>
                        <div className="text-xs text-gray-500 mb-3">of total devices</div>
                        <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view details →
                        </div>
                    </button>

                    {/* Offline Status */}
                    <button
                        onClick={() => handleStatusClick('offline')}
                        className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-red-500 hover:bg-red-50 transition-all duration-200 group"
                    >
                        <div className="text-sm font-semibold text-red-700 mb-2 uppercase tracking-wide">
                            Offline Devices
                        </div>
                        <div className="text-5xl font-bold text-red-600 mb-2">
                            {deviceStatusData.offline}
                        </div>
                        <div className="text-lg text-red-600 font-semibold mb-2">
                            {deviceStatusData.offlinePercent}%
                        </div>
                        <div className="text-xs text-gray-500 mb-3">of total devices</div>
                        <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view details →
                        </div>
                    </button>

                    {/* Disabled Status */}
                    <button
                        onClick={() => handleStatusClick('disabled')}
                        className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-gray-400 hover:bg-gray-100 transition-all duration-200 group"
                    >
                        <div className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                            Disabled Devices
                        </div>
                        <div className="text-5xl font-bold text-gray-600 mb-2">
                            {deviceStatusData.disabled}
                        </div>
                        <div className="text-lg text-gray-600 font-semibold mb-2">
                            {deviceStatusData.disabledPercent}%
                        </div>
                        <div className="text-xs text-gray-500 mb-3">of total devices</div>
                        <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view details →
                        </div>
                    </button>

                    {/* Total Devices */}
                    <div className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-blue-500 bg-blue-50">
                        <div className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                            Total Devices
                        </div>
                        <div className="text-5xl font-bold text-blue-600 mb-2">
                            {deviceStatusData.total}
                        </div>
                        <div className="text-lg text-blue-600 font-semibold mb-2">
                            100%
                        </div>
                        <div className="text-xs text-gray-500">all devices</div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            <span className="font-semibold text-gray-800">System Health:</span>
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                                <span className="text-sm text-gray-700">
                                    <span className="font-semibold">{deviceStatusData.onlinePercent}%</span> operational
                                </span>
                            </div>
                            <div className="text-gray-400">•</div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                <span className="text-sm text-gray-700">
                                    <span className="font-semibold">{deviceStatusData.offlinePercent}%</span> not responding
                                </span>
                            </div>
                            <div className="text-gray-400">•</div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                <span className="text-sm text-gray-700">
                                    <span className="font-semibold">{deviceStatusData.disabledPercent}%</span> disabled
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}