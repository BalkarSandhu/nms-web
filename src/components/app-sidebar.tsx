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
  NewspaperIcon
  // HardHat,
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
// const data = {
//   user: {
//     name: "dadhwal",
//     email: "m@example.com",
//     avatar: "/avatars/shadcn.jpg",
//   },
//   teams: [
//     {
//       name: "Dadhwal NMS",
//       logo: Network,
//       plan: "Enterprise",
//     },
//     // {
//     //   name: "Acme Corp.",
//     //   logo: AudioWaveform,
//     //   plan: "Startup",
//     // },
//     // {
//     //   name: "Evil Corp.",
//     //   logo: Command,
//     //   plan: "Free",
//     // },
//   ],
//   navMain: [
//     {
//       title: "Dashboard",
//       url: "/dashboard",
//       icon: LayoutDashboard,
//       isActive: true,
//     },
//     {
//       title: "Devices",
//       url: "/devices",
//       icon: Smartphone,
//     },
//     {
//       title: "Locations",
//       url: "/locations",
//       icon: MapPin,
//     },
//     {
//       title: "Workers",
//       url: "/workers",
//       icon: Users,
//     },
//     {
//       title: "Field Technicians",
//       url: "/field-technicians",
//       icon: HardHat,
//     },
//   ],
//   projects: [],
// }

const baseNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    isActive: false,
  },
  {
    title: "Devices",
    url: "/devices",
    icon: Smartphone,
    isActive: false,
  },
  {
    title: "Locations",
    url: "/locations",
    icon: MapPin,
    isActive: false,
  },
  {
    title: "Areas",
    url: "/areas",
    icon: Users,
    isActive: false,
  },
  {
  title: "Reports",
  url: "/reports",
  icon: NewspaperIcon,
  isActive: false,
  items: [
    { title: "Device Reports", url: "/reports/devices" },
    { title: "Location Reports", url: "/reports/locations" },
    { title: "Area Reports", url: "/reports/workers" },
  ],
}


]

const teams = [
  {
    name: "Dadhwal NMS",
    logo: Network,
    plan: "Enterprise",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navItems = React.useMemo(() => {
    return baseNavItems.map((item) => {
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
