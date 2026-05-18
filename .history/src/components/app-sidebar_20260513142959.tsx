"use client"

import * as React from "react"
import { useLocation } from 'react-router-dom'
import {
  Network,
  LayoutDashboard,
  Smartphone,
  MapPin,
  Users,
  NewspaperIcon,
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
        <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <div
            className="flex items-center justify-between rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-[0.14em]"
            style={{
              borderColor: 'var(--border-soft)',
              background: 'rgba(15,23,42,0.6)',
              color: 'var(--text-lo)',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="nms-dot nms-dot-online" />
              System Online
            </span>
            <span style={{ color: 'var(--text-dim)' }}>v6.0</span>
          </div>
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
