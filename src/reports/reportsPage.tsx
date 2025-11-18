import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAllDevices } from "@/store/deviceSlice";


import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ReportsPage() {
  const dispatch = useAppDispatch();

   type EnrichedDevice = {
    id: number;
    hostname: string;
    ip: string;
    port: number;
    display: string;
    status: boolean;
    protocol: string;
    device_type_id: number;
    location_id: number;
    worker_id: string;
    imei: string;
    last_ping: string;
    last_ping_time_taken: number;
    consecutive_failures: number;
    check_interval: number;
    timeout: number;
    disabled: boolean;
    created_at: string;
    updated_at: string;
    status_reason: string;
    // Enriched fields
    device_type_name: string; // from DeviceType
    location_name?: string; // from Location
    worker_hostname?: string; // from Worker
};
 const useEnrichedDevices = (): EnrichedDevice[] => {
      const { devices, deviceTypes } = useAppSelector(state => state.devices);
      const { locations } = useAppSelector(state => state.locations);
      const { workers } = useAppSelector(state => state.workers);
  
      return useMemo(() => {
          return devices.map((device) => {
              // Find device type name
              const deviceType = deviceTypes.find(dt => dt.id === device.device_type_id);
              const device_type_name = deviceType?.name || 'Unknown';
  
              // Find location name
              const location = locations.find(l => l.id === device.location_id);
              const location_name = location?.name;
  
              // Find worker hostname
              const worker_id = (device as any).worker_id || '';
              const worker = workers.find(w => w.id === worker_id);
              const worker_hostname = worker?.hostname;
  
              return {
                  ...device,
                  worker_id,
                  device_type_name,
                  location_name,
                  worker_hostname,
              };
          });
      }, [devices, deviceTypes, locations, workers]);
  };
  // Load devices on page open
  const { loading, error } = useAppSelector((state) => state.devices);

  useEffect(() => {
    console.log("📡 Fetching devices for Reports...");
    dispatch(fetchAllDevices());
  }, [dispatch]);

  // Get enriched devices (same data used in DevicesTable)
  const devices = useEnrichedDevices();

  // Build chart data
  const chartData = useMemo(() => {
  if (!devices.length) return [];

  const workerMap: Record<string, number> = {};

  devices.forEach((d) => {
    // If device has a real worker assigned, use that worker
    if (d.worker_hostname) {
      workerMap[d.worker_hostname] = (workerMap[d.worker_hostname] || 0) + 1;
    }
  });

  // If NO device has a worker assigned
  if (Object.keys(workerMap).length === 0) {
    return [
      {
        worker: "No Worker Assigned",
        count: devices.length,
      },
    ];
  }

  return Object.entries(workerMap).map(([worker, count]) => ({
    worker,
    count,
  }));
}, [devices]);


  return (
    <div className="w-full h-full p-4">

      <h1 className="text-2xl font-semibold mb-4">Reports Dashboard</h1>

      {/* Show loading message */}
      {loading && (
        <p className="text-blue-500 font-medium mb-4">
          Loading devices...
        </p>
      )}

      {/* Show error */}
      {error && (
        <p className="text-red-500 font-medium mb-4">
          {error}
        </p>
      )}

      {/* No devices case */}
      {!loading && devices.length === 0 && (
        <p className="text-gray-500 font-medium">No devices found</p>
      )}

      {/* Chart */}
      {devices.length > 0 && (
        <div className="w-full h-[400px] bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Devices per Worker</h2>

          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="worker" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
