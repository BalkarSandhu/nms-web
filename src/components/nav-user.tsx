import { useNavigate } from "react-router-dom"
import { useAppDispatch } from "@/store/hooks"
import { logout } from "@/store/authSlice"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavUser() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={handleLogout}
          title="Log out"
          className="transition-all duration-200 cursor-pointer group"
          style={{ color: 'var(--text-mid)' }}
        >
          {/* <span
            className="flex aspect-square size-8 items-center justify-center rounded-md transition-colors"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.30)',
              color: 'var(--status-offline)',
            }}
          >
            <LogOut className="size-4" />
          </span> */}
          {/* {state === 'expanded' && (
            <div className="grid flex-1 text-left leading-tight">
              <span className="text-sm font-medium" style={{ color: 'var(--text-hi)' }}>Sign out</span>
              <span className="text-[11px]" style={{ color: 'var(--text-lo)' }}>End this session</span>
            </div>
          )} */}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
