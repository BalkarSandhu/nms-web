"use client"
import { NextResponse } from "next/server"
import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function LocationsPage() {
  const [locations, setLocations] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchLocations() {
      try {
        const response = await fetch('http://192.168.29.35:8000/api/v1/locations', {
          method: 'GET',
          
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!mounted) return;
        setLocations(Array.isArray(data) ? data : data.locations || []);
        setError(null);
      } catch (error) {
        console.error('Error fetching locations:', error);
        if (!mounted) return;
        setError('Failed to fetch locations');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchLocations()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Locations</h1>

      {loading ? (
        <div className="py-6">Loading locations...</div>
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
                  <TableCell>{loc.name ?? loc.display ?? "-"}</TableCell>
                  <TableCell>{loc.location_id ?? loc.id ?? "-"}</TableCell>
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
