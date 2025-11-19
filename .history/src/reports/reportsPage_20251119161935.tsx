import { useEffect, useState, useMemo } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { useAppSelector } from '@/store/hooks';
import { EnrichedDevice, useEnrichedDevices } from "../devices/local_components/table";
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
import { be } from "date-fns/locale";

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

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get enriched devices directly from the hook - no manual mapping needed!
  const enrichedDevices = useEnrichedDevices();
  
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
    if (enrichedDevices.length > 0 || workers.length > 0) {
      setLoading(false);
    }
  }, [enrichedDevices, workers]);

  const activeDevicesPerWorker = useMemo(() => {
    if (!enrichedDevices.length) return [];

    const workerMap: Record<string, { id: string; hostname: string; active: number; total: number }> = {};

    enrichedDevices.forEach((d) => {
      const workerId = d.worker_id || "unassigned";
      const hostname = d.worker_hostname || workerId;
      
      if (!workerMap[workerId]) {
        workerMap[workerId] = { id: workerId, hostname: hostname, active: 0, total: 0 };
      }
      
      workerMap[workerId].total += 1;
      
      if (d.status && !d.disabled) {
        workerMap[workerId].active += 1;
      }
    });

    const result = Object.values(workerMap)
      .map(({ id, hostname, active, total }) => ({ 
        worker: hostname,
        workerId: id,
        count: active,
        total: total,
        percentage: total > 0 ? Math.round((active / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    console.log("📊 Active Devices Per Worker:", result);
    return result;
  }, [enrichedDevices]);

  // Now uses enriched data directly - no manual mapping!
  const devicesPerType = useMemo(() => {
    if (!enrichedDevices.length) return [];
    const typeMap: Record<string, number> = {};
    enrichedDevices.forEach((d) => {
      const typeName = d.device_type_name || "Unknown";
      typeMap[typeName] = (typeMap[typeName] || 0) + 1;
    });
    return Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [enrichedDevices]);

  const metrics = useMemo(() => {
    const totalDevices = enrichedDevices.length;
    const activeDevices = enrichedDevices.filter((d) => d.status && !d.disabled).length;
    const uniqueWorkers = workers.length;
    const devicesWithIssues = enrichedDevices.filter((d) => d.consecutive_failures > 0).length;

    return {
      totalDevices,
      activeDevices,
      uniqueWorkers,
      devicesWithIssues,
      healthPercentage: totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0,
    };
  }, [enrichedDevices, workers]);

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
            const label = context.label || '';
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
    labels: enrichedWorkers.map(w => w.hostname),
    datasets: [
      {
        label: 'Utilization %',
        data: enrichedWorkers.map(w => w.utilizationPercent),
        backgroundColor: enrichedWorkers.map(w => 
          w.utilizationPercent > 100
            ? '#EF4444'  // Red if over 100%
            : w.status?.toLowerCase() === 'online' || w.status?.toLowerCase() === 'active'
            ? '#10B981'  // Green if online
            : '#FCA5A5'  // Light red if offline
        ),
        borderColor: enrichedWorkers.map(w => 
          w.utilizationPercent > 100
            ? '#DC2626'
            : w.status?.toLowerCase() === 'online' || w.status?.toLowerCase() === 'active'
            ? '#059669'
            : '#F87171'
        ),
        borderWidth: 2,
        borderRadius: 8,
      }
    ]
  };

  const workerUtilizationOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    barPercentage: 0.2,
    categoryPercentage: 0.3,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 3,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          title: (context: any) => {
            return context[0]?.label || 'Worker';
          },
          label: (context: any) => {
            const dataIndex = context.dataIndex;
            const worker = enrichedWorkers[dataIndex];
            const utilization = context.parsed.y;
            const status = worker.status?.toLowerCase() === 'online' || worker.status?.toLowerCase() === 'active'
              ? '🟢 Online'
              : '🔴 Offline';
            const warning = utilization > 100 ? ' ⚠️ CRITICAL' : '';
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
          font: { size: 14, weight: 'bold' }
        },
        ticks: {
          stepSize: 50,
          callback: (value: any) => `${value}%`,
          font: { size: 11 }
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
          font: { size: 14, weight: 'bold' }
        },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 0,
          font: { size: 10 }
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="w-full h-full p-6 bg-gray-50">
      <h1 className="text-xl font-bold mb-6 text-gray-800">Reports Dashboard</h1>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-700 font-medium">Loading data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {!loading && enrichedDevices.length === 0 && workers.length === 0 && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg">No data found</p>
        </div>
      )}

      {(enrichedDevices.length > 0 || workers.length > 0) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Total Devices</div>
              <div className="text-3xl font-bold text-gray-900">{metrics.totalDevices}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Active Devices</div>
              <div className="text-3xl font-bold text-green-600">{metrics.activeDevices}</div>
              <div className="text-xs text-gray-500 mt-1">{metrics.healthPercentage}% healthy</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Workers</div>
              <div className="text-3xl font-bold text-blue-600">{metrics.uniqueWorkers}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-1">Devices with Issues</div>
              <div className="text-3xl font-bold text-red-600">{metrics.devicesWithIssues}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Active Devices per Worker
              </h2>
              {activeDevicesPerWorker.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-gray-500">
                  No active devices assigned to workers
                </div>
              ) : (
                <div style={{ height: '350px' }}>
                  <Bar data={workerChartData} options={workerChartOptions} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Devices by Type
              </h2>
              {devicesPerType.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-gray-500">
                  No device types found
                </div>
              ) : (
                <div style={{ height: '350px' }}>
                  <Pie data={typeChartData} options={typeChartOptions} />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Worker Utilization
            </h2>
            {enrichedWorkers.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                No workers found
              </div>
            ) : (
              <div style={{ height: '400px' }}>
                <Bar data={workerUtilizationData} options={workerUtilizationOptions} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}