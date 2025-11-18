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
  // ⬇️ Fetch data from Redux Store
  const areas = useAppSelector((state) => state.locations.areas);
  const devices = useAppSelector((state) => state.devices);

  // ⬇️ Prepare chart-ready data
  const chartData = areas.map((area) => {
    // Count active devices in this area
    const activeCount = devices.filter(
      (d) => d.area_id === area.id && d.status === "active"
    ).length;

    return {
      name: area.name,   // X-axis
      active: activeCount, // Y-axis
    };
  });

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
