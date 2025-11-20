"use client"

import * as React from "react"
import { ChevronsUpDown} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-(--azul) text-(--contrast) transition-colors duration-200"
            >
              <div className="bg-(--azul) text-(--contrast) flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeTeam.logo className="size-4" />
          
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-(--contrast)">{activeTeam.name}</span>
              {/* <span className="truncate text-xs text-(--contrast) opacity-70">{activeTeam.plan}</span> */}
              </div>
              {/* <ChevronsUpDown className="ml-auto" /> */}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-(--dark) text-(--contrast) border border-(--azul)"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
          
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2 hover:bg-(--azul) text-(--contrast) transition-colors duration-200"
              >
                <div className="flex size-6 items-center justify-center rounded-md border border-(--azul)">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-(--azul) opacity-30" />
            
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
