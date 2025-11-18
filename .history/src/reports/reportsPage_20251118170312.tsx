export const ReportsPage = () => {
  return (
    <div className="p-4">       

        <h1 className="text-2xl font-bold mb-4">Reports Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Device Reports Metric */}
            <Metric2
                title="Device Reports"
                headers={{ col1: "Report Name", col2: "Generated On" }}
                data={[
                    { id: 1, col1: "Device Uptime", col2: "2024-06-01", link: "/reports/devices" },
                    { id: 2, col1: "Location Status", col2: "2024-05-28", link: "/reports/locations" },
                    { id: 3, col1: "Worker Activity", col2: "2024-05-25", link: "/reports/workers" },
                ]}
                maxRows={5}
                className="h-64"
            />          
        </div>
    </div>
  );
}