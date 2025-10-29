// app/dashboard/layout.tsx
import { getDashboardData } from "@/lib/getDashboardData";
import DashboardProvider from "@/providers/DashboardProvider";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard Layout - Server Component
 * Fetches data once on mount and provides it to all dashboard pages
 * Data persists across navigation within dashboard section
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Fetch all dashboard data server-side
  const initialData = await getDashboardData();

  return (
    <DashboardProvider initialData={initialData}>
      <div className="dashboard-layout min-h-screen">
        {/* Optional: Add dashboard-wide sidebar or header here */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}
