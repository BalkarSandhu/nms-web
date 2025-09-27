"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { toast } from "sonner"

interface DeviceInfo {
  // Add the properties that your API returns
  device_id: number
  hostname:string
  status :boolean
  ip : string
  protocol :string
}

interface DeviceInfoDialogProps {
  deviceId: number | null
  hostname:string | null
  status :boolean 
  ip : string
  protocol :string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceInfoDialog({ deviceId, open, onOpenChange }: DeviceInfoDialogProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchDeviceInfo() {
      if (!deviceId) return

      setLoading(true)
      try {
        const response = await fetch(`/api/devices/${deviceId}`)
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

    if (open && deviceId) {
      fetchDeviceInfo()
    }
  }, [deviceId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Device Information</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : deviceInfo ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium">Device ID:</span>
              <span className="col-span-3">{deviceInfo.device_id}</span>
              <span className="font-medium">Name:</span>
              <span className="col-span-3">{deviceInfo.hostname}</span>
              <span className="font-medium">Status:</span>
              <span className="col-span-3">{deviceInfo.status}</span>
              <span className="font-medium">IP:</span>
              <span className="col-span-3">{deviceInfo.ip}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}