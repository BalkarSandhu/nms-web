import { Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import './App.css'

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

//-- Pages
import Dashboard from '@/dashboard/page'
import RegisterPage from '@/register/page'
import LoginPage from './login/page'




function App() {
  const location = useLocation()
  const [isButtonClicked, setIsButtonClicked] = useState(false)
  
  // Determine if the current page should use the layout
  const shouldUseLayout = () => {
    const path = location.pathname
    // Pages that should NOT use layout
    if (path.startsWith('/register') || path.startsWith("/login")) {
      return false;
    }
    // All other pages use layout by default
    return true;
  }

  // Get the current page name from the route
  const getPageName = () => {
    const path = location.pathname
    if (path === '/dashboard') {
      return 'Dashboard';
    }
    if (path === '/register') {
      return 'Register';
    }
    if (path === '/settings') {
      return 'Settings';
    }
    if (path === '/devices') {
      return 'Devices';
    }
    return 'Home'
  }

  const useLayout = shouldUseLayout()

  return (
    <div className="w-full h-full">
      {useLayout ? (
        <APIProvider>
          <SidebarProvider defaultOpen>
            <AppSidebar />
            <SidebarInset className="p-0 m-0">
              <header className="flex sticky top-0 z-100 bg-(--dark) h-12 shrink-0 items-center gap-2 border-none \
        transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12\
        rounded-t-5 w-full">
                <div className="flex items-center gap-2 pl-4 w-full h-full border-b-2 border-(--base)">
                  <SidebarTrigger className="-ml-1 text-(--contrast)" />


                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4 bg-(--contrast)"
                  />


                  <SearchBar />
                  <Breadcrumb className='w-full'>
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
                  <div className="flex flex-row justify-end gap-2 w-full">
                    <button className="size-7  flex p-1 bg-(--contrast) border-2 border-(--base) \
                  hover:bg-(--contrast)/50 rounded-[10px] items-center justify-center"
                      onClick={() => setIsButtonClicked(!isButtonClicked)}
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
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </SidebarInset>
          </SidebarProvider>
        </APIProvider>
      ) : (
        <Routes>
          <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      )}
    </div>
  )
}

export default App
