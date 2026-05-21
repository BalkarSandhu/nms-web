import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import "@/index.css";
import { Server, Link2, LogOut, Clock, Download, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useOverviewMode, type OverviewMode } from '@/contexts/OverviewModeContext'
import { useAreaView } from '@/contexts/AreaViewContext'
import { useHistoryRange, HISTORY_RANGES } from '@/contexts/HistoryRangeContext'
import { useHistoryNav } from '@/contexts/HistoryNavContext'
import { useHistoryView, type HistoryView } from '@/contexts/HistoryViewContext'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/authSlice'
import { generateAreaReport } from '@/lib/report-generator'

import { LoadingPage } from './components/loading-screen'
import { getAuthToken, clearAuthToken, subscribeToAuthChanges, extractTokenFromUrl, completeUrlTokenAuth } from '@/lib/auth'

import Dashboard from '@/dashboard/page'
import MetricsDashboard from '@/dashboard/MetricsDashboard'
import AreaDetailPage from '@/areas/AreaDetailPage'
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
import TopologyPage from './topology/page'
import ServicesPage from './services/page'
import HistoryPage from './history/page'
import DowntimePage from './downtime/page'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/area-detail': 'Area Details',
  '/metrics': 'Network Metrics',
  '/devices': 'Devices',
  '/locations': 'Locations',
  '/areas': 'Areas',
  '/field-technicians': 'Field Technicians',
  '/device-info': 'Device Details',
  '/topology': 'Topology',
  '/history': 'History',
  '/downtime': 'Downtime',
  '/reports': 'Reports',
  '/services':'Services',
  '/reports/devices': 'Device Reports',
  '/reports/locations': 'Location Reports',
  '/reports/workers': 'Area Reports',
  '/register': 'Register',
  '/login': 'Login',
}

