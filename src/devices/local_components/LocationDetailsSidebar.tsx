import { useAppSelector } from '@/store/hooks';
import { DeviceCard } from '@/devices/local_components/DeviceCard';

// Location Details Sidebar Component
export function LocationDetailsSidebar({ locationId, onClose }: { locationId: number | null; onClose: () => void; }) {
    const { devices } = useAppSelector(state => state.devices);
    const { locations } = useAppSelector(state => state.locations);

    if (!locationId) {
        return (
            <div className="md:flex md:flex-col hidden md:w-[280px] border-l-2 border-(--base)/20 p-4">
                <p className="text-gray-500 text-sm text-center mt-8">Select a location to view details</p>
            </div>
        );
    }

    const location = locations.find(loc => loc.id === locationId);
    if (!location) return null;

    const locationDevices = devices.filter(device => device.location_id === location.id);
    const onlineDevices = locationDevices.filter(d => d.status === true);
    const offlineDevices = locationDevices.filter(d => d.status === false);

    return (
        <div className="md:flex md:flex-col hidden md:w-[320px] border-l-2 border-(--base)/20 bg-white overflow-y-scroll">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{location.name}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                        aria-label="Close sidebar"
                    >
                        ×
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Devices at this location</p>
            </div>

            {/* Devices Summary Card */}
            <div className="p-4 border-b border-gray-100">
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
            <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">All Devices</h3>
                {locationDevices.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-8">No devices at this location</p>
                ) : (
                    <div className="space-y-2">
                        {locationDevices.map(device => (
                            <DeviceCard key={device.id} device={device} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
