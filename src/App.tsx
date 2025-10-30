import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Dashboard from '@/dashboard/page'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import "@/index.css";
function App() {
  const location = useLocation()
  
  // Get the current page name from the route
  const getPageName = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'Dashboard'
    if (path === '/dashboard') return 'Dashboard'
    if (path === '/settings') return 'Settings'
    if (path === '/devices') return 'Devices'
    return 'Home'
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="p-0 m-0">
        <header className="flex sticky z-100 bg-(--dark) h-12 shrink-0 items-center gap-2 border-b \
        transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12\
        rounded-t-5 w-full">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 bg-(--conrast)" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 bg-(--contrast)"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    {}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageName()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <Routes> 
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
