import { AppSidebar } from "@/components/app-sidebar"
// import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import data from "@/app/dashboard/data.json"

export default function Page() {
  // Map data.json to DataTable schema
  const mappedData = (Array.isArray(data) ? data : []).map(device => ({
    device_id: device.device_id,
    device_type: device.device_type,
    hostname: device.hostname,
    type: device.display || device.device_type,
    status: device.status,
    lastCheck: device.last_ping || "",
    limit: "100",
    reviewer: "System",
    location_id: device.location_id,
    last_ping: device.last_ping || "",
  }));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <DataTable data={mappedData} />
              <div className="px-4 lg:px-6">
                {/* <ChartAreaInteractive /> */}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
