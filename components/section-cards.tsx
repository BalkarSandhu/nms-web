"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DeviceStats {
  active_devices: number
  device_type_stats: {
    [key: string]: number
  }
  offline_devices: number
  online_devices: number
  protocol_stats: {
    [key: string]: number
  }
  total_devices: number
}

export function SectionCards() {
  const [stats, setStats] = useState<DeviceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('http://192.168.29.35:8000/api/v1/devices/statistics')
        if (!response.ok) {
          throw new Error('Failed to fetch statistics')
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching statistics:', error)
        toast.error('Failed to load device statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Devices</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats?.total_devices || 0}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Total Count
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            All Devices <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total number of devices in the system
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Online Devices</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-green-600">
            {stats?.online_devices || 0}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-green-600">
              <IconTrendingUp />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Currently Online <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Devices that are currently active
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Offline Devices</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-red-600">
            {stats?.offline_devices || 0}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-red-600">
              <IconTrendingDown />
              Inactive
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Currently Offline <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Devices that are currently inactive
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Unknown Devices</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Unknown
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Unknown <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Unknown
          </div>
        </CardFooter>
      </Card>
      
    </div>
  )
}
