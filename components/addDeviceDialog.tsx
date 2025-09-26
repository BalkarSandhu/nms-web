"use client"

import { use, useState } from "react"
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
  data: Device[]
  setData: React.Dispatch<React.SetStateAction<Device[]>>
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
  const [camera_ip, setCamera_ip]=useState("")
  const [name, setName] = useState("")
  const [lat, setLat]=useState("")
  const [long, setLong]=useState("")
  const [selectedProtocol,setSelectedProtocol]=useState("")
  const [port,setPort]=useState("")
  const [username,setUsername]=useState("")
  const [password,setPassword]=useState("")
  const [imei,setImei]=useState("")
  const [selectedDeviceType,setSelectedDeviceType]=useState("")
  const [deviceTypeDialogOpen, setDeviceTypeDialogOpen] = useState(false)
  const [selectedPreviousNode,setSelectedPreviousNode]=useState("")
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

    
    const deviceData = {
      location: selectedLocation,
      deviceType: selectedDeviceType,
      protocol: selectedProtocol,
      name: name,
      previousNode: selectedPreviousNode,
      
      ...(selectedDeviceType === "Camera" || selectedDeviceType === "NVR") && {
        camera_ip,
        latitude: lat,
        longitude: long,
      },
      
      ...(selectedProtocol === "ICMP" && {
        port
      }),
      ...(selectedProtocol === "SNMP" && {
        username,
        password,
        port
      }),
      ...(selectedProtocol === "TCP" && {
        imei
      })
    }

    try {
      
      const response = await fetch('http://192.168.29.213:8000/api/v1/devices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData)
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
      setLat("")
      setLong("")
      setSelectedProtocol("")
      setPassword("")
      setUsername("")
      setImei("")
      setSelectedDeviceType("")
      setSelectedPreviousNode("")
      
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

            <label htmlFor="Location" className="Location">
                  Location
                </label>
                 <select
              id="location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="col-span-3 border rounded px-2 py-1"
            >
              <option value="">Select the Location</option>
              <option value="ABC">ABC</option>
              <option value="DEF">DEF</option>
              
            </select>

            <label htmlFor="PreviousNode" className="PreviousNode">
                  Previous Node
                </label>
                 <select
              id="PreviousNode"
              value={selectedPreviousNode}
              onChange={(e) => setSelectedPreviousNode(e.target.value)}
              className="col-span-3 border rounded px-2 py-1"
            >
              <option value="">Select the Previous Node</option>
              <option value="ABC">ABC</option>
              <option value="DEF">DEF</option>
              
            </select>

            <label htmlFor="DeviceType" className="DeviceType">
                  Device type
                </label>
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

            <label htmlFor="Display" className="Display">
                  Display
                </label>
                <Input
                id="Display"
                value={name}
                onChange={(e)=>setName(e.target.value)}
                placeholder="Enter the Display Name"
                className="col-span-3"
                />

                 


                
            </div>
            
            {(selectedDeviceType === "Camera" || selectedDeviceType === "NVR") && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="Camera_IP" className="Camera_IP">Camera IP</label>
                <Input
                  id="camera_ip"
                  value={camera_ip}
                  onChange={(e)=>setCamera_ip(e.target.value)}
                  placeholder="Enter Camera IP"
                  className="col-span-3"
                />

                <label htmlFor="Latitude" className="Latitude">Latitude</label>
                <Input
                  id="latitude"
                  value={lat}
                  onChange={(e)=>setLat(e.target.value)}
                  placeholder="Enter Latitude"
                  className="col-span-3"
                />

                <label htmlFor="Longitude" className="Longitude">Longitude</label>
                <Input
                  id="longitude"
                  value={long}
                  onChange={(e)=>setLong(e.target.value)}
                  placeholder="Enter Longitude"
                  className="col-span-3"
                />
              </div>
            )}

            {selectedProtocol==="ICMP" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="Port" className="Port">
                  Port
                </label>
                <Input
                id="Port"
                value={port}
                onChange={(e)=>setPort(e.target.value)}
                placeholder="Enter the Port"
                className="col-span-3"/>
              </div>
            )}
            
            {selectedProtocol==="SNMP" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="Username" className="Username">Username</label>
                <Input
                id="username"
                value={username}
                onChange={(e)=>setUsername(e.target.value)}
                placeholder="Enter Username"
                className="col-span-3"
                />

                <label htmlFor="Passwrod" className="Password">Password</label>
                <Input
                id="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="Enter Password"
                className="col-span-3"
                />

                <label htmlFor="Port" className="Port">Port</label>
                <Input
                id="port"
                value={port}
                onChange={(e)=>setPort(e.target.value)}
                placeholder="Port"
                className="col-span-3"
                />
              </div>
            )}
            
            {selectedProtocol==="TCP" && (
              <div className="grid grid-cols-4 gap-4">
                <label htmlFor="IMEI" className="IMEI">IMEI</label>
                <Input
                className="col-span-3"
                id="IMEI"
                value={imei}
                onChange={(e)=>setImei(e.target.value)}
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
      onDeviceTypeAdded={(newType) => {
        setSelectedDeviceType(newType)
      }}
    />
    </div>
  )
}