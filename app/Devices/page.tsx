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

export default function DevicesPage() {
  const [locations, setLocations] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchDevices() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_NMS_API_SOURCE}/api/v1/devices`)
        if (!res.ok) throw new Error(`Failed to fetch Devices: ${res.status}`)
        const data = await res.json()
        if (!mounted) return
        setLocations(Array.isArray(data) ? data : data.locations || [])
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchDevices()
    return () => { mounted = false }
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Devices</h1>

      {loading ? (
        <div className="py-6">Loading Devices...</div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location ID</TableHead>
                <TableHead>Previous Node</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations && locations.map((loc) => (
                <TableRow key={loc.location_id ?? loc.id ?? loc.name}>
                  <TableCell>{loc.hostname}</TableCell>
                  <TableCell>{loc.location_id}</TableCell>
                  <TableCell>{String(loc.previous_node ?? "-")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
