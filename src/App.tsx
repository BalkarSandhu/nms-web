import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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

import { LoadingPage } from './components/loading-screen'
import { getAuthToken, clearAuthToken, subscribeToAuthChanges } from '@/lib/auth'

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
  const navigate = useNavigate()
  const [isButtonClicked, setIsButtonClicked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  const expiryTimeoutRef = useRef<number | null>(null)
  const isInitialMount = useRef(true)

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimeoutRef.current) {
      window.clearTimeout(expiryTimeoutRef.current)
      expiryTimeoutRef.current = null
    }
  }, [])

  const handleTokenInvalid = useCallback(() => {
    clearAuthToken()
    setIsAuthenticated(false)
    navigate('/login')
  }, [navigate])

  const scheduleExpiryTimer = useCallback(
    (expiresAt?: number | null) => {
      clearExpiryTimer()
      if (!expiresAt) return

      const msUntilExpiry = expiresAt - Date.now()

      if (msUntilExpiry <= 0) {
        // Token already expired, logout immediately
        handleTokenInvalid()
        return
      }

      // Schedule logout when token expires (no refresh since backend doesn't support it)
      expiryTimeoutRef.current = window.setTimeout(() => {
        handleTokenInvalid()
      }, msUntilExpiry)
    },
    [clearExpiryTimer, handleTokenInvalid]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearExpiryTimer()
    }
  }, [clearExpiryTimer])

  // Initial auth check on mount - ALWAYS runs but checks isInitialMount inside
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Only run once on initial mount
      if (!isInitialMount.current) return
      isInitialMount.current = false

      // Auth bypass for development
      if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
        setIsLoading(false)
        setIsInitialized(true)
        setIsAuthenticated(true)
        return
      }

      // Check for valid token
      const validToken = getAuthToken()
      if (validToken) {
        setIsLoading(false)
        setIsInitialized(true)
        setIsAuthenticated(true)
        scheduleExpiryTimer(validToken.expiresAt ?? null)
        return
      }

      // No token - check if system is initialized
      try {
        const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/auth/status`)
        if (!response.ok) {
          setIsLoading(false)
          setIsAuthenticated(false)
          setIsInitialized(true)
          return
        }
        const data: { initialized: boolean; message: string; user_count: number } = await response.json()
        setIsInitialized(data.initialized)
        setIsAuthenticated(false)
      } catch (error) {
        console.error("Error checking auth status:", error)
        setIsAuthenticated(false)
        setIsInitialized(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [scheduleExpiryTimer])

  // Re-validate token on route change
  useEffect(() => {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      setIsAuthenticated(true)
      return
    }

    const tokenState = getAuthToken()
    if (!tokenState) {
      if (isAuthenticated) {
        setIsAuthenticated(false)
        clearExpiryTimer()
      }
      return
    }

    scheduleExpiryTimer(tokenState.expiresAt ?? null)
    if (!isAuthenticated) {
      setIsAuthenticated(true)
    }
  }, [location.pathname, isAuthenticated, clearExpiryTimer, scheduleExpiryTimer])

  // Sync auth updates across tabs/windows
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((event) => {
      if (event.type === 'logout') {
        clearExpiryTimer()
        setIsAuthenticated(false)
        navigate('/login')
        return
      }
      if (event.type === 'refresh' || event.type === 'login') {
        setIsAuthenticated(true)
        scheduleExpiryTimer(event.expiresAt ?? null)
        return
      }
    })

    return () => {
      unsubscribe?.()
      clearExpiryTimer()
    }
  }, [scheduleExpiryTimer, clearExpiryTimer, navigate])

  // Listen for visibility/focus changes to refresh auth state
  useEffect(() => {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      return
    }

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      const tokenState = getAuthToken()
      if (!tokenState) {
        handleTokenInvalid()
        return
      }

      scheduleExpiryTimer(tokenState.expiresAt ?? null)
      if (!isAuthenticated) {
        setIsAuthenticated(true)
      }
    }

    window.addEventListener('focus', handleVisibility)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleVisibility)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [handleTokenInvalid, scheduleExpiryTimer, isAuthenticated])

  // Handle navigation based on auth state
  useEffect(() => {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      return
    }

    // Show loading during auth state determination
    if (isLoading) {
      return
    }

    const currentPath = location.pathname

    // User is authenticated
    if (isAuthenticated) {
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        navigate('/dashboard', { replace: true })
      }
      return
    }

    // User is NOT authenticated
    if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
      navigate(isInitialized ? '/login' : '/register', { replace: true })
      return
    }

    if (currentPath === '/') {
      navigate(isInitialized ? '/login' : '/register', { replace: true })
    }
  }, [isAuthenticated, isInitialized, location.pathname, navigate, isLoading])

  // Determine if the current page should use the layout
  const shouldUseLayout = () => {
    const path = location.pathname
    return !path.startsWith('/register') && !path.startsWith("/login")
  }

  // Get the current page name from the route
  const getPageName = () => {
    const path = location.pathname
    const routes: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/register': 'Register',
      '/settings': 'Settings',
      '/devices': 'Devices',
      '/reports': 'Reports',
      '/locations': 'Locations',
      '/areas': 'Areas',
      '/field-technicians': 'Field Technicians',
    }
    return routes[path] || 'Home'
  }

  const useLayout = shouldUseLayout()

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingPage />
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-(--dark)">
      {useLayout ? (
        <SidebarProvider defaultOpen className="flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="p-0 m-0 flex-1 min-w-0 overflow-hidden">
            <div className="flex h-full w-full flex-col overflow-hidden">
              <header className="sticky top-0 z-50 h-12 shrink-0 items-center gap-2 border-none \
                                 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 \
                                 w-full" style={{ backgroundColor: 'var(--dark)' }}>
                <div className="flex sticky top-0  items-center gap-2 pl-4 w-full h-full border-b-2 border-(--base)">
                  <SidebarTrigger className="-ml-1 text-(--contrast)" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4 bg-(--contrast)"
                  />
                  <Breadcrumb className='w-full'>
                    <BreadcrumbList className='text-(--contrast)'>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard" />
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
                  <Route path="/areas" element={<WorkersPage />} />
                  <Route path="/field-technicians" element={<WorkersPage />} />
                </Routes>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <div className="flex-1 min-w-0 overflow-x-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard isButtonClicked={isButtonClicked} setIsButtonClicked={setIsButtonClicked} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/areas" element={<WorkersPage />} />
            <Route path="/field-technicians" element={<WorkersPage />} />
          </Routes>
        </div>
      )}
    </div>
  )
}

export default App