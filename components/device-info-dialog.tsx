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
          <DialogTitle>Device Details</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : deviceInfo ? (
          <div className="py-4">
            {/* <div className="mb-2 font-semibold">Device Details</div> */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-800 rounded-2xl">
                <tbody>
                  <tr>
                    <td className="font-medium p-2 border border-gray-800">Device ID</td>
                    <td className="p-2 border border-gray-800">{deviceInfo.device_id}</td>
                  </tr>
                  <tr>
                    <td className="font-medium p-2 border border-gray-800">Hostname</td>
                    <td className="p-2 border border-gray-800">{deviceInfo.hostname}</td>
                  </tr>
                  <tr>
                    <td className="font-medium p-2 border border-gray-800">Status</td>
                    <td className="p-2 border border-gray-800">{deviceInfo.status ? "Active" : "Inactive"}</td>
                  </tr>
                  <tr>
                    <td className="font-medium p-2 border border-gray-800">IP</td>
                    <td className="p-2 border border-gray-800">{deviceInfo.ip}</td>
                  </tr>
                  <tr>
                    <td className="font-medium p-2 border border-gray-800">Protocol</td>
                    <td className="p-2 border border-gray-800">{deviceInfo.protocol}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-4 text-muted-foreground">No device info found.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}