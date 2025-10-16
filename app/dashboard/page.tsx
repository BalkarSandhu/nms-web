"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DataTable } from "@/components/common"
import { DeviceInfoDialog } from "@/components/device-info-dialog"
import {AddDeviceDialog} from "@/components/addDeviceDialog"
import { Button } from "@/components/ui/button"
import { IconTrash, IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Page() {
  const [devices, setDevices] = useState<any[]>([])
  const [locationNames, setLocationNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)
  const [addDeviceDialogOpen, setAddDeviceDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchData() {
      try {
        const [devicesRes, mappingRes] = await Promise.all([
          fetch('http://192.168.29.35:8000/api/v1/devices'),
          fetch('/api/locations/mapping')
        ])

        if (!devicesRes.ok) throw new Error(`Failed to fetch devices: ${devicesRes.status}`)
        if (!mappingRes.ok) throw new Error(`Failed to fetch location names: ${mappingRes.status}`)

        const [devicesData, mappingData] = await Promise.all([
          devicesRes.json(),
          mappingRes.json()
        ])

        const list = Array.isArray(devicesData) ? devicesData : devicesData.devices || []
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
          location: mappingData[device.location_id] || String(device.location_id),
        }))

        if (!mounted) return
        setDevices(mapped)
        setLocationNames(mappingData)
      } catch (err) {
        console.error('Error fetching data', err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [])

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`http://192.168.29.35:8000/api/v1/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`Failed to delete device: ${res.status}`)
      setDevices((prev) => prev.filter((d) => d.id !== id))
      toast.success(`Device ${id} deleted`)
      if (selectedDeviceId === id) setDeviceDialogOpen(false)
      setDeleteDialogOpen(false)
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
              
              <div className="px-4 lg:px-6">
                {loading ? (
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-8 w-[200px]" />
                      <Skeleton className="h-4 w-[300px]" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive">Error Loading Devices</CardTitle>
                      <CardDescription>{error}</CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">Devices</h2>
                        <p className="text-muted-foreground mt-1">
                          Manage and monitor all your devices
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="h-8 px-3">
                          {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
                        </Badge>
                        <Button
                          onClick={() => setAddDeviceDialogOpen(true)}
                          className="rounded-full h-10 w-10 p-0"
                          size="icon"
                        >
                          <IconPlus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <Card>
                      <CardContent className="p-0">
                        <DataTable
                          data={devices}
                          columns={[
                            {
                              key: 'display',
                              label: 'Device Id',
                              render: (r: any) => (
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-normal"
                                  onClick={() => {
                                    setSelectedDeviceId(r.id)
                                    setDeviceDialogOpen(true)
                                  }}
                                >
                                  {r.id}
                                </Button>
                              ),
                            },
                            { 
                              key: 'hostname', 
                              label: 'Hostname', 
                              render: (r: any) => (
                                <span className="font-medium">{r.hostname || '-'}</span>
                              )
                            },
                            { 
                              key: 'location', 
                              label: 'Location', 
                              render: (r: any) => (
                                <Badge variant="outline">{r.location || '-'}</Badge>
                              )
                            },
                            {
                              key: 'status',
                              label: 'Status',
                              render: (r: any) => {
                                if (r.status === true) {
                                  return <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
                                } else if (r.status === false) {
                                  return <Badge variant="destructive">Offline</Badge>
                                } else {
                                  return <Badge variant="secondary">Unknown</Badge>
                                }
                              },
                            },
                            { 
                              key: 'last_ping', 
                              label: 'Last Ping', 
                              render: (r: any) => (
                                <span className="text-sm text-muted-foreground font-mono">
                                  {r.last_ping || '-'}
                                </span>
                              )
                            },
                            {
                              key: 'actions',
                              label: 'Action',
                              render: (r: any) => (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeviceToDelete(r.id)
                                      setDeleteDialogOpen(true)
                                    }}
                                    aria-label={`Delete device ${r.id}`}
                                  >
                                    <IconTrash className="h-4 w-4" />
                                  </Button>
                                </div>
                              ),
                            },
                          ]}
                        />
                      </CardContent>
                    </Card>

                    <DeviceInfoDialog
                      id={selectedDeviceId}
                      open={deviceDialogOpen}
                      onOpenChange={(open) => {
                        setDeviceDialogOpen(open)
                        if (!open) setSelectedDeviceId(null)
                      }}
                    />

                    <AddDeviceDialog
                      open={addDeviceDialogOpen}
                      onOpenChange={setAddDeviceDialogOpen}
                      onDeviceAdded={(newDevice) => {
                        const mapped = {
                          id: newDevice.id,
                          display: newDevice.display ?? newDevice.device_type ?? newDevice.hostname ?? String(newDevice.id),
                          hostname: newDevice.hostname ?? "",
                          type: newDevice.device_type ?? "",
                          status: typeof newDevice.status === 'boolean' ? newDevice.status : null,
                          last_ping: newDevice.last_ping ?? "",
                          limit: String(newDevice.limit ?? ""),
                          reviewer: String(newDevice.reviewer ?? ""),
                          location_id: newDevice.location_id ?? 0,
                        }
                        setDevices((prev) => [...prev, mapped])
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete device
              with ID {deviceToDelete}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deviceToDelete && handleDelete(deviceToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}