import { Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
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
import { getAuthToken, clearAuthToken, subscribeToAuthChanges } from '@/lib/auth'

//-- Redux
// import { useAppDispatch } from '@/store/hooks'
// import { fetchLocationTypes } from '@/store/locationsSlice'

//-- Icons
import { Funnel, Moon } from 'lucide-react'

//-- Pages
import Dashboard from '@/dashboard/page'
import RegisterPage from '@/register/page'
import LoginPage from './login/page'
import DevicesPage from './devices/page'
import ReportsPage from './reports/reportsPage'
import DevicesReportsPage from './reports/devicesReportsPage'
import LocationsReportsPage from './reports/locationsReportsPage'
import WorkersReportsPage from './reports/workersReportsPage'

import LocationsPage from './locations/page'
import WorkersPage from './workers/page'



function App() {
  const location = useLocation()
  // const dispatch = useAppDispatch()
  const [isButtonClicked, setIsButtonClicked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  const expiryTimeoutRef = useRef<number | null>(null)

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimeoutRef.current) {
      window.clearTimeout(expiryTimeoutRef.current)
      expiryTimeoutRef.current = null
    }
  }, [])

  const handleTokenInvalid = useCallback(() => {
    clearAuthToken()
    setIsAuthenticated(false)
  }, [])

  const scheduleExpiryTimer = useCallback(
    (expiresAt?: number | null) => {
      clearExpiryTimer()
      if (!expiresAt) return

      const bufferMs = 5_000 // proactively expire 5s early
      const msUntilExpiry = expiresAt - Date.now() - bufferMs

      if (msUntilExpiry <= 0) {
        handleTokenInvalid()
        return
      }

      expiryTimeoutRef.current = window.setTimeout(handleTokenInvalid, msUntilExpiry)
    },
    [clearExpiryTimer, handleTokenInvalid]
  )

  useEffect(() => {
    return () => {
      clearExpiryTimer()
    }
  }, [clearExpiryTimer])

  // (Removed: location types are now fetched in dashboard/page.tsx)

  // Check system initialization status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      // If auth bypass is enabled, set initialized and authenticated
      if(import.meta.env.VITE_AUTH_BYPASS === 'true'){
        setIsLoading(false);
        setIsInitialized(true);
        setIsAuthenticated(true);
        return;
      }

      const validToken = getAuthToken();
      
      // If user has a valid token, they're authenticated
      if (validToken) {
        setIsLoading(false);
        setIsInitialized(true);
        setIsAuthenticated(true);
        scheduleExpiryTimer(validToken.expiresAt ?? null)
        return;
      }

      // No valid token - check if system is initialized
      try {
        const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/auth/status`);
        
        if (!response.ok) {
          console.error("Failed to check auth status");
          setIsLoading(false);
          setIsAuthenticated(false);
          return;
        }

        const data: { initialized: boolean; message: string; user_count: number } = await response.json();
        setIsInitialized(data.initialized);
        setIsAuthenticated(false);
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [scheduleExpiryTimer]);

  // Re-validate token on every route change
  useEffect(() => {
    // Skip validation for auth bypass mode
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      setIsAuthenticated(true);
      return;
    }

    const tokenState = getAuthToken();

    if (!tokenState) {
      if (isAuthenticated) {
        setIsAuthenticated(false);
        clearExpiryTimer();
      }
      return;
    }

    scheduleExpiryTimer(tokenState.expiresAt ?? null);

    if (!isAuthenticated) {
      setIsAuthenticated(true);
    }
  }, [location.pathname, isAuthenticated, clearExpiryTimer, scheduleExpiryTimer]);

  // Listen for visibility/focus changes to refresh auth state
  useEffect(() => {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      return;
    }

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      const tokenState = getAuthToken();

      if (!tokenState) {
        handleTokenInvalid();
        clearExpiryTimer();
        return;
      }

      scheduleExpiryTimer(tokenState.expiresAt ?? null);
      if (!isAuthenticated) {
        setIsAuthenticated(true);
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [handleTokenInvalid, clearExpiryTimer, scheduleExpiryTimer, isAuthenticated]);

  // Sync auth updates across tabs/windows
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((event) => {
      if (event.type === 'logout') {
        clearExpiryTimer();
        setIsAuthenticated(false);
        return;
      }

      const tokenState = getAuthToken();
      if (tokenState) {
        setIsAuthenticated(true);
        scheduleExpiryTimer(tokenState.expiresAt ?? null);
      }
    });

    return () => {
      unsubscribe?.();
      clearExpiryTimer();
    };
  }, [scheduleExpiryTimer, clearExpiryTimer]);
  
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
    if(path === '/reports'){
      return 'Reports';
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

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingPage />;
  }

  // Redirect logic based on authentication and initialization status
  const getRedirectPath = () => {
    // If auth bypass is enabled, never redirect
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      return null;
    }

    const currentPath = location.pathname;

    // User is authenticated
    if (isAuthenticated) {
      // Redirect away from login/register to dashboard
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        return '/dashboard';
      }
      // Allow access to protected routes
      return null;
    }

    // User is NOT authenticated
    // If trying to access protected routes, redirect to login/register
    if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
      return isInitialized ? '/login' : '/register';
    }

    // On root path, redirect based on initialization
    if (currentPath === '/') {
      return isInitialized ? '/login' : '/register';
    }

    // Already on login/register, no redirect needed
    return null;
  };

  const redirectPath = getRedirectPath();

  if (redirectPath) {
    window.location.href = redirectPath;
    return <LoadingPage />;
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-(--dark)">


      {useLayout ? (
        <APIProvider>
          <SidebarProvider defaultOpen className="flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="p-0 m-0 flex-1 min-w-0 overflow-hidden">
              <div className="flex sticky top-0 h-full w-full flex-col overflow-hidden">
                <header className="flex sticky top-0 z-50 h-12 shrink-0 items-center gap-2 border-none \
        transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 w-full" style={{backgroundColor: 'var(--dark)'}}>
                <div className="flex sticky top-0  items-center gap-2 pl-4 w-full h-full border-b-2 border-(--base)">
                  <SidebarTrigger className="-ml-1 text-(--contrast)" />


                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4 bg-(--contrast)"
                  />


                 
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
                  

                </div>
              </header>


              <div className="flex-1 min-w-0 overflow-x-auto">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/devices" element={<DevicesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/devices" element={<DevicesReportsPage />} />
                  <Route path="/reports/locations" element={<LocationsReportsPage />} />
                  <Route path="/reports/workers" element={<WorkersReportsPage />} />
                  <Route path="/locations" element={<LocationsPage />} />
                  <Route path="/workers" element={<WorkersPage />} />
                  <Route path="/field-technicians" element={<WorkersPage />} />
                </Routes>
              </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </APIProvider>
      ) : (
        <div className="flex-1 min-w-0 overflow-x-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/field-technicians" element={<WorkersPage />} />
          </Routes>
        </div>
      )}
    </div>
  )
}

export default App