function ModeToggle() {
  const { mode, setMode } = useOverviewMode()
  const opts: { key: OverviewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'devices', label: 'Devices', icon: <Server className="size-3.5" /> },
    { key: 'links', label: 'Links', icon: <Link2 className="size-3.5" /> },
  ]
  return (
    <div role="radiogroup" aria-label="Overview mode" className="flex items-center gap-4">
      {opts.map(o => {
        const active = mode === o.key
        return (
          <label
            key={o.key}
            className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none"
            style={{
              color: active ? 'var(--brand)' : 'var(--text-mid)',
              letterSpacing: '0.04em',
            }}
          >
            <input
              type="radio"
              name="overview-mode"
              value={o.key}
              checked={active}
              onChange={() => setMode(o.key)}
              className="size-3.5 cursor-pointer"
              style={{ accentColor: 'var(--brand)' }}
            />
            {o.icon}
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

/* History Devices ⇄ Locations toggle — lives in the top header bar (just
   before Logout, like the Dashboard's mode toggle). Drives both the History
   landing area cards and the opened Area Card report. */
function HistoryViewToggle() {
  const { view, setView } = useHistoryView()
  const opts: { key: HistoryView; label: string; icon: React.ReactNode }[] = [
    { key: 'devices', label: 'Devices', icon: <Server className="size-3.5" /> },
    { key: 'locations', label: 'Locations', icon: <MapPin className="size-3.5" /> },
  ]
  return (
    <div role="radiogroup" aria-label="History data kind" className="flex items-center gap-4">
      {opts.map(o => {
        const active = view === o.key
        return (
          <label
            key={o.key}
            className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none"
            style={{
              color: active ? 'var(--brand)' : 'var(--text-mid)',
              letterSpacing: '0.04em',
            }}
          >
            <input
              type="radio"
              name="history-view"
              value={o.key}
              checked={active}
              onChange={() => setView(o.key)}
              className="size-3.5 cursor-pointer"
              style={{ accentColor: 'var(--brand)' }}
            />
            {o.icon}
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

/* Downtime Devices ⇄ Locations toggle — same as History */
function DowntimeViewToggle() {
  const { view, setView } = useHistoryView()
  const opts: { key: HistoryView; label: string; icon: React.ReactNode }[] = [
    { key: 'devices', label: 'Devices', icon: <Server className="size-3.5" /> },
    { key: 'locations', label: 'Locations', icon: <MapPin className="size-3.5" /> },
  ]
  return (
    <div role="radiogroup" aria-label="Downtime data kind" className="flex items-center gap-4">
      {opts.map(o => {
        const active = view === o.key
        return (
          <label
            key={o.key}
            className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none"
            style={{
              color: active ? 'var(--brand)' : 'var(--text-mid)',
              letterSpacing: '0.04em',
            }}
          >
            <input
              type="radio"
              name="downtime-view"
              value={o.key}
              checked={active}
              onChange={() => setView(o.key)}
              className="size-3.5 cursor-pointer"
              style={{ accentColor: 'var(--brand)' }}
            />
            {o.icon}
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

/* Radios shown when drilled into a specific area: Locations vs Devices.
   This choice applies to BOTH the table (default view) and the topology
   graph (opened via the Map icon in the table header). */
function AreaViewToggle() {
  const { tableKind, setTableKind } = useAreaView()

  const radio = (
    name: string,
    checked: boolean,
    onChange: () => void,
    label: string,
    disabled = false,
  ) => (
    <label
      key={label}
      className="inline-flex items-center gap-1.5 text-xs font-semibold select-none"
      style={{
        color: disabled ? 'var(--text-dim)' : checked ? 'var(--brand)' : 'var(--text-mid)',
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-3.5"
        style={{ accentColor: 'var(--brand)', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      {label}
    </label>
  )

  return (
    <div role="radiogroup" aria-label="Data kind" className="flex items-center gap-4">
      {radio('area-data-kind', tableKind === 'locations', () => setTableKind('locations'), 'Locations')}
      {radio('area-data-kind', tableKind === 'devices', () => setTableKind('devices'), 'Devices')}
    </div>
  )
}

/* ── First top bar: page name (left) · mode radios + Logout (right) ── */
function HeaderBar({ pageName }: { pageName: string }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isOverview = pathname === '/'
  const isHistory = pathname.startsWith('/history')
  const isAreaScreen =
    pathname.startsWith('/topology') &&
    !!new URLSearchParams(search).get('area')

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

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

        {/* Page name — left corner */}
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--text-hi)]">
          {pageName}
        </span>

        <div className="flex-1" />

        {/* Devices / Links radios — overview page only, just before Logout */}
        {isOverview && (
          <>
            <ModeToggle />
            <Separator
              orientation="vertical"
              className="data-[orientation=vertical]:h-5 bg-[var(--border-soft)] hidden sm:block"
            />
          </>
        )}

        {/* Devices / Locations radios — History page, just before Logout */}
        {isHistory && (
          <>
            <HistoryViewToggle />
            <Separator
              orientation="vertical"
              className="data-[orientation=vertical]:h-5 bg-[var(--border-soft)] hidden sm:block"
            />
          </>
        )}

        {/* Topology / Table radios — when drilled into a specific area */}
        {isAreaScreen && (
          <>
            <AreaViewToggle />
            <Separator
              orientation="vertical"
              className="data-[orientation=vertical]:h-5 bg-[var(--border-soft)] hidden sm:block"
            />
          </>
        )}

        {/* Logout — right corner */}
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors"
          style={{
            background: 'color-mix(in oklab, var(--status-offline) 12%, transparent)',
            color: 'var(--status-offline)',
            border: '1px solid color-mix(in oklab, var(--status-offline) 32%, transparent)',
            cursor: 'pointer',
          }}
        >
          <LogOut className="size-3.5" />
          Logout
        </button>
      </div>
    </header>
  )
}

/* History controls — clock-icon timeline dropdown + per-area report.
   • An area card open (?area=) → "Report" generates that area's PDF on click.
   • All-areas page → "Report" opens a dropdown of areas; picking one
     downloads that area's PDF. Shown only on the History page. */
function HistoryControls() {
  const { range, setRange } = useHistoryRange()
  const { search } = useLocation()
  const [tlOpen, setTlOpen] = useState(false)
  const [areaOpen, setAreaOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { devices = [] } = useAppSelector(s => s.devices)
  const { locations = [] } = useAppSelector(s => s.locations)
  const { workers = [] } = useAppSelector(s => s.workers)

  const params = new URLSearchParams(search)
  const openedAreaId = params.get('area') ?? ''
  const current = HISTORY_RANGES.find(r => r.key === range)

  const areasSorted = [...workers].sort(
    (a: any, b: any) => (a.name || '').localeCompare(b.name || ''),
  )

  const runAreaReport = async (workerId: string) => {
    const w: any = workers.find((x: any) => String(x.id) === String(workerId))
    if (!w || busy) return
    const areaDevices = (devices as any[]).filter(
      d => String(d.worker_id ?? '') === String(workerId),
    )
    if (areaDevices.length === 0) return
    const locs = (locations as any[])
      .filter(l => String(l.worker_id ?? '') === String(workerId))
      .map(l => ({ id: l.id, name: l.name }))
    const metas = areaDevices.map(d => ({
      id: d.id,
      display: d.display,
      hostname: d.hostname,
      ip: d.ip,
      type: d.device_type?.name || 'Unknown',
      location: d.location?.name || 'Unknown',
      area: d.worker?.name || w.name || 'N/A',
      is_reachable: d.is_reachable,
    }))
    setBusy(true)
    try {
      await generateAreaReport(
        { id: String(w.id), name: w.name || `Area ${w.id}` },
        metas,
        locs,
        range,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Timeline — clock icon opens the range dropdown */}
      <Popover open={tlOpen} onOpenChange={setTlOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Timeline"
            aria-label="Timeline"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-colors"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-mid)',
              cursor: 'pointer',
            }}
          >
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">{current?.label ?? 'Timeline'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-40 p-1"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text-hi)',
          }}
        >
          {HISTORY_RANGES.map(r => {
            const active = range === r.key
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => { setRange(r.key); setTlOpen(false) }}
                className="w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors"
                style={{
                  background: active ? 'var(--brand-soft)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--text-mid)',
                }}
              >
                {r.label}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>

      {/* Report — direct per-area when an area is open, else pick an area */}
      {openedAreaId ? (
        <button
          type="button"
          onClick={() => runAreaReport(openedAreaId)}
          disabled={busy}
          title="Download this area's report"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'var(--brand-soft)',
            border: '1px solid var(--border-brand)',
            color: 'var(--brand)',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          <span className="hidden sm:inline">Report</span>
        </button>
      ) : (
        <Popover open={areaOpen} onOpenChange={setAreaOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={busy}
              title="Download an area report"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--border-brand)',
                color: 'var(--brand)',
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span className="hidden sm:inline">Report</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-56 p-1 max-h-[60vh] overflow-y-auto"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-hi)',
            }}
          >
            <div
              className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-lo)' }}
            >
              Select area
            </div>
            {areasSorted.length === 0 && (
              <div className="px-2.5 py-2 text-sm" style={{ color: 'var(--text-lo)' }}>
                No areas
              </div>
            )}
            {areasSorted.map((w: any) => (
              <button
                key={w.id}
                type="button"
                onClick={() => { setAreaOpen(false); runAreaReport(String(w.id)) }}
                className="w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors"
                style={{ color: 'var(--text-mid)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--brand-soft)'
                  e.currentTarget.style.color = 'var(--brand)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-mid)'
                }}
              >
                {w.name || `Area ${w.id}`}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

/* ── Second top bar: company name (left) · Live status · (History timeline) ── */
function SubHeaderBar() {
  const { pathname } = useLocation()
  const isHistory = pathname.startsWith('/history')
  const { back } = useHistoryNav()
  return (
    <div
      className="shrink-0 w-full border-b border-[var(--border-soft)] flex items-center gap-3 px-4 h-11"
      style={{ backgroundColor: 'rgba(11,18,32,0.6)' }}
    >
      {back && (
        <button
          type="button"
          onClick={back}
          title="Back to areas"
          aria-label="Back to areas"
          className="inline-flex items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-panel)] text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--border-brand)] transition-colors shrink-0"
          style={{ width: 30, height: 30, cursor: 'pointer' }}
        >
          <ArrowLeft className="size-4" />
        </button>
      )}
      <span className="text-sm md:text-base font-bold tracking-tight text-[var(--text-hi)] truncate">
        Bharat Coking Coal Limited
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{
          background: 'color-mix(in oklab, var(--status-online) 12%, transparent)',
          color: 'var(--status-online)',
          border: '1px solid color-mix(in oklab, var(--status-online) 32%, transparent)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{
            background: 'var(--status-online)',
            boxShadow: '0 0 6px var(--status-online)',
          }}
        />
        Live status
      </span>

      <div className="flex-1" />
      {isHistory && <HistoryControls />}
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/metrics" element={<MetricsDashboard />} />
      <Route path="/area-detail" element={<AreaDetailPage />} />
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
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/downtime" element={<DowntimePage />} />
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
        {/* <ExpertSystem /> */}
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
            <SubHeaderBar />
            <div className="flex-1 min-w-0 overflow-x-auto">
              <AppRoutes />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      {/* <ExpertSystem /> */}
    </div>
  )
}

export default App
