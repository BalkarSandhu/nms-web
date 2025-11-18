import { useAppSelector } from "@/store/hooks";
import {
  LineChart,
  BarChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function ReportsPage() {

  // ⬅️ Get devices from Redux slice
  const devices = useAppSelector((state) => state.devices.devices);

  // ⬅️ Prepare chart data
  const ActiveDevicesdata = [
    {
      name: "Active Devices",
      devices: devices.filter((d) => d.location_id !== null).length,
      workers: devices.filter((d) => d.worker_id !== null).length,
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Analytics Overview</h1>

      <div className="w-full h-[350px] bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-2">Devices with Active Locations</h2>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ActiveDevicesdata}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="devices" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="workers" stroke="#16a34a" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
