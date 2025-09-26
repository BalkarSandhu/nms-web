"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createNewDeviceType, DeviceType } from "@/components/add-deviceType"

interface AddDeviceTypeProps {
  data: DeviceType[]
  setData: React.Dispatch<React.SetStateAction<DeviceType[]>>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDeviceTypeAdded?: (type: string) => void
}

export function AddDeviceTypeDialog({
  data, 
  setData,  
  open, 
  onOpenChange,
  onDeviceTypeAdded
}: AddDeviceTypeProps) {
  const [newDeviceType, setNewDeviceType] = useState("")

  const handleSubmit = () => {
    if (!newDeviceType.trim()) {
      toast.error("Device type is required")
      return
    }

    // Check if device type already exists
    if (data.some(dt => dt.type.toLowerCase() === newDeviceType.toLowerCase())) {
      toast.error("This device type already exists")
      return
    }

    const deviceTypeEntry = createNewDeviceType(newDeviceType, data.length)
    setData([...data, deviceTypeEntry])
    toast.success(`Device type "${newDeviceType}" added successfully`)
    
    // Notify parent component about the new device type
    onDeviceTypeAdded?.(newDeviceType)
    
    // Reset form and close dialog
    setNewDeviceType("")
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Device Type</DialogTitle>
          <DialogDescription>
            Enter a name for the new device type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deviceType" className="text-right">
              Device Type
            </Label>
            <Input
              id="deviceType"
              value={newDeviceType}
              onChange={(e) => setNewDeviceType(e.target.value)}
              placeholder="Enter device type name"
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Device Type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}