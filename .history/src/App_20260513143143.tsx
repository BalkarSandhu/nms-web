import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import "@/index.css";
import { Activity, Bell, Search } from 'lucide-react';

import { LoadingPage } from './components/loading-screen'
import { getAuthToken, clearAuthToken, subscribeToAuthChanges, extractTokenFromUrl, completeUrlTokenAuth } from '@/lib/auth'

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
import DeviceInfoPage from './device-info/page'
import LocationDetailPage from './locations/locationDetailPage'
import WorkerDetailPage from './workers/WorkersDetailPage'
import ExpertSystem from '@/expert-system/ExpertSystem'
import TopologyPage from './topology/page'
import ServicesPage from './services/page'
import HistoryPage from './history/page'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Network Overview',
  '/devices': 'Devices',
  '/locations': 'Locations',
  '/areas': 'Areas',
  '/field-technicians': 'Field Technicians',
  '/device-info': 'Device Details',
  '/topology': 'Topology',
  '/history': 'History',
  '/reports': 'Reports',
  '/services':'Services',
  '/reports/devices': 'Device Reports',
  '/reports/locations': 'Location Reports',
  '/reports/workers': 'Area Reports',
  '/register': 'Register',
  '/login': 'Login',
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs tabular-nums text-[var(--text-mid)]">
      {now.toUTCString().slice(17, 25)} UTC
    </span>
  )
}

function HeaderBar({ pageName }: { pageName: string }) {
  return (
    <header
      className="sticky top-0 z-50 h-14 shrink-0 w-full border-b border-[var(--border-soft)]"
      style={{
        backgroundColor: 'rgba(11,18,32,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-3 px-4 w-full h-full">
        <SidebarTrigger className="text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors" />
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-5 bg-[var(--border-soft)]"
        />

        <Breadcrumb>
          <BreadcrumbList className="text-[var(--text-mid)]">
            <BreadcrumbItem className="hidden md:flex items-center gap-1.5">
              <Activity className="size-3.5 text-[var(--brand)]" />
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-lo)]">DWI NMS</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block text-[var(--text-dim)]" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-[var(--text-hi)] text-sm font-medium">{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex-1" />

        {/* Search */}
        <label className="hidden md:flex items-center gap-2 px-3 h-8 rounded-md border border-[var(--border-soft)] bg-[var(--bg-panel)]/60 text-xs text-[var(--text-lo)] focus-within:border-[var(--border-brand)] transition-colors">
          <Search className="size-3.5" />
          <input
            type="search"
            placeholder="Search devices, locations…"
            className="bg-transparent outline-none w-56 placeholder:text-[var(--text-dim)] text-[var(--text-hi)]"
          />
          <kbd className="hidden lg:inline-block text-[10px] font-mono text-[var(--text-dim)] border border-[var(--border-soft)] rounded px-1">⌘K</kbd>
        </label>

        {/* Live status pill */}
        <div className="nms-chip nms-chip-live hidden sm:inline-flex">
          <span>Live</span>
          <LiveClock />
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative size-8 inline-flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-panel)]/60 text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--border-brand)] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/devices" element={<DevicesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/reports/devices" element={<DevicesReportsPage />} />
      <Route path="/reports/locations" element={<LocationsReportsPage />} />
      <Route path="/reports/workers" element={<WorkersReportsPage />} />
      <Route path="/locations" element={<LocationsPage />} />
      <Route path="/locations/:id" element={<LocationDetailPage />} />
      <Route path="/areas" element={<WorkersPage />} />
      <Route path="/areas/:id" element={<WorkerDetailPage />} />
      <Route path="/field-technicians" element={<WorkersPage />} />
      <Route path="/field-technicians/:id" element={<WorkerDetailPage />} />
      <Route path="/device-info" element={<DeviceInfoPage />} />
      <Route path="/topology" element={<TopologyPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  )
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
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
        handleTokenInvalid()
        return
      }
      expiryTimeoutRef.current = window.setTimeout(() => {
        handleTokenInvalid()
      }, msUntilExpiry)
    },
    [clearExpiryTimer, handleTokenInvalid]
  )

  useEffect(() => {
    return () => clearExpiryTimer()
  }, [clearExpiryTimer])

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!isInitialMount.current) return
      isInitialMount.current = false

      if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
        setIsLoading(false)
        setIsInitialized(true)
        setIsAuthenticated(true)
        return
      }

      const urlToken = extractTokenFromUrl()
      if (urlToken) {
        try {
          await completeUrlTokenAuth(urlToken)
          const url = new URL(window.location.href)
          url.searchParams.delete('token')
          window.history.replaceState({}, '', url.toString())

          setIsLoading(false)
          setIsInitialized(true)
          setIsAuthenticated(true)

          const validToken = getAuthToken()
          if (validToken) scheduleExpiryTimer(validToken.expiresAt ?? null)
          return
        } catch (error) {
          console.error('URL token authentication failed:', error)
          const url = new URL(window.location.href)
          url.searchParams.delete('token')
          window.history.replaceState({}, '', url.toString())
        }
      }

      const validToken = getAuthToken()
      if (validToken) {
        setIsLoading(false)
        setIsInitialized(true)
        setIsAuthenticated(true)
        scheduleExpiryTimer(validToken.expiresAt ?? null)
        return
      }

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
    if (!isAuthenticated) setIsAuthenticated(true)
  }, [location.pathname, isAuthenticated, clearExpiryTimer, scheduleExpiryTimer])

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
      }
    })
    return () => {
      unsubscribe?.()
      clearExpiryTimer()
    }
  }, [scheduleExpiryTimer, clearExpiryTimer, navigate])

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') return

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const tokenState = getAuthToken()
      if (!tokenState) {
        handleTokenInvalid()
        return
      }
      scheduleExpiryTimer(tokenState.expiresAt ?? null)
      if (!isAuthenticated) setIsAuthenticated(true)
    }

    window.addEventListener('focus', handleVisibility)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleVisibility)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [handleTokenInvalid, scheduleExpiryTimer, isAuthenticated])

  useEffect(() => {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') return
    if (isLoading) return

    const currentPath = location.pathname

    if (isAuthenticated) {
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        navigate('/', { replace: true })
      }
      return
    }
    if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
      navigate(isInitialized ? '/login' : '/register', { replace: true })
      return
    }
    if (currentPath === '/') {
      navigate(isInitialized ? '/login' : '/register', { replace: true })
    }
  }, [isAuthenticated, isInitialized, location.pathname, navigate, isLoading])

  const path = location.pathname
  const useLayout = !path.startsWith('/register') && !path.startsWith('/login')
  const pageName = PAGE_TITLES[path] ?? 'Network Manager'

  if (isLoading) return <LoadingPage />

  if (!useLayout) {
    return (
      <div className="min-h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
        <AppRoutes />
        <ExpertSystem />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
      <SidebarProvider defaultOpen className="flex-1 overflow-hidden">
        <AppSidebar />
        <SidebarInset className="p-0 m-0 flex-1 min-w-0 overflow-hidden" style={{ backgroundColor: 'transparent' }}>
          <div className="flex h-full w-full flex-col overflow-hidden">
            <HeaderBar pageName={pageName} />
            <div className="flex-1 min-w-0 overflow-x-auto">
              <AppRoutes />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <ExpertSystem />
    </div>
  )
}

export default App
