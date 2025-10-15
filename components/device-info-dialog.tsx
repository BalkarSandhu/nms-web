"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { toast } from "sonner"

type DeviceInfo = any

interface DeviceInfoDialogProps {
  id?: number | null
  device?: DeviceInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceInfoDialog({ id, device, open, onOpenChange }: DeviceInfoDialogProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(device ?? null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchDeviceInfo() {
      if (!id) return

      setLoading(true)
      try {
        const response = await fetch(`http://192.168.29.35:8000/api/v1/devices/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch device info')
        }
        const data = await response.json()
        setDeviceInfo(data)
      } catch (error) {
        console.error('Error fetching device info:', error)
        toast.error('Failed to load device information')
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      if (device) {
        setDeviceInfo(device)
      } else if (id) {
        fetchDeviceInfo()
      }
    }
  }, [id, open, device])

  const d = deviceInfo

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : d ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{d.display ?? d.hostname ?? `Device ${d.id ?? d.device_id}`}</h3>
                <div className="text-sm text-muted-foreground mt-1">{d.protocol ?? ""} • {d.ip ?? ""}</div>
              </div>
              <div className="flex items-center gap-2">
                {d.status ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium">Active</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium">Inactive</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border rounded p-3">
                <div className="text-xs text-muted-foreground">Device ID</div>
                <div className="font-medium">{d.id ?? d.device_id ?? "-"}</div>
              </div>
              <div className="bg-card border rounded p-3">
                <div className="text-xs text-muted-foreground">Hostname</div>
                <div className="font-medium">{d.hostname ?? d.display ?? "-"}</div>
              </div>
              <div className="bg-card border rounded p-3">
                <div className="text-xs text-muted-foreground">IP</div>
                <div className="font-medium">{d.ip ?? "-"}</div>
              </div>
              <div className="bg-card border rounded p-3">
                <div className="text-xs text-muted-foreground">Protocol</div>
                <div className="font-medium">{d.protocol ?? "-"}</div>
              </div>
              <div className="bg-card border rounded p-3 col-span-2">
                <div className="text-xs text-muted-foreground">Last Ping</div>
                <div className="font-medium">{d.last_ping ?? "-"}</div>
              </div>
            </div>

            {d.attributes && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Attributes</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(d.attributes).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{k}: {String(v)}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-muted"
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-muted-foreground">No device info found.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}