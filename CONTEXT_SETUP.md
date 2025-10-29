# Context System Setup - Quick Start Guide

## ✅ What Was Created

I've set up a complete data management and context system for your NMS dashboard. Here's what's been added:

### 📁 New Files Created

```
providers/
├── DashboardProvider.tsx   ✅ Main context provider for dashboard data
├── SWRProvider.tsx         ✅ SWR configuration for auto-refresh
├── index.ts                ✅ Centralized exports
└── README.md               ✅ Complete documentation

lib/
└── getDashboardData.ts     ✅ Server-side data fetcher

app/
└── dashboard/
    ├── layout.tsx          ✅ Dashboard layout with context
    └── local-components/
        └── DashboardStats.tsx  ✅ Example component using context
```

### 📦 Dependencies Installed

- ✅ `swr` - For data fetching and caching

---

## 🚀 How to Use

### Step 1: Define Your API Endpoints

You mentioned you'll define the data APIs later. When ready, update the interfaces in `lib/getDashboardData.ts` to match your actual API responses:

```ts
// lib/getDashboardData.ts
export interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  // Add your actual device properties here
}

export interface Statistics {
  activeServices: number;
  activeWorkers: number;
  // Add your actual stats properties here
}
```

### Step 2: Use in Components

Any component inside `/app/dashboard` can now access shared data:

```tsx
"use client";
import { useDashboard } from "@/providers";

export default function MyComponent() {
  const { data } = useDashboard();
  
  return (
    <div>
      <p>Active Workers: {data.stats.activeWorkers}</p>
      <p>Total Devices: {data.stats.totalDevices}</p>
    </div>
  );
}
```

### Step 3: Update Your Existing Components

Update your existing dashboard components to use the context:

**Before:**
```tsx
// Had to fetch data in each component
export default function ActiveWorkers() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/statistics')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <div>{data?.activeWorkers}</div>;
}
```

**After:**
```tsx
"use client";
import { useDashboardStats } from "@/providers";

export default function ActiveWorkers() {
  const { stats } = useDashboardStats();
  
  return <div>{stats.activeWorkers}</div>;
}
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Server: dashboard/layout.tsx                            │
│ Fetches data once with getDashboardData()               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ Client: DashboardProvider                               │
│ Wraps all dashboard pages with context                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ Components: Use hooks to access data                    │
│ • useDashboard() - Full access                          │
│ • useDashboardStats() - Only stats                      │
│ • useDashboardDevices() - Only devices                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Benefits

1. **Single Data Fetch**: Data is fetched once when entering `/dashboard`, not on every page
2. **Shared State**: All dashboard pages share the same data (no prop drilling)
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Auto-Refresh**: Optional SWR integration for live updates
5. **Optimistic Updates**: Can update UI immediately, sync with API later

---

## 💡 Common Use Cases

### 1. Display Statistics
```tsx
import { useDashboardStats } from "@/providers";

export default function StatsCard() {
  const { stats } = useDashboardStats();
  return <div>{stats.activeWorkers} Active Workers</div>;
}
```

### 2. Refresh Data Manually
```tsx
import { useDashboard } from "@/providers";

export default function RefreshButton() {
  const { refreshData, isRefreshing } = useDashboard();
  return (
    <button onClick={refreshData} disabled={isRefreshing}>
      {isRefreshing ? "Loading..." : "Refresh"}
    </button>
  );
}
```

### 3. Auto-Refreshing Component (with SWR)
```tsx
import { useStatistics } from "@/providers";

export default function LiveStats() {
  const { data, error } = useStatistics();
  // Automatically refreshes every 30 seconds
  return <div>{data?.activeWorkers}</div>;
}
```

### 4. Update Data After Mutation
```tsx
import { useDashboardDevices } from "@/providers";

export default function AddDevice() {
  const { devices, updateDevices } = useDashboardDevices();
  
  const handleAdd = async (newDevice) => {
    // Optimistic update
    updateDevices([...devices, newDevice]);
    
    // Sync with API
    await fetch("/api/addDevice", {
      method: "POST",
      body: JSON.stringify(newDevice),
    });
  };
  
  return <button onClick={handleAdd}>Add Device</button>;
}
```

---

## 🔧 Next Steps

### 1. **Update Your API Routes** (If Needed)

Make sure your API routes return the expected data structure:

```ts
// app/api/statistics/route.ts
export async function GET() {
  return Response.json({
    activeServices: 12,
    activeWorkers: 50,
    totalDevices: 100,
    totalLocations: 8,
    offlineWorkers: 8,
    alerts: 3
  });
}
```

### 2. **Convert Existing Components**

Update your existing local-components to use the context:
- ✅ `DashboardStats.tsx` - Already created as example
- 📝 `Active-Workers.tsx` - Update to use `useDashboardStats()`
- 📝 `Active-Services.tsx` - Update to use `useDashboardStats()`
- 📝 `Total-Devices.tsx` - Update to use `useDashboardStats()`
- 📝 `Total-Locaitons.tsx` - Update to use `useDashboardStats()`

### 3. **Optional: Enable SWR for Root Layout**

If you want SWR available everywhere (not just dashboard), wrap your root layout:

```tsx
// app/layout.tsx
import SWRProvider from "@/providers/SWRProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
```

### 4. **Test the Setup**

1. Navigate to `/dashboard`
2. Check browser console for any errors
3. Verify data is fetched only once (check Network tab)
4. Navigate between dashboard pages - data should persist

---

## 📚 Documentation

Full documentation is available in:
- `/providers/README.md` - Complete guide with examples
- Type definitions in `/lib/getDashboardData.ts`

---

## 🐛 Troubleshooting

### "Cannot find module 'swr'"
Run: `yarn add swr` or `npm install swr`

### "useDashboard must be used inside DashboardProvider"
Make sure your component is:
1. Marked with `"use client"`
2. Inside the `/app/dashboard` directory
3. Or wrapped with `<DashboardProvider>`

### Data not refreshing
- Check that your API endpoints are returning data
- Use `refreshData()` method or SWR hooks for live updates
- Verify `cache: "no-store"` is set in fetch calls

---

## 🎨 Example: Update Your Base-Card

Your updated `Base-Card.tsx` is ready to use! Example:

```tsx
<BaseCard 
  title="Active Workers" 
  menuGroups={[
    {
      items: [
        { type: "label", label: "Options" },
        { type: "item", label: "Refresh", onClick: handleRefresh },
        { type: "item", label: "Export", onClick: handleExport },
      ]
    }
  ]}
>
  {/* Your content */}
</BaseCard>
```

---

## ✨ What's Next?

You now have a production-ready context system! When you're ready to define your APIs:

1. Update the interfaces in `lib/getDashboardData.ts`
2. Ensure your API routes match the structure
3. Convert your existing components to use the hooks
4. Enjoy centralized, type-safe data management! 🎉

Need help with any specific component? Just ask!
