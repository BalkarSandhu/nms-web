// app/dashboard/local-components/DashboardStats.tsx
"use client";

import { useDashboardStats } from "@/providers";
import BaseCard from "./Base-Card";
import { Activity, Users, MapPin, Server } from "lucide-react";

/**
 * Example component using the new Dashboard Context
 * Shows how to access statistics data from the shared context
 */
export default function DashboardStats() {
  const { stats } = useDashboardStats();

  const menuGroups = [
    {
      items: [
        { type: "label" as const, label: "Options" },
        { 
          type: "item" as const, 
          label: "Refresh Stats", 
          onClick: () => console.log("Refresh stats"),
          shortcut: "⌘R"
        },
        { 
          type: "item" as const, 
          label: "Export Data", 
          onClick: () => console.log("Export data") 
        },
      ]
    },
    {
      items: [
        { 
          type: "item" as const, 
          label: "Settings", 
          onClick: () => console.log("Settings") 
        },
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Workers Card */}
      <BaseCard title="Active Workers" menuGroups={menuGroups}>
        <div className="flex items-center justify-between h-full">
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold text-[var(--contrast)]">
              {stats.activeWorkers}
            </span>
            <span className="text-sm text-[var(--contrast)] opacity-70">
              {stats.offlineWorkers} offline
            </span>
          </div>
          <Users className="w-12 h-12 text-[var(--contrast)] opacity-50" />
        </div>
      </BaseCard>

      {/* Total Devices Card */}
      <BaseCard title="Total Devices" menuGroups={menuGroups}>
        <div className="flex items-center justify-between h-full">
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold text-[var(--contrast)]">
              {stats.totalDevices}
            </span>
            <span className="text-sm text-[var(--contrast)] opacity-70">
              devices online
            </span>
          </div>
          <Server className="w-12 h-12 text-[var(--contrast)] opacity-50" />
        </div>
      </BaseCard>

      {/* Active Services Card */}
      <BaseCard title="Active Services" menuGroups={menuGroups}>
        <div className="flex items-center justify-between h-full">
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold text-[var(--contrast)]">
              {stats.activeServices}
            </span>
            <span className="text-sm text-[var(--contrast)] opacity-70">
              services running
            </span>
          </div>
          <Activity className="w-12 h-12 text-[var(--contrast)] opacity-50" />
        </div>
      </BaseCard>

      {/* Total Locations Card */}
      <BaseCard title="Total Locations" menuGroups={menuGroups}>
        <div className="flex items-center justify-between h-full">
          <div className="flex flex-col gap-2">
            <span className="text-4xl font-bold text-[var(--contrast)]">
              {stats.totalLocations}
            </span>
            <span className="text-sm text-[var(--contrast)] opacity-70">
              monitored sites
            </span>
          </div>
          <MapPin className="w-12 h-12 text-[var(--contrast)] opacity-50" />
        </div>
      </BaseCard>
    </div>
  );
}
