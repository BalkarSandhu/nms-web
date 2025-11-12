import { Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
import { NotificationPopUp } from './components/Notifications'
import {LoadingPage} from './components/loading-screen'
//-- Contexts 
import { APIProvider } from './contexts/API-Context'

//-- Icons
import { Funnel, Moon } from 'lucide-react'

//-- Pages
import Dashboard from '@/dashboard/page'
import RegisterPage from '@/register/page'
import LoginPage from './login/page'
import DevicesPage from './devices/page'
import LocationsPage from './locations/page'
import WorkersPage from './workers/page'



function App() {
  const location = useLocation()
  const [isButtonClicked, setIsButtonClicked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)

  // Helper function to get cookie value by name
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  // Check system initialization status
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = getCookie('token');
      
      // If user has a token, skip initialization check
      if (token) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      // Check if system is initialized
      try {
        const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/auth/status`);
        
        if (!response.ok) {
          console.error("Failed to check auth status");
          setIsLoading(false);
          return;
        }

        const data: { initialized: boolean; message: string; user_count: number } = await response.json();
        setIsInitialized(data.initialized);
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);
  
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
    if (path === '/locations') {
      return 'Locations';
    }
    if (path === '/workers') {
      return 'Workers';
    }
    if (path === '/field-technicians') {
      return 'Field Technicians';
    }
    return 'Home'
  }

  const useLayout = shouldUseLayout()
  const token = getCookie('token');

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingPage />;
  }

  // Redirect logic based on token and initialization status
  const getRedirectPath = () => {
    const currentPath = location.pathname;
    
    // If user has token, they're logged in - allow access
    if (token) {
      // If they're on login/register, redirect to dashboard
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        return '/dashboard';
      }
      return null; // No redirect needed
    }

    // No token - check if trying to access protected routes
    if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
      // Redirect based on initialization status
      return isInitialized ? '/login' : '/register';
    }

    // On root path, redirect based on initialization
    if (currentPath === '/') {
      return isInitialized ? '/login' : '/register';
    }

    return null; // No redirect needed
  };

  const redirectPath = getRedirectPath();

  if (redirectPath) {
    window.location.href = redirectPath;
    return <LoadingPage />;
  }

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
                    <button className="size-7 flex p-1 bg-(--contrast) border-2 border-(--base) \
                    hover:bg-(--contrast)/50 rounded-[10px] items-center justify-center">
                      <NotificationPopUp Notifications={[
                      { id: 1, priority: "low", message: "Device 192.168.1.1 is offline", type: "error" },
                      { id: 2, priority: "medium", message: "Firmware update available for router", type: "info" },
                      { id: 3, priority: "high", message: "High CPU usage detected", type: "warning" }
                      ]}/>
                    </button>
                  </div>

                </div>
              </header>


              <Routes>
                <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/workers" element={<WorkersPage />} />
                <Route path="/field-technicians" element={<WorkersPage />} />
              </Routes>
            </SidebarInset>
          </SidebarProvider>
        </APIProvider>
      ) : (
        <Routes>
          <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/field-technicians" element={<WorkersPage />} />
        </Routes>
      )}
    </div>
  )
}

export default App
