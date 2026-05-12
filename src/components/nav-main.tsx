import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: { title: string; url: string }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  const location = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: 'var(--text-lo)' }}
      >
        NAVIGATION
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            location.pathname === item.url ||
            (item.url !== '/' && location.pathname.startsWith(item.url))

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    asChild
                    className={[
                      "relative transition-colors duration-150",
                      isActive
                        ? "bg-[var(--brand-soft)] text-[var(--text-hi)] font-semibold"
                        : "text-[var(--text-mid)] hover:bg-white/[0.04] hover:text-[var(--text-hi)]",
                    ].join(' ')}
                  >
                    <Link to={item.url}>
                      {/* Left active marker */}
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r"
                          style={{
                            background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%)',
                            boxShadow: '0 0 10px var(--brand)',
                          }}
                        />
                      )}
                      {item.icon && (
                        <item.icon
                          className="size-4"
                          style={{
                            color: isActive ? 'var(--brand)' : 'var(--text-lo)',
                          }}
                        />
                      )}
                      <span>{item.title}</span>
                      {item.items && (
                        <ChevronRight className="ml-auto size-4 opacity-60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {item.items && (
                  <CollapsibleContent>
                    <SidebarMenuSub
                      className="ml-3 border-l"
                      style={{ borderColor: 'var(--border-soft)' }}
                    >
                      {item.items.map((subItem) => {
                        const subActive = location.pathname === subItem.url
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={[
                                'transition-colors duration-150',
                                subActive
                                  ? 'bg-[var(--brand-soft)] text-[var(--text-hi)]'
                                  : 'text-[var(--text-mid)] hover:bg-white/[0.04] hover:text-[var(--text-hi)]',
                              ].join(' ')}
                            >
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
