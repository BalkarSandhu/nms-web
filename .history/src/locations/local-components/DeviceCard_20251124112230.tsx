import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Device Card Component
export function DeviceCard({ device }: { device: any; }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors">
            <div 
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{device.display}</p>
                    <p className="text-xs text-gray-600 truncate">{device.hostname}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${device.status
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'}`}>
                        {device.status ? 'Online' : 'Offline'}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="size-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="size-4 text-gray-500" />
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">IP:</span>
                        <span className="text-gray-900 font-mono">{device.ip}</span>
                    </div>
                    {/* <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Port:</span>
                        <span className="text-gray-900">{device.port}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Protocol:</span>
                        <span className="text-gray-900 uppercase">{device.protocol}</span>
                    </div> */}
                    {device.imei && (
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">IMEI:</span>
                            <span className="text-gray-900 font-mono text-[10px]">{device.imei}</span>
                        </div>
                    )}
                    {device.last_ping && (
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Last Updated:</span>
                            <span className="text-gray-900">{new Date(device.last_ping).toLocaleTimeString()}</span>
                        </div>
                    )}
                    {device.last_ping_time_taken !== undefined && (
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Response:</span>
                            <span className="text-gray-900">{device.last_ping_time_taken.toFixed(2)}ms</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
