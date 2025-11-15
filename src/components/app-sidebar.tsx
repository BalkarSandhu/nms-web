"use client"

import * as React from "react"
import { useLocation } from 'react-router-dom'
import {
  // AudioWaveform,
  // Command,
  // GalleryVerticalEnd,
  Network,
  LayoutDashboard,
  Smartphone,
  MapPin,
  Users,
  HardHat,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const teams = [
  {
    name: "Dadhwal NMS",
    logo: Network,
    plan: "Enterprise",
  },
]

const NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Devices",
    url: "/devices",
    icon: Smartphone,
  },
  {
    title: "Locations",
    url: "/locations",
    icon: MapPin,
  },
  {
    title: "Workers",
    url: "/workers",
    icon: Users,
  },
  {
    title: "Field Technicians",
    url: "/field-technicians",
    icon: HardHat,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navItems = React.useMemo(() => {
    return NAV_ITEMS.map((item) => {
      const isExactMatch = location.pathname === item.url
      const isNestedMatch = !isExactMatch && item.url !== '/' && location.pathname.startsWith(item.url)
      return {
        ...item,
        isActive: isExactMatch || isNestedMatch,
      }
    })
  }, [location.pathname])

  return (
    <Sidebar collapsible="icon" {...props} className="bg-(--dark) text-(--contrast) border-r-2 border-(--base)">
      <SidebarHeader className="bg-(--dark) text-(--contrast)">
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent className="bg-(--dark) text-(--contrast)">
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter className="bg-(--dark) text-(--contrast)">
        <NavUser/>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
