// providers/index.ts
// Central exports for all providers

export { default as DashboardProvider, useDashboard, useDashboardDevices, useDashboardLocations, useDashboardStats } from "./DashboardProvider";
export { default as SWRProvider, useDevices, useDevice, useLocations, useLocationMapping, useStatistics, useDeviceInfo } from "./SWRProvider";
