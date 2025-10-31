import { Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
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

//--Custom components
import SearchBar from './dashboard/local-components/Search-Items'

//-- Contexts 
import { APIProvider } from './contexts/API-Context'

//-- Icons
import { Funnel, Moon, Bell } from 'lucide-react'
// import { is } from 'zod/v4/locales'




function App() {
  const location = useLocation()
  const [isButtonClicked, setIsButtonClicked] = useState(false)

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
    <APIProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="p-0 m-0">
          <header className="flex sticky top-0 z-100 bg-(--dark) h-12 shrink-0 items-center gap-2 border-none \
        transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12\
        rounded-t-5 w-full">
            <div className="flex items-center gap-2 pl-4">
              <SidebarTrigger className="-ml-1 text-(--contrast)" />


              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 bg-(--contrast)"
              />


              <SearchBar />
              <Breadcrumb>
                <BreadcrumbList className='text-(--contrast)'>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard" >
                      { }
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-(--contrast)">{getPageName()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex flex-row ml-130 justify-end gap-2">
                    <button className="size-7  flex p-1 bg-(--contrast) border-2 border-(--base) \
                  hover:bg-(--contrast)/50 rounded-[10px] items-center justify-center"
                  onClick={()=>setIsButtonClicked(!isButtonClicked)}
                  >
                      <Funnel className="size-3.5 text-(--base)" />
                    </button>
                    <button className="size-7  flex p-1 bg-(--contrast) border-2 border-(--base) \
                  hover:bg-(--contrast)/50 rounded-[10px] items-center justify-center">
                      <Moon className="size-3.5 text-(--base)" />
                    </button>
                    <button className="size-7  flex p-1 bg-(--contrast) border-2 border-(--base) \
                  hover:bg-(--contrast)/50 rounded-[10px] items-center justify-center">
                      <Bell className="size-3.5 text-(--base)" />
                    </button>
              </div>

            </div>
          </header>

          <Routes>
            <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
          </Routes>
        </SidebarInset>
      </SidebarProvider>
    </APIProvider>
  )
}

export default App
