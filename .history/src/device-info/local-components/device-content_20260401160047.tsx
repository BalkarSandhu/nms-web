import DeviceInfoRow from "./device-info-row";
import { type DeviceInfoRowProps } from "./device-info-row";
import DeviceStatusBar from "./device-status-bar";
import { type DeviceStatusBarProps } from "./device-status-bar";
import { Server } from 'lucide-react';

interface DeviceContentProps {
    deviceData: DeviceInfoRowProps[];
    deviceStatusData: DeviceStatusBarProps[];
}

export default function DeviceContent(content: DeviceContentProps) {
    return (
        <div className="flex flex-col lg:flex-row w-full h-full gap-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            
            {/* LEFT SIDEBAR - Device Info */}
            <div className="flex flex-col w-full lg:w-[380px] lg:border-r border-b lg:border-b-0 border-gray-800/50 bg-gray-950/50 backdrop-blur-sm">
                
                {/* Sidebar Header */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-800/50">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Server className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-100">Device Details</h2>
                        <p className="text-xs text-gray-500">System Information</p>
                    </div>
                </div>

                {/* Info Rows Container */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                    {content.deviceData.map((item, key) => (
                        <DeviceInfoRow 
                            key={key} 
                            label={item.label} 
                            value={item.value}
                            icon={item.icon}
                            highlight={item.highlight}
                        />
                    ))}
                </div>

                {/* Sidebar Footer Divider */}
                <div className="hidden lg:block h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent mx-4"></div>
            </div>

            {/* RIGHT MAIN AREA - Status Events */}
            <div className="flex-1 flex flex-col min-w-0 px-4 py-4 lg:px-6">
                
                {/* Main Header */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-100 mb-1">Status Events</h2>
                    <p className="text-sm text-gray-500">Recent device activity and health status</p>
                </div>

                {/* Status Bars Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {content.deviceStatusData.length > 0 ? (
                        content.deviceStatusData.map((item, key) => (
                            <DeviceStatusBar 
                                key={key}
                                status={item.status}
                                is_reachable={item.is_reachable}
                                message={item.message}
                                timestamp={item.timestamp}
                            />
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                            <p className="text-sm">No status events available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}