# Dashboard Context & Data Management System

This directory contains the context providers and data management system for the NMS dashboard.

## 📁 Structure

```
providers/
├── DashboardProvider.tsx    # Main dashboard context provider
├── SWRProvider.tsx          # SWR configuration and hooks
└── index.ts                 # Centralized exports

lib/
└── getDashboardData.ts      # Server-side data fetcher

app/
└── dashboard/
    └── layout.tsx           # Dashboard layout with server-side data
```

## 🚀 How It Works

### 1. Server-Side Data Fetching (`lib/getDashboardData.ts`)

This module fetches all required dashboard data in parallel on the server:

```ts
import { getDashboardData } from "@/lib/getDashboardData";

const data = await getDashboardData();
// Returns: { devices, locations, stats }
```

**Features:**
- Parallel API calls for better performance
- Type-safe interfaces for all data structures
- Error handling with fallback values
- Support for both cached and non-cached fetching

### 2. Dashboard Layout (Server Component)

The `app/dashboard/layout.tsx` fetches data once and wraps children with the context provider:

```tsx
// app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const initialData = await getDashboardData();
  
  return (
    <DashboardProvider initialData={initialData}>
      {children}
    </DashboardProvider>
  );
}
```

**Benefits:**
- Data fetched only once when entering `/dashboard`
- Persists across all dashboard sub-pages
- No prop drilling needed

### 3. Client Context (`DashboardProvider`)

Provides reactive access to dashboard data in client components:

```tsx
"use client";
import { useDashboard } from "@/providers/DashboardProvider";

function MyComponent() {
  const { data, refreshData, isRefreshing } = useDashboard();
  
  return (
    <div>
      <p>Total Devices: {data.stats.totalDevices}</p>
      <button onClick={refreshData} disabled={isRefreshing}>
        Refresh
      </button>
    </div>
  );
}
```

**Available Hooks:**
- `useDashboard()` - Full access to all data and methods
- `useDashboardDevices()` - Only device data
- `useDashboardLocations()` - Only location data
- `useDashboardStats()` - Only statistics data

### 4. SWR Integration (Optional)

For automatic background updates and caching:

```tsx
"use client";
import { useDevices, useStatistics } from "@/providers/SWRProvider";

function LiveComponent() {
  const { data: devices, error, isLoading } = useDevices();
  const { data: stats } = useStatistics();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;
  
  return <div>Devices: {devices?.length}</div>;
}
```

**Available SWR Hooks:**
- `useDevices()` - Auto-refresh device list
- `useDevice(id)` - Single device data
- `useLocations()` - Location list
- `useLocationMapping()` - Location mapping data
- `useStatistics()` - Dashboard statistics
- `useDeviceInfo(id)` - Device info

## 📖 Usage Examples

### Example 1: Basic Dashboard Component

```tsx
"use client";
import { useDashboard } from "@/providers";

export default function DashboardStats() {
  const { data } = useDashboard();
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <h3>Total Devices</h3>
        <p>{data.stats.totalDevices}</p>
      </Card>
      <Card>
        <h3>Active Workers</h3>
        <p>{data.stats.activeWorkers}</p>
      </Card>
      <Card>
        <h3>Locations</h3>
        <p>{data.stats.totalLocations}</p>
      </Card>
    </div>
  );
}
```

### Example 2: Component with Data Updates

```tsx
"use client";
import { useDashboardDevices } from "@/providers";

export default function DeviceList() {
  const { devices, updateDevices } = useDashboardDevices();
  
  const handleAddDevice = async (newDevice) => {
    // Optimistic update
    updateDevices([...devices, newDevice]);
    
    // API call
    await fetch("/api/addDevice", {
      method: "POST",
      body: JSON.stringify(newDevice),
    });
  };
  
  return (
    <div>
      {devices.map(device => (
        <div key={device.id}>{device.name}</div>
      ))}
      <button onClick={handleAddDevice}>Add Device</button>
    </div>
  );
}
```

### Example 3: Live Updates with SWR

```tsx
"use client";
import { useStatistics } from "@/providers";

export default function LiveStats() {
  const { data, error, isLoading, mutate } = useStatistics();
  
  // Data automatically refreshes every 30 seconds
  // Manual refresh available via mutate()
  
  return (
    <div>
      <h2>Live Statistics</h2>
      {isLoading && <Spinner />}
      <p>Active Workers: {data?.activeWorkers ?? 0}</p>
      <button onClick={() => mutate()}>Refresh Now</button>
    </div>
  );
}
```

### Example 4: Refresh All Dashboard Data

```tsx
"use client";
import { useDashboard } from "@/providers";

export default function RefreshButton() {
  const { refreshData, isRefreshing } = useDashboard();
  
  return (
    <button 
      onClick={refreshData} 
      disabled={isRefreshing}
      className="btn-primary"
    >
      {isRefreshing ? "Refreshing..." : "Refresh Dashboard"}
    </button>
  );
}
```

## 🔧 Configuration

### Adjusting SWR Refresh Interval

Edit `providers/SWRProvider.tsx`:

```tsx
<SWRConfig
  value={{
    refreshInterval: 30000, // 30 seconds (default)
    // Change to 60000 for 1 minute
    // Set to 0 to disable auto-refresh
  }}
>
```

### Changing Cache Strategy

Edit `lib/getDashboardData.ts`:

```ts
// No caching (always fresh)
fetch(url, { cache: "no-store" })

// Static caching
fetch(url, { cache: "force-cache" })

// Revalidate every 60 seconds
fetch(url, { next: { revalidate: 60 } })
```

## 🎯 When to Use Each Approach

| Scenario | Use |
|----------|-----|
| Static data that rarely changes | Server Component + `getDashboardData()` |
| Need to share data across pages | `DashboardProvider` + `useDashboard()` |
| Want automatic background updates | SWR hooks (`useDevices()`, etc.) |
| Optimistic UI updates | `useDashboardDevices()` with `updateDevices()` |
| Manual refresh control | `refreshData()` from `useDashboard()` |

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Server: getDashboardData()                           │
│    Fetches data from /api/* endpoints                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Server: Dashboard Layout                             │
│    Receives initialData, wraps with DashboardProvider   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Client: DashboardProvider Context                    │
│    Provides reactive state to all child components      │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Client: Components use hooks                         │
│    useDashboard(), useDevices() (SWR), etc.             │
└─────────────────────────────────────────────────────────┘
```

## 📝 Type Definitions

All types are defined in `lib/getDashboardData.ts`:

```ts
interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  location?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

interface Statistics {
  activeServices: number;
  activeWorkers: number;
  totalDevices: number;
  totalLocations: number;
  offlineWorkers: number;
  alerts?: number;
}

interface DashboardData {
  devices: Device[];
  locations: Location[];
  stats: Statistics;
}
```

## 🚨 Important Notes

1. **Server vs Client Components:**
   - `getDashboardData()` - Server only
   - `DashboardProvider` - Client component
   - `useDashboard()` hooks - Client components only

2. **Performance:**
   - Data is fetched once per dashboard session
   - SWR provides intelligent caching and deduplication
   - Use specific hooks (`useDashboardStats()`) for better re-render optimization

3. **Error Handling:**
   - Server fetching has fallback values
   - SWR hooks expose `error` state
   - Always check for loading/error states in UI

## 🔮 Future Enhancements

- [ ] Add WebSocket support for real-time updates
- [ ] Implement optimistic mutations
- [ ] Add data persistence to localStorage
- [ ] Create middleware for authentication
- [ ] Add request debouncing for mutations
