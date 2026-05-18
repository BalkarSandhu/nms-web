"use client"

import * as React from "react"
import { useLocation } from 'react-router-dom'
import {
  Network,
  LayoutDashboard,
  BarChart3,
  Smartphone,
  MapPin,
  Users,
  History as HistoryIcon,
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

const baseNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, isActive: false },
  { title: "Metrics",   url: "/metrics",   icon: BarChart3,  isActive: false },
  { title: "Devices",   url: "/devices",   icon: Smartphone, isActive: false },
  { title: "Locations", url: "/locations", icon: MapPin,     isActive: false },
  { title: "Areas",     url: "/areas",     icon: Users,      isActive: false },
  // {
  //   title: "Reports",
  //   url: "/reports",
  //   icon: NewspaperIcon,
  //   isActive: false,
  //   items: [
  //     { title: "Device Reports",   url: "/reports/devices" },
  //     { title: "Location Reports", url: "/reports/locations" },
  //     { title: "Area Reports",     url: "/reports/workers" },
  //   ],
  // },
  { title: "Topology", url: "/topology", icon: Network, isActive: false },
  { title: "History",  url: "/history",  icon: HistoryIcon, isActive: false },
  {title: "Services", url:"/services", icon: Network, isActive: false},
]

const teams = [
  { name: "DWINMS", logo: Network, plan: "Enterprise" },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navItems = React.useMemo(() => {
    return baseNavItems.map((item) => {
      const isExactMatch = location.pathname === item.url
      const isNestedMatch =
        !isExactMatch && item.url !== '/' && location.pathname.startsWith(item.url)
      return { ...item, isActive: isExactMatch || isNestedMatch }
    })
  }, [location.pathname])

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-[var(--border-soft)]"
      style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #0B1220 100%)',
        color: 'var(--text-hi)',
      }}
    >
      <SidebarHeader style={{ backgroundColor: 'transparent', color: 'var(--text-hi)' }}>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent style={{ backgroundColor: 'transparent', color: 'var(--text-hi)' }}>
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter style={{ backgroundColor: 'transparent', color: 'var(--text-hi)' }}>
        {/* Status line — only visible when the sidebar is expanded */}
        
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
