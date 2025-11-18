import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Device Details Modal Component
export function DeviceDetailsSidebar({ deviceId, onClose }: { deviceId: number | null; onClose: () => void; }) {
    const { devices, deviceTypes } = useAppSelector(state => state.devices);
    const { locations } = useAppSelector(state => state.locations);
    const { workers } = useAppSelector(state => state.workers);
    
    const [expandedSections, setExpandedSections] = useState({
        deviceInfo: false,
        location: false,
        worker: false,
        lastPing: false,
        connectionHealth: false
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (!deviceId) {
        return null;
    }

    const device = devices.find(dev => dev.id === deviceId);
    if (!device) return null;

    const deviceType = deviceTypes.find(type => type.id === device.device_type_id);
    const location = locations.find(loc => loc.id === device.location_id);
    const worker = workers.find(w => w.id === (device as any).worker_id);

    const getStatusColor = (status: boolean) => {
        return status ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
    };

    return (
        <Dialog open={!!deviceId} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{device.display || device.hostname}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Status Badge */}
                    <div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(device.status)}`}>
                            <span className={`w-2 h-2 rounded-full mr-2 ${device.status ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {device.status ? 'Online' : 'Offline'}
                        </div>
                    </div>

                    {/* Device Information */}
                    <div className="border rounded-lg">
                        <div 
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleSection('deviceInfo')}
                        >
                            <h3 className="text-sm font-semibold text-gray-700">Device Information</h3>
                            {expandedSections.deviceInfo ? (
                                <ChevronUp className="size-4 text-gray-500" />
                            ) : (
                                <ChevronDown className="size-4 text-gray-500" />
                            )}
                        </div>
                        {expandedSections.deviceInfo && (
                            <div className="px-4 pb-4 space-y-3 border-t">
                                <InfoRow label="Device Type" value={deviceType?.name || 'Unknown'} />
                                <InfoRow label="Hostname" value={device.hostname || 'N/A'} />
                                <InfoRow label="IP Address" value={device.ip || 'N/A'} />
                                
                                <InfoRow label="Protocol" value={device.protocol || 'N/A'} />
                                {device.imei && <InfoRow label="IMEI" value={device.imei} />}
                                {(device as any).iccid && <InfoRow label="ICCID" value={(device as any).iccid} />}
                                {(device as any).model && <InfoRow label="Model" value={(device as any).model} />}
                                {(device as any).manufacturer && <InfoRow label="Manufacturer" value={(device as any).manufacturer} />}
                            </div>
                        )}
                    </div>

                    {/* Location Information */}
                    {location && (
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('location')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Location</h3>
                                {expandedSections.location ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.location && (
                                <div className="px-4 pb-4 border-t">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-sm font-medium text-blue-900">{location.name}</p>
                                        {(location as any).address && (
                                            <p className="text-xs text-blue-700 mt-1">{(location as any).address}</p>
                                        )}
                                        {(location as any).lat && (location as any).lng && (
                                            <p className="text-xs text-blue-600 mt-2">
                                                {(location as any).lat.toFixed(4)}, {(location as any).lng.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Worker Information */}
                    {worker && (
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('worker')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Assigned Worker</h3>
                                {expandedSections.worker ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.worker && (
                                <div className="px-4 pb-4 border-t">
                                    <div className="bg-purple-50 rounded-lg p-3">
                                        <p className="text-sm font-medium text-purple-900">{worker.hostname}</p>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs text-purple-700">IP: {worker.ip_address || 'N/A'}</p>
                                            <p className="text-xs text-purple-700">Status: {worker.status || 'N/A'}</p>
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${worker.approval_status === 'approved' ? 'bg-green-100 text-green-700' : worker.approval_status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {worker.approval_status === 'approved' ? 'Approved' : worker.approval_status === 'denied' ? 'Denied' : 'Pending'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Last Ping Information */}
                    {device.last_ping && (
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('lastPing')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Last Ping</h3>
                                {expandedSections.lastPing ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.lastPing && (
                                <div className="px-4 pb-4 border-t">
                                    <div className="space-y-2">
                                        <InfoRow 
                                            label="Timestamp" 
                                            value={new Date(device.last_ping).toLocaleString()} 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Connection Failures */}
                    {device.consecutive_failures !== undefined && (
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('connectionHealth')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Connection Health</h3>
                                {expandedSections.connectionHealth ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.connectionHealth && (
                                <div className="px-4 pb-4 border-t">
                                    <div className={`rounded-lg p-3 ${device.consecutive_failures > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                                        <p className="text-xs text-gray-600">Consecutive Failures</p>
                                        <p className={`text-2xl font-bold ${device.consecutive_failures > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                                            {device.consecutive_failures}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper component for info rows
function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start">
            <span className="text-xs text-gray-500 font-medium">{label}:</span>
            <span className="text-xs text-gray-900 text-right max-w-[60%] wrap-break-word">{value}</span>
        </div>
    );
}
