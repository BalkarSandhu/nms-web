// lib/getDashboardData.ts

export interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  location?: string;
  // Add more device properties as needed
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Add more location properties as needed
}

export interface Statistics {
  activeServices: number;
  activeWorkers: number;
  totalDevices: number;
  totalLocations: number;
  offlineWorkers: number;
  alerts?: number;
  // Add more statistics properties as needed
}

export interface DashboardData {
  devices: Device[];
  locations: Location[];
  stats: Statistics;
}

/**
 * Centralized server-side data fetcher for dashboard
 * Fetches all required data in parallel
 */
export async function getDashboardData(): Promise<DashboardData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const [devicesRes, locationsRes, statsRes] = await Promise.all([
      fetch(`${baseUrl}/api/devices`, { 
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }),
      fetch(`${baseUrl}/api/locations`, { 
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }),
      fetch(`${baseUrl}/api/statistics`, { 
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ]);

    // Check if all requests were successful
    if (!devicesRes.ok || !locationsRes.ok || !statsRes.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const [devices, locations, stats] = await Promise.all([
      devicesRes.json(),
      locationsRes.json(),
      statsRes.json(),
    ]);

    return { devices, locations, stats };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Return empty data on error
    return {
      devices: [],
      locations: [],
      stats: {
        activeServices: 0,
        activeWorkers: 0,
        totalDevices: 0,
        totalLocations: 0,
        offlineWorkers: 0,
        alerts: 0,
      },
    };
  }
}

/**
 * Alternative version with custom cache options
 * Use this for different revalidation strategies
 */
export async function getDashboardDataCached(revalidate: number = 60): Promise<DashboardData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const [devicesRes, locationsRes, statsRes] = await Promise.all([
      fetch(`${baseUrl}/api/devices`, { 
        next: { revalidate },
        headers: {
          "Content-Type": "application/json",
        },
      }),
      fetch(`${baseUrl}/api/locations`, { 
        next: { revalidate },
        headers: {
          "Content-Type": "application/json",
        },
      }),
      fetch(`${baseUrl}/api/statistics`, { 
        next: { revalidate },
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ]);

    if (!devicesRes.ok || !locationsRes.ok || !statsRes.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const [devices, locations, stats] = await Promise.all([
      devicesRes.json(),
      locationsRes.json(),
      statsRes.json(),
    ]);

    return { devices, locations, stats };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      devices: [],
      locations: [],
      stats: {
        activeServices: 0,
        activeWorkers: 0,
        totalDevices: 0,
        totalLocations: 0,
        offlineWorkers: 0,
        alerts: 0,
      },
    };
  }
}
