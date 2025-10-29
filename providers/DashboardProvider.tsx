"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { DashboardData, Device, Location, Statistics } from "@/lib/getDashboardData";

interface DashboardContextType {
  data: DashboardData;
  setData: (data: DashboardData) => void;
  updateDevices: (devices: Device[]) => void;
  updateLocations: (locations: Location[]) => void;
  updateStats: (stats: Statistics) => void;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

interface DashboardProviderProps {
  initialData: DashboardData;
  children: React.ReactNode;
}

/**
 * DashboardProvider - Client-side context provider for dashboard data
 * Wraps dashboard pages and provides reactive access to shared data
 */
export default function DashboardProvider({ initialData, children }: DashboardProviderProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update individual data slices
  const updateDevices = useCallback((devices: Device[]) => {
    setData((prev) => ({ ...prev, devices }));
  }, []);

  const updateLocations = useCallback((locations: Location[]) => {
    setData((prev) => ({ ...prev, locations }));
  }, []);

  const updateStats = useCallback((stats: Statistics) => {
    setData((prev) => ({ ...prev, stats }));
  }, []);

  // Refresh all data from APIs
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [devicesRes, locationsRes, statsRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/locations"),
        fetch("/api/statistics"),
      ]);

      if (devicesRes.ok && locationsRes.ok && statsRes.ok) {
        const [devices, locations, stats] = await Promise.all([
          devicesRes.json(),
          locationsRes.json(),
          statsRes.json(),
        ]);

        setData({ devices, locations, stats });
      }
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const value: DashboardContextType = {
    data,
    setData,
    updateDevices,
    updateLocations,
    updateStats,
    refreshData,
    isRefreshing,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

/**
 * useDashboard - Hook to access dashboard context
 * Must be used within DashboardProvider
 */
export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return ctx;
}

/**
 * Individual hooks for specific data slices
 * Use these for components that only need specific data
 */
export function useDashboardDevices() {
  const { data, updateDevices } = useDashboard();
  return { devices: data.devices, updateDevices };
}

export function useDashboardLocations() {
  const { data, updateLocations } = useDashboard();
  return { locations: data.locations, updateLocations };
}

export function useDashboardStats() {
  const { data, updateStats } = useDashboard();
  return { stats: data.stats, updateStats };
}
