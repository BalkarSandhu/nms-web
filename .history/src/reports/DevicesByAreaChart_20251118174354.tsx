import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAppSelector } from "@/store/hooks";

export default function DevicesByAreaChart() {
  const { devices: reduxDevices } = useAppSelector((state) => state.devices);
  const { workers: reduxWorkers } = useAppSelector((state) => state.workers);

  // Worker ID → hostname
  const workerMap: Record<string, string> = {};

  reduxWorkers.forEach((w) => {
    workerMap[w.id] = w.hostname;   // id is a string
  });

  // Group devices by area (= worker.hostname)
  const areaCountMap: Record<string, number> = {};

  reduxDevices.forEach((device) => {
    const area = workerMap[device.worker_id] || "Unknown";

    if (!areaCountMap[area]) {
      areaCountMap[area] = 1;
    } else {
      areaCountMap[area]++;
    }
  });

  // Convert map → array for chart
  const chartData = Object.entries(areaCountMap).map(([area, count]) => ({
    name: area,
    active: count,
  }));

  return (
    <div className="w-full h-[350px] bg-white rounded-xl p-4 shadow">
      <h2 className="text-lg font-semibold mb-2">Active Devices by Area</h2>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="active" fill="#1E90FF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
