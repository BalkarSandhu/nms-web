"use client"

import * as React from "react"

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

  if (!activeTeam) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="transition-colors duration-150"
              style={{ color: 'var(--text-hi)' }}
            >
              <div
                className="flex aspect-square size-8 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%)',
                  color: 'var(--bg-app)',
                  boxShadow: '0 0 14px rgba(34,211,238,0.35)',
                }}
              >
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold" style={{ color: 'var(--text-hi)' }}>
                  {activeTeam.name}
                </span>
                <span className="truncate text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>
                  Network Operations
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-soft)',
              color: 'var(--text-hi)',
            }}
          >
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>
              Workspaces
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2 transition-colors duration-150 hover:bg-white/[0.05]"
                style={{ color: 'var(--text-hi)' }}
              >
                <div
                  className="flex size-6 items-center justify-center rounded-md border"
                  style={{ borderColor: 'var(--border-strong)' }}
                >
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator style={{ backgroundColor: 'var(--border-soft)' }} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
