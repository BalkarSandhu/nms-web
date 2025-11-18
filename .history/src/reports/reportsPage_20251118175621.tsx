import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import DevicesByAreaChart from "./DevicesByAreaChart";

import { fetchAllDevices } from "@/store/deviceSlice";
import { fetchWorkers } from "@/store/workerSlice";

export default function ReportsPage() {

  const dispatch = useAppDispatch();

  // 🔥 FETCH DATA ON PAGE LOAD
  useEffect(() => {
    console.log("📡 Fetching devices & workers for reports page...");
    dispatch(fetchAllDevices());
    dispatch(fetchWorkers({}));
  }, [dispatch]);

  const devices = useAppSelector((state) => state.devices.devices);

  // Chart 1 Data
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

      {/* CHART 1 */}
      <div className="w-full h-[350px] bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="font-semibold mb-2">Devices with Active Locations</h2>

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ActiveDevicesdata}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="devices" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="workers" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CHART 2 */}
      <DevicesByAreaChart />
    </div>
  );
}
