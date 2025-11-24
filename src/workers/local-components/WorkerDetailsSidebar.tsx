import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { DeviceCard } from '@/locations/local-components/DeviceCard';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fetchWorkers } from '@/store/workerSlice';
import { fetchWorkerStats } from '@/store/workerSlice';
import { getAuthHeaders } from '@/lib/auth';

// Worker Details Dialog Component
export function WorkerDetailsSidebar({ workerId, onClose }: { workerId: string | null; onClose: () => void; }) {
    const { workers } = useAppSelector(state => state.workers);
    const { devices } = useAppSelector(state => state.devices);
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showApprovalForm, setShowApprovalForm] = useState(false);
    const [approvedBy, setApprovedBy] = useState('');
    const [approvalError, setApprovalError] = useState<string | null>(null);

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
        return null;
    }

    const worker = workers.find(w => w.id === workerId);
    if (!worker) return null;

    const workerDevices = devices.filter(device => device.worker_id === workerId);
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

    const handleApprove = () => {
        setShowApprovalForm(true);
        setApprovalError(null);
        setApprovedBy('');
    };

    const handleSubmitApproval = async () => {
        if (!approvedBy.trim()) {
            setApprovalError('Please enter the name of who is approving');
            return;
        }

        setIsLoading(true);
        setApprovalError(null);
        try {
            const apiUrl = `${import.meta.env.VITE_NMS_HOST}/workers/${workerId}/approve`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers:getAuthHeaders(),
                body: JSON.stringify({
                    approval_status: 'approved',
                    approved_by: approvedBy
                })
            });

            if (!response.ok) {
                throw new Error('Failed to approve worker');
            }

            setStatusMessage({ message: 'Worker approved successfully!', type: 'success' });
            setShowApprovalForm(false);
            
            // Refresh workers data
            dispatch(fetchWorkers({}));
            dispatch(fetchWorkerStats());
            
            setTimeout(() => {
                onClose();
                setStatusMessage(null);
            }, 1500);
        } catch (error: any) {
            setApprovalError(error.message || 'Failed to approve worker');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeny = async () => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
            const apiUrl = `${import.meta.env.VITE_NMS_HOST}/workers/${workerId}/deny`;
            const token = import.meta.env.VITE_AUTH_BEARER_TOKEN;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to deny worker');
            }

            setStatusMessage({ message: 'Worker denied successfully!', type: 'success' });
            
            // Refresh workers data
            dispatch(fetchWorkers({}));
            dispatch(fetchWorkerStats());
            
            setTimeout(() => {
                onClose();
                setStatusMessage(null);
            }, 1500);
        } catch (error: any) {
            setStatusMessage({ message: error.message || 'Failed to deny worker', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Dialog open={!!workerId} onOpenChange={onClose}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>{worker.hostname}</DialogTitle>
                        <div className="flex gap-2">
                            {worker.approval_status === 'pending' && (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isLoading}
                                        className="flex items-center justify-center p-2 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                        aria-label="Approve worker"
                                    >
                                        <Check className="size-4 text-green-600" />
                                    </button>
                                    <button
                                        onClick={handleDeny}
                                        disabled={isLoading}
                                        className="flex items-center justify-center p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                        aria-label="Deny worker"
                                    >
                                        <X className="size-4 text-red-600" />
                                    </button>
                                </>
                            )}
                        </div>
                    </DialogHeader>

                    {statusMessage && (
                        <div className={`p-3 rounded-lg text-sm ${
                            statusMessage.type === 'success' 
                                ? 'bg-green-50 text-green-800 border border-green-200' 
                                : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                            {statusMessage.message}
                        </div>
                    )}

                    <div className="space-y-4">
                        
                        <div className="space-y-2">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getApprovalColor(worker.approval_status)}`}>
                                {worker.approval_status.charAt(0).toUpperCase() + worker.approval_status.slice(1)}
                            </div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ml-2 ${worker.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                                <span className={`w-2 h-2 rounded-full mr-2 ${worker.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}`}></span>
                                {worker.status.charAt(0).toUpperCase() + worker.status.slice(1)}
                            </div>
                        </div>

                        {/* Worker Information */}
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('workerInfo')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Worker Information</h3>
                                {expandedSections.workerInfo ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.workerInfo && (
                                <div className="px-4 pb-4 border-t">
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
                            <div className="border rounded-lg">
                                <div 
                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                    onClick={() => toggleSection('capabilities')}
                                >
                                    <h3 className="text-sm font-semibold text-gray-700">Capabilities</h3>
                                    {expandedSections.capabilities ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                </div>
                                {expandedSections.capabilities && (
                                    <div className="px-4 pb-4 border-t">
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
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('utilization')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Device Utilization</h3>
                                {expandedSections.utilization ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.utilization && (
                                <div className="px-4 pb-4 border-t">
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
                        <div className="border rounded-lg">
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
                                <div className="px-4 pb-4 border-t">
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
                        <div className="border rounded-lg">
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                onClick={() => toggleSection('assignedDevices')}
                            >
                                <h3 className="text-sm font-semibold text-gray-700">Assigned Devices</h3>
                                {expandedSections.assignedDevices ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                            {expandedSections.assignedDevices && (
                                <div className=" metric-scroll px-4 pb-4 border-t max-h-96 overflow-y-auto">
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
                </DialogContent>
            </Dialog>

            {/* Approval Form Modal */}
            <Dialog open={showApprovalForm} onOpenChange={setShowApprovalForm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Approve Worker</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {approvalError && (
                            <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                                {approvalError}
                            </div>
                        )}

                        <div>
                            <Label htmlFor="approval-status" className="text-sm font-medium text-gray-700">
                                Approval Status
                            </Label>
                            <Input
                                id="approval-status"
                                type="text"
                                value="approved"
                                disabled
                                className="mt-1 bg-gray-100"
                            />
                        </div>

                        <div>
                            <Label htmlFor="approved-by" className="text-sm font-medium text-gray-700">
                                Approved By
                            </Label>
                            <Input
                                id="approved-by"
                                type="text"
                                placeholder="Enter name"
                                value={approvedBy}
                                onChange={(e) => setApprovedBy(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button
                                onClick={() => setShowApprovalForm(false)}
                                variant="outline"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmitApproval}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isLoading ? 'Approving...' : 'Approve'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Worker Form - will be implemented */}
            {/* <DeleteWorkerForm
                workerId={workerId}
                open={deleteOpen}
                setOpen={setDeleteOpen}
            /> */}

            {/* Edit Worker Form - will be implemented */}
            {/* <EditWorkerForm
                workerId={workerId}
                open={editOpen}
                setOpen={setEditOpen}
            /> */}
        </>
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
