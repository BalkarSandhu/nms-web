import DevicesByAreaChart from "@/components/charts/DevicesByAreaChart";

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Analytics Overview</h1>

      <DevicesByAreaChart />
    </div>
  );
}
