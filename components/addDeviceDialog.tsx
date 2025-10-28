"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createNewDevice, Device } from "@/components/add-device"
import { AddDeviceTypeDialog } from "./addDeviceTypeDialog"

interface AddDeviceDialogProps {
    data: any[]
  setData: React.Dispatch<React.SetStateAction<any[]>>
  deviceType: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddDeviceDialog({ 
  data, 
  setData, 
  deviceType, 
  open, 
  onOpenChange 
}: AddDeviceDialogProps) {
  const [selectedLocation, setSelectedLocation] = useState("")
  const [camera_ip, setCamera_ip] = useState("")
  const [check_interval,setCheck_interval]=useState<string | number>("300")
  const [name, setName] = useState("")
  const [lat, setLat] = useState("")
  const [long, setLong] = useState("")
  const [selectedProtocol, setSelectedProtocol] = useState("")
  const [port, setPort] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [imei, setImei] = useState("")
  const [selectedDeviceType, setSelectedDeviceType] = useState("")
  const [deviceTypeDialogOpen, setDeviceTypeDialogOpen] = useState(false)
  const [selectedPreviousNode, setSelectedPreviousNode] = useState("")
  const [deviceTypes, setDeviceTypes] = useState([
    { id: 1, type: "Camera" },
    { id: 2, type: "NVR" }
  ])

  const handleSubmit = async () => {
    if (!selectedLocation) {
      toast.error("Device location is required")
      return
    }
    if (!selectedDeviceType) {
      toast.error("Device type is required")
      return
    }
    if (!selectedProtocol) {
      toast.error("Protocol is required")
      return
    }
    if (!name) {
      toast.error("Display name is required")
      return
    }

    
    const locationMap: Record<string, number> = {
      "Bastacolla Area Checkpost": 3,
      "Bastacolla Area Checkpost 1":4
    }
    
    const deviceTypeMap: Record<string, number> = {
      "Camera": 1,
      "NVR": 2
    }

      const devicePayload = {
      hostname: name,
      display: name,
      ip: camera_ip,
      protocol: selectedProtocol,
      location_id: locationMap[selectedLocation] ?? 0,
      device_type_id: deviceTypeMap[selectedDeviceType] ?? 0,
      check_interval: Number(check_interval) || 0
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_NMS_API_SOURCE}/api/v1/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(devicePayload)
      })

      if (!response.ok) {
        throw new Error('Failed to add device')
      }

      const result = await response.json()
      setData([...data, result])
      toast.success(`${selectedDeviceType} added successfully`)

      setSelectedLocation("")
      setCamera_ip("")
      setName("")
      setSelectedProtocol("")
      setSelectedDeviceType("")
      setCheck_interval(300)

      onOpenChange?.(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add device')
    }
  }

  return (
    <div className="relative">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Device</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new device.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="Protocol" className="text-right">
                Protocol
              </Label>
              <select
                id="Protocol"
                value={selectedProtocol}
                onChange={(e) => setSelectedProtocol(e.target.value)}
                className="col-span-3 border rounded px-2 py-1"
              >
                <option value="">Select the Protocol</option>
                <option value="ICMP">ICMP</option>
                <option value="SNMP">SNMP</option>
                <option value="TCP">TCP</option>
              </select>

              <Label htmlFor="Location" className="text-right">
                Location
              </Label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="col-span-3 border rounded px-2 py-1"
              >
                <option value="">Select the Location</option>
                <option value="Bastacolla Area Checkpost">Bastacolla Area Checkpost</option>
                <option value="Bastacolla Area Checkpost 1">Bastacolla Area Checkpost 1</option>
              </select>

              <Label htmlFor="Camera_IP" className="text-right">Camera IP</Label>
                <Input
                  id="camera_ip"
                  value={camera_ip}
                  onChange={(e) => setCamera_ip(e.target.value)}
                  placeholder="Enter Camera IP"
                  className="col-span-3"
                />

              {/* <Label htmlFor="PreviousNode" className="text-right">
                Previous Node
              </Label> */}
              {/* <select
                id="PreviousNode"
                value={selectedPreviousNode}
                onChange={(e) => setSelectedPreviousNode(e.target.value)}
                className="col-span-3 border rounded px-2 py-1"
              >
                <option value="">Select the Previous Node</option>
                <option value="ABC">ABC</option>
                <option value="DEF">DEF</option>
              </select> */}

              <Label htmlFor="DeviceType" className="text-right">
                Device type
              </Label>
              <div className="col-span-3 flex gap-2">
                <select
                  id="deviceType"
                  value={selectedDeviceType}
                  onChange={(e) => setSelectedDeviceType(e.target.value)}
                  className="flex-1 border rounded px-2 py-1"
                >
                  <option value="">Select the Device</option>
                  {deviceTypes.map((dt) => (
                    <option key={dt.type} value={dt.type}>
                      {dt.type}
                    </option>
                  ))}
                </select>
                <Button 
                  variant="secondary"
                  type="button"
                  onClick={() => setDeviceTypeDialogOpen(true)}
                >
                  + Add
                </Button>
              </div>

              <Label htmlFor="Display" className="text-right">
                Display
              </Label>
              <Input
                id="Display"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter the Display Name"
                className="col-span-3"
              />
            </div>

            
            {(selectedDeviceType === "Camera" || selectedDeviceType === "NVR") && (
              <div className="grid grid-cols-4 items-center gap-4">
                

                <Label htmlFor="Check_interval" className="text-right">Check Interval</Label>
                <Input
                  id="check_interval"
                  value={check_interval}
                  onChange={(e) => setCheck_interval(e.target.value)}
                  placeholder="Enter Check Interval"
                  className="col-span-3"
                />

              </div>
              
            )}

            {selectedProtocol === "ICMP" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="Port" className="text-right">
                  Port
                </Label>
                <Input
                  id="Port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Enter the Port"
                  className="col-span-3"
                />
              </div>
            )}
            
            {selectedProtocol === "SNMP" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="Username" className="text-right">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter Username"
                  className="col-span-3"
                />

                <Label htmlFor="Password" className="text-right">Password</Label>
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="col-span-3"
                />

                <Label htmlFor="Port" className="text-right">Port</Label>
                <Input
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Port"
                  className="col-span-3"
                />
              </div>
            )}
            
            {selectedProtocol === "TCP" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="IMEI" className="text-right">IMEI</Label>
                <Input
                  className="col-span-3"
                  id="IMEI"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="Enter IMEI"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Add {deviceType}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AddDeviceTypeDialog
        data={deviceTypes}
        setData={setDeviceTypes}
        open={deviceTypeDialogOpen}
        onOpenChange={setDeviceTypeDialogOpen}
        onDeviceTypeAdded={(newType) => setSelectedDeviceType(newType)}
      />
    </div>
  )
}