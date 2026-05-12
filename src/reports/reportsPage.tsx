import { useEffect, useState, useMemo } from "react";
import { useAppSelector } from '@/store/hooks';
// import { useEnrichedDevices } from "../devices/local_components/table";

import { ChartOptions, FontSpec } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import type { EnrichedWorker } from "@/workers/local-components/table";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Apply dark-friendly defaults so charts read clearly on the NOC background.
ChartJS.defaults.color = '#CBD5E1';
ChartJS.defaults.borderColor = 'rgba(148,163,184,0.15)';
ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  
  // Get workers and devices from Redux
  const workers = useAppSelector(state => state.workers.workers);
  const devices = useAppSelector(state => state.devices.devices);

  // Create enriched workers with device count and utilization
  const enrichedWorkers = useMemo((): EnrichedWorker[] => {
    return workers.map(worker => {
      const workerDevices = devices.filter(d => d.worker_id === worker.id);
      const deviceCount = workerDevices.length;
      const utilizationPercent = worker.max_devices > 0 
        ? Math.round((deviceCount / worker.max_devices) * 100)
        : 0;

      return {
        ...worker,
        deviceCount,
        utilizationPercent
      };
    });
  }, [workers, devices]);

  useEffect(() => {
    // Simulate data fetch completion
    if (devices.length > 0 || workers.length > 0) {
      setLoading(false);
    }
  }, [devices, workers]);

  const activeDevicesPerWorker = useMemo(() => {
    if (!devices.length) return [];

    const workerMap: Record<string, { id: string; name: string; active: number; total: number }> = {};

    devices.forEach((d) => {
      const workerId = d.worker.id || "unassigned";
      const hostname = d.worker.name || workerId;
      
      if (!workerMap[workerId]) {
        workerMap[workerId] = { id: workerId, name: hostname, active: 0, total: 0 };
      }
      
      workerMap[workerId].total += 1;
      
      if (d.is_reachable && !d.disabled) {
        workerMap[workerId].active += 1;
      }
    });

    const result = Object.values(workerMap)
      .map(({ id, name, active, total }) => ({ 
        worker: name,
        workerId: id,
        count: active,
        total: total,
        percentage: total > 0 ? Math.round((active / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    console.log("📊 Active Devices Per Worker:", result);
    return result;
  }, [devices]);

  // Now uses enriched data directly - no manual mapping!
  const devicesPerType = useMemo(() => {
    if (!devices.length) return [];
    const typeMap: Record<string, number> = {};
    devices.forEach((d) => {
      const typeName = d.device_type.name || "Unknown";
      typeMap[typeName] = (typeMap[typeName] || 0) + 1;
    });
    return Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [devices]);

  const metrics = useMemo(() => {
    const totalDevices = devices.length;
    const activeDevices = devices.filter((d) => d.is_reachable && !d.disabled).length;
    const uniqueWorkers = workers.length;
    const devicesWithIssues = devices.filter((d) => d.consecutive_failures > 0).length;

    return {
      totalDevices,
      activeDevices,
      uniqueWorkers,
      devicesWithIssues,
      healthPercentage: totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0,
    };
  }, [devices, workers]);

  // Bar chart configuration for workers
  const workerChartData = {
    labels: activeDevicesPerWorker.map(d => d.worker),
    datasets: [{
      label: 'Active Devices',
      data: activeDevicesPerWorker.map(d => d.count),
      backgroundColor: '#4F46E5',
      borderRadius: 8,
    }]
  };
  

  const workerChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataIndex = context.dataIndex;
            const item = activeDevicesPerWorker[dataIndex];
            return [
              `Active: ${item.count} devices`,
              `Total: ${item.total} devices`,
              `Health: ${item.percentage}%`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Pie chart configuration for device types
  const typeChartData = {
    labels: devicesPerType.map(d => `${d.type}: ${d.count}`),
    datasets: [{
      label: 'Device Count by Type',
      data: devicesPerType.map(d => d.count),
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40',
        '#FF6384',
        '#C9CBCF',
      ],
      borderColor: '#fff',
      borderWidth: 2,
    }]
  };

  const typeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}% (${value} devices)`;
          }
        }
      }
    }
  };

  // Bar chart configuration for worker utilizations
  const workerUtilizationData = {
  labels: enrichedWorkers.map(w => w.name),
  datasets: [
    {
      label: 'Utilization %',
      data: enrichedWorkers.map(w => w.utilizationPercent),
      backgroundColor: enrichedWorkers.map(w =>
        w.utilizationPercent! > 100
          ? '#EF4444'
          : w.status?.toLowerCase() === 'online' || w.status?.toLowerCase() === 'active'
          ? '#10B981'
          : '#FCA5A5'
      ),
      borderColor: enrichedWorkers.map(w =>
        w.utilizationPercent! > 100
          ? '#DC2626'
          : w.status?.toLowerCase() === 'online' || w.status?.toLowerCase() === 'active'
          ? '#059669'
          : '#F87171'
      ),
      borderWidth: 2,
      borderRadius: 8,

      // ✅ Dataset-level options
      barPercentage: 0.2,
      categoryPercentage: 0.3,
    },
  ],
};




const workerUtilizationOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'x',
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: 3,
      titleFont: { size: 14, weight: 'bold' } as Partial<FontSpec>,
      bodyFont: { size: 12 } as Partial<FontSpec>,
      callbacks: {
        title: (context) => context[0]?.label || 'Worker',
        label: (context) => {
          const dataIndex = context.dataIndex;
          const worker = enrichedWorkers[dataIndex];
          const utilization = context.parsed.y;
          const status =
            worker.status?.toLowerCase() === 'online' ||
            worker.status?.toLowerCase() === 'active'
              ? '🟢 Online'
              : '🔴 Offline';
          const warning = utilization != null && utilization > 100 ? ' ⚠️ CRITICAL' : '';
          return [
            `Utilization: ${utilization}%${warning}`,
            `Status: ${status}`,
            `Devices: ${worker.deviceCount}/${worker.max_devices}`
          ];
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: Math.max(150, Math.max(...enrichedWorkers.map(w => w.utilizationPercent)) + 20),
      title: {
        display: true,
        text: 'Utilization %',
        font: { size: 14, weight: 'bold' } as Partial<FontSpec>
      },
      ticks: {
        stepSize: 50,
        callback: (value) => `${value}%`,
        font: { size: 11 } as Partial<FontSpec>
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Worker Name',
        font: { size: 14, weight: 'bold' } as Partial<FontSpec>
      },
      ticks: {
        autoSkip: false,
        maxRotation: 45,
        minRotation: 0,
        font: { size: 10 } as Partial<FontSpec>
      },
      grid: { display: false }
    }
  }
};


  return (
    <div className="w-full h-full p-6 fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-hi)' }}>
          Reports Dashboard
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-lo)' }}>
          Aggregated network analytics across devices, workers and types
        </p>
      </div>

      {loading && (
        <div
          className="rounded-lg p-4 mb-6 nms-panel-flat flex items-center gap-3"
          style={{ borderColor: 'var(--border-brand)' }}
        >
          <span className="spinner size-4 rounded-full border-2" style={{ borderColor: 'rgba(34,211,238,0.25)', borderTopColor: 'var(--brand)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-hi)' }}>Loading report data…</p>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#FCA5A5' }}>{error}</p>
        </div>
      )}

      {!loading && devices.length === 0 && workers.length === 0 && (
        <div className="nms-panel-flat p-8 text-center">
          <p className="text-base" style={{ color: 'var(--text-mid)' }}>No data found</p>
        </div>
      )}

      {(devices.length > 0 || workers.length > 0) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatTile label="Total Devices" value={metrics.totalDevices} accent="brand" />
            <StatTile label="Active Devices" value={metrics.activeDevices} sub={`${metrics.healthPercentage}% healthy`} accent="online" />
            <StatTile label="Workers" value={metrics.uniqueWorkers} accent="info" />
            <StatTile label="Devices with Issues" value={metrics.devicesWithIssues} accent="offline" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ReportCard title="Active Devices per Worker">
              {activeDevicesPerWorker.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-sm" style={{ color: 'var(--text-lo)' }}>
                  No active devices assigned to workers
                </div>
              ) : (
                <div style={{ height: '350px' }}>
                  <Bar data={workerChartData} options={workerChartOptions} />
                </div>
              )}
            </ReportCard>

            <ReportCard title="Devices by Type">
              {devicesPerType.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-sm" style={{ color: 'var(--text-lo)' }}>
                  No device types found
                </div>
              ) : (
                <div style={{ height: '350px' }}>
                  <Pie data={typeChartData} options={typeChartOptions} />
                </div>
              )}
            </ReportCard>
          </div>

          <ReportCard title="Worker Utilization">
            {enrichedWorkers.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-sm" style={{ color: 'var(--text-lo)' }}>
                No workers found
              </div>
            ) : (
              <div style={{ height: '400px' }}>
                <Bar data={workerUtilizationData} options={workerUtilizationOptions} />
              </div>
            )}
          </ReportCard>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, sub, accent = 'brand' }: { label: string; value: number; sub?: string; accent?: 'brand' | 'online' | 'offline' | 'info' }) {
  const color =
    accent === 'online'  ? 'var(--status-online)'  :
    accent === 'offline' ? 'var(--status-offline)' :
    accent === 'info'    ? 'var(--status-info)'    : 'var(--brand)';
  return (
    <div className="nms-panel-flat px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-lo)' }}>{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-lo)' }}>{sub}</div>}
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="nms-panel-flat p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--text-mid)' }}>{title}</h2>
      {children}
    </div>
  );
}