import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { DeviceCard } from './DeviceCard';
import { SquarePen, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DeleteLocationForm } from './DeleteLocationForm';
import { EditLocationForm } from './EditLocationForm';

// Location Details Dialog Component
export function LocationDetailsSidebar({ locationId, onClose }: { locationId: number | null; onClose: () => void; }) {
    const { devices } = useAppSelector(state => state.devices);
    const { locations } = useAppSelector(state => state.locations);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    if (!locationId) {
        return null;
    }

    const location = locations.find(loc => loc.id === locationId);
    if (!location) return null;

    const locationDevices = devices.filter(device => device.location_id === location.id);
    const onlineDevices = locationDevices.filter(d => d.status === true);
    const offlineDevices = locationDevices.filter(d => d.status === false);

    return (
        <>
            <Dialog open={!!locationId} onOpenChange={onClose}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>{location.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Devices Summary Card */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                Devices Summary ({locationDevices.length} total)
                            </h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
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

                        {/* Devices List */}
                        <div className="border rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">All Devices</h3>
                            {locationDevices.length === 0 ? (
                                <p className="text-xs text-gray-500 text-center py-8">No devices at this location</p>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {locationDevices.map(device => (
                                        <DeviceCard key={device.id} device={device} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between gap-3 mt-6">
                    <button
                        className="w-full bg-blue-600 text-white py-2 rounded-md text-sm hover:bg-blue-700"
                        onClick={() => setEditOpen(true)}
                    >
                        Edit location
                    </button>

                    <button
                        className="w-full bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-700"
                        onClick={() => setDeleteOpen(true)}
                    >
                        Delete Loction
                    </button>
                </div>
                </DialogContent>
            </Dialog>

            {/* Delete Location Form */}
            <DeleteLocationForm
                locationId={locationId}
                open={deleteOpen}
                setOpen={setDeleteOpen}
            />

            {/* Edit Location Form */}
            <EditLocationForm
                locationId={locationId}
                open={editOpen}
                setOpen={setEditOpen}
            />
        </>
    );
}
