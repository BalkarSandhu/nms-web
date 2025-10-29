"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * SWRProvider - Global SWR configuration
 * Provides automatic caching, revalidation, and background data fetching
 */
export default function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Default fetcher for all SWR hooks
        fetcher: (url: string) => fetch(url).then((res) => {
          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }
          return res.json();
        }),
        
        // Revalidate data every 30 seconds
        refreshInterval: 30000,
        
        // Revalidate on focus
        revalidateOnFocus: true,
        
        // Revalidate on reconnect
        revalidateOnReconnect: true,
        
        // Dedupe requests within 2 seconds
        dedupingInterval: 2000,
        
        // Error retry configuration
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        
        // Keep previous data while revalidating
        keepPreviousData: true,
        
        // Don't revalidate on mount if data is fresh
        revalidateIfStale: false,
        
        // Suspense mode (optional)
        suspense: false,
        
        // On error callback
        onError: (error, key) => {
          console.error(`SWR Error for ${key}:`, error);
        },
        
        // On success callback (optional)
        // onSuccess: (data, key) => {
        //   console.log(`SWR Success for ${key}`);
        // },
      }}
    >
      {children}
    </SWRConfig>
  );
}

/**
 * Custom SWR hooks for specific endpoints
 * Use these in client components for automatic caching and revalidation
 */
import useSWR from "swr";

export function useDevices() {
  return useSWR("/api/devices");
}

export function useDevice(deviceId: string | null) {
  return useSWR(deviceId ? `/api/devices/${deviceId}` : null);
}

export function useLocations() {
  return useSWR("/api/locations");
}

export function useLocationMapping() {
  return useSWR("/api/locations/mapping");
}

export function useStatistics() {
  return useSWR("/api/statistics");
}

export function useDeviceInfo(deviceId: string | null) {
  return useSWR(deviceId ? `/api/deviceInfo?id=${deviceId}` : null);
}
