"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
// import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/common"
import { DeviceInfoDialog } from "@/components/device-info-dialog"
import { Button } from "@/components/ui/button"
import { IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
export default function Page() {
  const [devices, setDevices] = useState<any[]>([]) // mapped devices for DataTable
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function fetchDevices() {
      try {
        const res = await fetch('http://192.168.29.35:8000/api/v1/devices')
        if (!res.ok) throw new Error(`Failed to fetch devices: ${res.status}`)
        const payload = await res.json()
        // payload may be { count, devices: [...] } or an array
        const list = Array.isArray(payload) ? payload : payload.devices || []

        const mapped = list.map((device: any) => ({
          id: device.id,
          display: device.display ?? device.device_type ?? device.hostname ?? String(device.id),
          hostname: device.hostname ?? device.display ?? "",
          type: device.device_type ?? device.display ?? "",
          status: typeof device.status === 'boolean' ? device.status : null,
          last_ping: device.last_ping ?? "",
          limit: String(device.limit ?? ""),
          reviewer: String(device.reviewer ?? ""),
          location_id: device.location_id ?? 0,
        }))

        if (!mounted) return
        setDevices(mapped)
      } catch (err) {
        console.error('Error fetching devices', err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchDevices()

    return () => {
      mounted = false
    }
  }, [])

  async function handleDelete(id: number) {
    if (!confirm(`Delete device ${id}?`)) return
    try {
      const res = await fetch(`http://192.168.29.35:8000/api/v1/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`Failed to delete device: ${res.status}`)
      setDevices((prev) => prev.filter((d) => d.id !== id))
      toast.success(`Device ${id} deleted`)
      if (selectedDeviceId === id) setDeviceDialogOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

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
              <div>
                {loading ? (
                  <div className="py-6 text-center">Loading devices...</div>
                ) : error ? (
                  <div className="py-6 text-center text-red-500">Error: {error}</div>
                ) : (
                  <>
                    <DataTable
                      data={devices}
                      columns={[
                        {
                          key: 'display',
                          label: 'Device Id',
                          render: (r: any) => (
                            <Button
                              variant="link"
                              className="p-0"
                              onClick={() => {
                                setSelectedDeviceId(r.id)
                                setDeviceDialogOpen(true)
                              }}
                            >
                              {r.id}
                            </Button>
                          ),
                        },
                        { key: 'hostname', label: 'Hostname', render: (r: any) => r.hostname },
                        { key: 'type', label: 'Type', render: (r: any) => r.type },
                        {
                          key: 'status',
                          label: 'Status',
                          render: (r: any) =>
                            r.status === true ? 'Online' : r.status === false ? 'Offline' : 'Unknown',
                        },
                        { key: 'last_ping', label: 'Last Ping', render: (r: any) => r.last_ping || '-' },
                        {
                          key: 'actions',
                          label: 'Action',
                          render: (r: any) => (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleDelete(r.id)
                                }}
                                aria-label={`Delete device ${r.id}`}
                              >
                                <IconTrash />
                              </Button>
                            </div>
                          ),
                        },
                      ]}
                    />

                    <DeviceInfoDialog
                      id={selectedDeviceId}
                      open={deviceDialogOpen}
                      onOpenChange={(open) => {
                        setDeviceDialogOpen(open)
                        if (!open) setSelectedDeviceId(null)
                      }}
                    />
                  </>
                )}
              </div>
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
