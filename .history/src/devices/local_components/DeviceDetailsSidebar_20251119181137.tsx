import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DeleteDeviceForm } from './DeleteDeviceForm';
import { EditDeviceForm } from './EditDeviceForm';

// Device Details Modal Component
export function DeviceDetailsSidebar({ deviceId, onClose }: { deviceId: number | null; onClose: () => void; }) {
    const { devices, deviceTypes } = useAppSelector(state => state.devices);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

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
        <>
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
                            <div className="px-4 pb-4 space-y-3 bg-green-50 rounded-lg-3 border-t text-sm font-medium">
                                <InfoRow label="Device Type" value={deviceType?.name || 'Unknown'} />
                                <InfoRow label="Hostname" value={device.hostname || 'N/A'} />
                                <InfoRow label="Location Name" value={location.name || 'Unknown'} />
                                <InfoRow label="Lattitude" value={location.lat || 'N/A'} />
                                <InfoRow label="Longitude " value={location.lng || 'N/A'} />
                                <InfoRow label="Area" value={worker.hostname || 'Unknown'} />    
                                <InfoRow label="Status " value={worker.status || 'N/A'} />
                                <InfoRow 
                                        label="Timestamp" 
                                        value={new Date(device.last_ping).toLocaleString()} 
                                    />
                                
                                {device.imei && <InfoRow label="IMEI" value={device.imei} />}
                                {(device as any).iccid && <InfoRow label="ICCID" value={(device as any).iccid} />}
                                {(device as any).model && <InfoRow label="Model" value={(device as any).model} />}
                                {(device as any).manufacturer && <InfoRow label="Manufacturer" value={(device as any).manufacturer} />}
                            </div>
                        )}
                    </div>

                    
                    

                
                    
                </div>

                {/* ⭐ Action Buttons */}
                <div className="flex justify-between gap-3 mt-6">
                    <button
                        className="w-full bg-(--azul)/70 text-white py-2 rounded-md text-sm hover:bg-(--azul)/90"
                        onClick={() => setEditOpen(true)}
                    >
                        Edit Device
                    </button>

                    <button
                        className="w-full bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-700"
                        onClick={() => setDeleteOpen(true)}
                    >
                        Delete Device
                    </button>
                </div>

            </DialogContent>
        </Dialog>

        <DeleteDeviceForm
            deviceId={deviceId}
            open={deleteOpen}
            setOpen={setDeleteOpen}
        />

        <EditDeviceForm
            deviceId={deviceId}
            open={editOpen}
            setOpen={setEditOpen}
        />
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
