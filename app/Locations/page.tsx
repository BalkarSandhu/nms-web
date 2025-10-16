"use client"
import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table" 
import { Button } from "@/components/ui/button"
import { IconTrash, IconMapPin,IconEdit,IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader,
  DialogTitle,
  DialogDescription
  
} from "@/components/ui/dialog"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"


export default function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([])
  const [locationNames, setLocationNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<number | null>(null)
  const [locationToEdit, setLocationToEdit] = useState<number | null>(null)
  const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function fetchLocations() {
      try {
        const [locationsRes, mappingRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/locations/mapping')
        ])
        
        if (!locationsRes.ok) throw new Error(`Failed to fetch locations: ${locationsRes.status}`)
        if (!mappingRes.ok) throw new Error(`Failed to fetch location names: ${mappingRes.status}`)
        
        const [locationsData, mappingData] = await Promise.all([
          locationsRes.json(),
          mappingRes.json()
        ])

        const list = Array.isArray(locationsData) ? locationsData : locationsData.locations || []

        if (!mounted) return
        setLocations(list)
        setLocationNames(mappingData)
        setError(null) 
      } catch (err) {
        console.error('Error fetching locations', err)
        if (!mounted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchLocations()

    return () => {
      mounted = false
    }
  }, [])

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`http://192.168.29.35:8000/api/v1/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`Failed to delete : ${res.status}`)
      setLocations((prev) => prev.filter((d) => d.id !== id))
      toast.success(`Location ${id} deleted`)
      if (selectedLocationId === id) setLocationDialogOpen(false)
      setDeleteDialogOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }
  async function handleEdit(id: number) {
    try {
      const loc = locations.find((l) => (l.id ?? l.location_id) === id)
      if (!loc) {
        toast.error('Location not found')
        return
      }

      // create payload without sending id fields
      const { id: _omitId, location_id: _omitLocationId, ...payload } = loc

      // Convert lat and lng to float
      const normalizedPayload = {
        ...payload,
        lat: payload.lat ? parseFloat(payload.lat) : payload.lat,
        lng: payload.lng ? parseFloat(payload.lng) : payload.lng
      }

      const res = await fetch(`http://192.168.29.35:8000/api/v1/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
      })

      if (!res.ok) throw new Error(`Failed to edit : ${res.status}`)

      // Try to read updated object from response; fall back to local payload if no JSON returned
      let updated: any = normalizedPayload
      try {
        const data = await res.json()
        if (data) {
          // Ensure lat/lng stay as numbers in the updated data
          updated = {
            ...data,
            lat: data.lat ? parseFloat(data.lat) : data.lat,
            lng: data.lng ? parseFloat(data.lng) : data.lng
          }
        }
      } catch {
        // no JSON body, use normalized payload
      }

      setLocations((prev) =>
        prev.map((d) => ((d.id ?? d.location_id) === id ? updated : d))
      )
      toast.success(`Location ${id} edited`)
      if (selectedLocationId === id) setLocationDialogOpen(false)
      setEditDialogOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to edit')
    }
  }
  

  const selectedLocation = locations.find(
    l => l.id === selectedLocationId || l.location_id === selectedLocationId
  )

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all your location data
          </p>
        </div>
        <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="h-8 px-3">
                          {locations.length} {locations.length === 1 ? 'Device' : 'Devices'}
                        </Badge>
                        <Button
                          onClick={() => setAddLocationDialogOpen(true)}
                          className="rounded-full h-10 w-10 p-0"
                          size="icon"
                        >
                          <IconPlus className="h-5 w-5" />
                        </Button>
                      </div>
        <Badge variant="secondary" className="h-8 px-3">
          {locations.length} {locations.length === 1 ? 'Location' : 'Locations'}
        </Badge>
      </div>

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
            <CardTitle className="text-destructive">Error Loading Locations</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-lg border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Location ID</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Area</TableHead>
                    <TableHead className="font-semibold">Project</TableHead>
                    <TableHead className="font-semibold">Latitude</TableHead>
                    <TableHead className="font-semibold">Longitude</TableHead>
                    <TableHead className="font-semibold text-right">Devices</TableHead>
                    <TableHead className="font-semibold text-right">Down</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                    
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <IconMapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No locations found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    locations.map((loc) => (
                      <TableRow 
                        key={loc.location_id ?? loc.id ?? loc.name}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <Button
                            variant="link"
                            className="h-auto p-0 font-normal"
                            onClick={() => {
                              setSelectedLocationId(loc.id ?? loc.location_id ?? null)
                              setLocationDialogOpen(true)
                            }}
                            aria-label={`Open details for location ${loc.location_id ?? loc.id ?? '-'}`}
                          >
                            {loc.location_id ?? loc.id ?? "-"}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {loc.location ?? loc.display ?? "-"}
                        </TableCell>
                        <TableCell>
                          {locationNames[loc.id] || loc.area || loc.display || "-"}
                        </TableCell>
                        
                        <TableCell className="font-bold text-sm ">
                          {String(loc.project ?? "-")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {String(loc.lat ?? "-")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {String(loc.lng ?? "-")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {String("")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {String("")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setLocationToDelete(loc.id)
                              setDeleteDialogOpen(true)
                            }}
                            aria-label={`Delete Location ${loc.id}`}
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                          <Button
                          variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setLocationToEdit(loc.id)
                              setEditDialogOpen(true)
                            }}
                            aria-label={`Delete Location ${loc.id}`}
                          >
                            <IconEdit className="h-4 w-4" />
                            
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconMapPin className="h-5 w-5" />
              Location Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this location
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Location Name
              </label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {selectedLocation?.location ?? '-'}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Area
              </label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {selectedLocation?.area ?? '-'}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Project
              </label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                {selectedLocation?.project ?? '-'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Latitude
                </label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
                  {selectedLocation?.lat ?? '-'}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Longitude
                </label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
                  {selectedLocation?.lng ?? '-'}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLocationDialogOpen(false)}
            >
              Close
            </Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the location
              with ID {locationToDelete}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogHeader>Cancel</DialogHeader>
            <DialogHeader
              onClick={() => locationToDelete && handleDelete(locationToDelete)}
            >
              <Button className="Outline">
                Delete
              </Button>
            </DialogHeader>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
            <div className="grid gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Select Location
            </label>
            <select
              value={locationToEdit ?? ""}
              onChange={(e) => {
              const id = e.target.value === "" ? null : Number(e.target.value)
              setLocationToEdit(id)
              }}
              className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm"
            >
              <option value="">-- Select a location --</option>
              {locations.map((l) => (
              <option key={l.id ?? l.location_id ?? l.name} value={l.id ?? l.location_id ?? ""}>
                {l.location ?? l.display ?? `Location ${l.id ?? l.location_id ?? "-"}`}
              </option>
              ))}
            </select>
            </div>
            <div className="grid gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Select Area
            </label>
            <select
              value={locationToEdit ?? ""}
              onChange={(e) => {
                const id = e.target.value === "" ? null : Number(e.target.value)
                setLocationToEdit(id)
              }}
              className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm"
            >
              <option value="">-- Select an area --</option>
              {Array.from(
                
                new Map(
                  locations.map((l) => [
                    l.area ?? l.display ?? `Area ${l.id ?? l.location_id ?? "-"}`,
                    l,
                  ])
                ).entries()
              ).map(([area, l]) => (
                <option key={area} value={l.id ?? l.location_id ?? ""}>
                  {area}
                </option>
              ))}
            </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Project
              </label>
              <input
                type="text"
                value={locations.find((l) => (l.id ?? l.location_id) === locationToEdit)?.project ?? ""}
                placeholder="Enter the Project Name"
                onChange={(e) => {
                  if (locationToEdit == null) return
                  const value = e.target.value
                  setLocations((prev) =>
                    prev.map((l) =>
                      (l.id ?? l.location_id) === locationToEdit ? { ...l, project: value } : l
                    )
                  )
                }}
                className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Lattitude
              </label>
              <input
                type="text"
                value={locations.find((l) => (l.id ?? l.location_id) === locationToEdit)?.lat ?? ""}
                placeholder="Enter the lattitude coordinates"
                onChange={(e) => {
                  if (locationToEdit == null) return
                  const value = e.target.value
                  setLocations((prev) =>
                    prev.map((l) =>
                      (l.id ?? l.location_id) === locationToEdit ? { ...l, lat: value } : l
                    )
                  )
                }}
                className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Longitude
              </label>
              <input
                type="text"
                value={locations.find((l) => (l.id ?? l.location_id) === locationToEdit)?.lng ?? ""}
                placeholder="Enter the Longitude Coordinates"
                onChange={(e) => {
                  if (locationToEdit == null) return
                  const value = e.target.value
                  setLocations((prev) =>
                    prev.map((l) =>
                      (l.id ?? l.location_id) === locationToEdit ? { ...l, lng: value } : l
                    )
                  )
                }}
                className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm"
              />
            </div>


            
          <DialogFooter>
            <DialogHeader>Cancel</DialogHeader>
            <DialogHeader
              onClick={() => locationToEdit && handleEdit(locationToEdit)}
            >
              <Button className="Outline">
                Edit
              </Button>
            </DialogHeader>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </div>
  )
}