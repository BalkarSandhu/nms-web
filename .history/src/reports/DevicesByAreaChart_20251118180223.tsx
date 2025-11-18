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
  // ⬅️ devices fetched from /devices/all
  const devices = useAppSelector((state) => state.devices.devices);

  // ⬅️ workers fetched from /workers
  const workers = useAppSelector((state) => state.workers.workers);

  console.log("🟦 Devices:", devices);
  console.log("🟩 Workers:", workers);

  if (!devices || devices.length === 0)
    return <div>No devices found</div>;

  if (!workers)
    return <div>Loading workers...</div>;

  // Map worker.id -> worker.hostname
  const workerMap: Record<string, string> = {};
  workers.forEach((w) => {
    workerMap[w.id] = w.hostname || "Unknown Worker";
  });

  // Count devices by worker hostname (Area)
  const areaCounts: Record<string, number> = {};

  devices.forEach((device) => {
    const area = workerMap[device.worker_id] || "Unassigned";
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  // Prepare chart data
  const chartData = Object.entries(areaCounts).map(([name, active]) => ({
    name,
    active,
  }));

  console.log("📊 ChartData:", chartData);

  return (
    <div
      className="w-full bg-white rounded-xl p-4 shadow"
      style={{ height: 350 }}  // IMPORTANT FIX
    >
      <h2 className="text-lg font-semibold mb-3">Active Devices by Area</h2>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="active" fill="#1E90FF" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p>No data to display</p>
      )}
    </div>
  );
}
