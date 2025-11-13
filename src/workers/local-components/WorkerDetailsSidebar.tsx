import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { DeviceCard } from '@/locations/local-components/DeviceCard';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Worker Details Sidebar Component
export function WorkerDetailsSidebar({ workerId, onClose }: { workerId: string | null; onClose: () => void; }) {
    const { workers } = useAppSelector(state => state.workers);
    const { devices } = useAppSelector(state => state.devices);

    const [expandedSections, setExpandedSections] = useState({
        workerInfo: false,
        capabilities: false,
        utilization: false,
        devicesSummary: false,
        assignedDevices: false
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (!workerId) {
        return (
            <div className="md:flex md:flex-col hidden md:w-[280px] border-l-2 border-(--base)/20 p-4">
                <p className="text-gray-500 text-sm text-center mt-8">Select a worker to view details</p>
            </div>
        );
    }

    const worker = workers.find(w => w.id === workerId);
    if (!worker) return null;

    const workerDevices = devices.filter(device => (device as any).worker_id === workerId);
    const onlineDevices = workerDevices.filter(d => d.status === true);
    const offlineDevices = workerDevices.filter(d => d.status === false);

    const utilizationPercent = worker.max_devices > 0 
        ? Math.round((workerDevices.length / worker.max_devices) * 100)
        : 0;

    const getApprovalColor = (status: string) => {
        if (status === 'approved') return 'bg-green-50 text-green-700';
        if (status === 'denied') return 'bg-red-50 text-red-700';
        return 'bg-yellow-50 text-yellow-700';
    };

    const getUtilizationColor = (percent: number) => {
        if (percent >= 90) return 'text-red-600';
        if (percent >= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <div className="md:flex md:flex-col hidden md:w-2/10 border-l-2 border-(--base)/20 bg-white overflow-y-scroll">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{worker.hostname}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                        aria-label="Close sidebar"
                    >
                        ×
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Worker Details</p>
            </div>

            {/* Status and Approval Badge */}
            <div className="p-4 border-b border-gray-100 space-y-2">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getApprovalColor(worker.approval_status)}`}>
                    {worker.approval_status.charAt(0).toUpperCase() + worker.approval_status.slice(1)}
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ml-2 ${worker.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${worker.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}`}></span>
                    {worker.status.charAt(0).toUpperCase() + worker.status.slice(1)}
                </div>
            </div>

            {/* Worker Information */}
            <div className="border-b border-gray-100">
                <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                    onClick={() => toggleSection('workerInfo')}
                >
                    <h3 className="text-sm font-semibold text-gray-700">Worker Information</h3>
                    {expandedSections.workerInfo ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </div>
                {expandedSections.workerInfo && (
                    <div className="px-4 pb-4">
                        <div className="space-y-3">
                            <InfoRow label="IP Address" value={worker.ip_address || 'N/A'} />
                            <InfoRow label="Version" value={worker.version || 'N/A'} />
                            <InfoRow label="Max Devices" value={worker.max_devices.toString()} />
                            <InfoRow label="Last Seen" value={worker.last_seen ? new Date(worker.last_seen).toLocaleString() : 'Never'} />
                            {worker.registered_at && (
                                <InfoRow label="Registered" value={new Date(worker.registered_at).toLocaleString()} />
                            )}
                            {worker.approved_at && (
                                <InfoRow label="Approved" value={new Date(worker.approved_at).toLocaleString()} />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Capabilities */}
            {worker.capabilities && worker.capabilities.length > 0 && (
                <div className="border-b border-gray-100">
                    <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                        onClick={() => toggleSection('capabilities')}
                    >
                        <h3 className="text-sm font-semibold text-gray-700">Capabilities</h3>
                        {expandedSections.capabilities ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                    </div>
                    {expandedSections.capabilities && (
                        <div className="px-4 pb-4">
                            <div className="flex flex-wrap gap-1">
                                {worker.capabilities.map((cap, index) => (
                                    <span 
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                                    >
                                        {cap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Utilization Card */}
            <div className="border-b border-gray-100">
                <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                    onClick={() => toggleSection('utilization')}
                >
                    <h3 className="text-sm font-semibold text-gray-700">Device Utilization</h3>
                    {expandedSections.utilization ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </div>
                {expandedSections.utilization && (
                    <div className="px-4 pb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Current Load</span>
                                <span className={`text-2xl font-bold ${getUtilizationColor(utilizationPercent)}`}>
                                    {utilizationPercent}%
                                </span>
                            </div>
                            <div className="text-xs text-gray-500">
                                {workerDevices.length} of {worker.max_devices} devices
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                    className={`h-2 rounded-full ${utilizationPercent >= 90 ? 'bg-red-600' : utilizationPercent >= 70 ? 'bg-yellow-600' : 'bg-green-600'}`}
                                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Devices Summary Card */}
            <div className="border-b border-gray-100">
                <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                    onClick={() => toggleSection('devicesSummary')}
                >
                    <h3 className="text-sm font-semibold text-gray-700">
                        Devices Summary ({workerDevices.length} total)
                    </h3>
                    {expandedSections.devicesSummary ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </div>
                {expandedSections.devicesSummary && (
                    <div className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-xs text-green-600 font-medium mb-1">Online</p>
                                <p className="text-3xl font-bold text-green-700">{onlineDevices.length}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-xs text-red-600 font-medium mb-1">Offline</p>
                                <p className="text-3xl font-bold text-red-700">{offlineDevices.length}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Devices List */}
            <div className="flex-1 overflow-y-auto">
                <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center sticky top-0 bg-white border-b border-gray-100"
                    onClick={() => toggleSection('assignedDevices')}
                >
                    <h3 className="text-sm font-semibold text-gray-700">Assigned Devices</h3>
                    {expandedSections.assignedDevices ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </div>
                {expandedSections.assignedDevices && (
                    <div className="p-4">
                        {workerDevices.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-8">No devices assigned to this worker</p>
                        ) : (
                            <div className="space-y-2">
                                {workerDevices.map(device => (
                                    <DeviceCard key={device.id} device={device} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
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
