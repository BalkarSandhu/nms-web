import { Activity, MapPin, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ReportsPage() {
  const devicesLineRef = useRef(null);
  const devicesPieRef = useRef(null);
  const locationsBarRef = useRef(null);
  const locationsLineRef = useRef(null);
  const workersBarRef = useRef(null);
  const workersPieRef = useRef(null);

  // Devices Data
  const devicesStats = {
    total: 247,
    online: 231,
    offline: 16,
    trend: "+5.2%"
  };

  // Locations Data
  const locationsStats = {
    total: 42,
    active: 38,
    inactive: 4,
    trend: "+2.1%"
  };

  // Workers Data
  const workersStats = {
    total: 137,
    active: 124,
    onLeave: 13,
    trend: "+3.8%"
  };

  useEffect(() => {
    let charts = [];

    // Devices Line Chart
    if (devicesLineRef.current) {
      const ctx = devicesLineRef.current.getContext('2d');
      charts.push(new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [
            {
              label: 'Online',
              data: [220, 225, 228, 235, 231],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: 'Offline',
              data: [12, 10, 8, 7, 16],
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      }));
    }

    // Devices Pie Chart
    if (devicesPieRef.current) {
      const ctx = devicesPieRef.current.getContext('2d');
      charts.push(new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Routers', 'Switches', 'Firewalls', 'Others'],
          datasets: [{
            data: [85, 92, 45, 25],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      }));
    }

    // Locations Bar Chart
    if (locationsBarRef.current) {
      const ctx = locationsBarRef.current.getContext('2d');
      charts.push(new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['North', 'South', 'East', 'West'],
          datasets: [
            {
              label: 'Devices',
              data: [85, 67, 52, 43],
              backgroundColor: '#8b5cf6',
              borderRadius: 8
            },
            {
              label: 'Workers',
              data: [45, 38, 29, 25],
              backgroundColor: '#06b6d4',
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      }));
    }

    // Locations Line Chart
    if (locationsLineRef.current) {
      const ctx = locationsLineRef.current.getContext('2d');
      charts.push(new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Activity',
            data: [65, 72, 78, 85, 90, 88],
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      }));
    }

    // Workers Bar Chart
    if (workersBarRef.current) {
      const ctx = workersBarRef.current.getContext('2d');
      charts.push(new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [
            {
              label: 'Present',
              data: [118, 121, 119, 125, 124],
              backgroundColor: '#10b981',
              borderRadius: 8
            },
            {
              label: 'Absent',
              data: [5, 3, 4, 2, 3],
              backgroundColor: '#ef4444',
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      }));
    }

    // Workers Pie Chart
    if (workersPieRef.current) {
      const ctx = workersPieRef.current.getContext('2d');
      charts.push(new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Engineering', 'Operations', 'Maintenance', 'Admin'],
          datasets: [{
            data: [45, 38, 32, 22],
            backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#6366f1'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      }));
    }

    return () => {
      charts.forEach(chart => chart.destroy());
    };
  }, []);

  const StatCard = ({ icon: Icon, label, value, subtitle, trend }) => {
    const isPositive = trend?.startsWith('+');
    const isNeutral = !trend?.startsWith('+') && !trend?.startsWith('-');
    
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              isPositive ? 'bg-green-100 text-green-700' : 
              isNeutral ? 'bg-gray-100 text-gray-700' : 
              'bg-red-100 text-red-700'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : 
               isNeutral ? <Minus className="w-3 h-3" /> : 
               <TrendingDown className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time monitoring and analytics</p>
      </div>

      {/* DEVICES SECTION */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Devices</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatCard icon={Activity} label="Total Devices" value={devicesStats.total} trend={devicesStats.trend} />
          <StatCard icon={Activity} label="Online" value={devicesStats.online} subtitle="93.5% uptime" trend="+2.3%" />
          <StatCard icon={Activity} label="Offline" value={devicesStats.offline} subtitle="6.5% downtime" trend="-1.2%" />
          <StatCard icon={Activity} label="Avg Response" value="45ms" subtitle="Last 24h" trend="+0.5%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Status Trend</h3>
            <div className="h-64">
              <canvas ref={devicesLineRef}></canvas>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Types Distribution</h3>
            <div className="h-64">
              <canvas ref={devicesPieRef}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* LOCATIONS SECTION */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Locations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatCard icon={MapPin} label="Total Locations" value={locationsStats.total} trend={locationsStats.trend} />
          <StatCard icon={MapPin} label="Active" value={locationsStats.active} subtitle="90.5% active" trend="+1.8%" />
          <StatCard icon={MapPin} label="Inactive" value={locationsStats.inactive} subtitle="9.5% inactive" trend="-0.3%" />
          <StatCard icon={MapPin} label="Avg Coverage" value="95.2%" subtitle="Network coverage" trend="+1.1%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Devices & Workers by Location</h3>
            <div className="h-64">
              <canvas ref={locationsBarRef}></canvas>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Activity Trend</h3>
            <div className="h-64">
              <canvas ref={locationsLineRef}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* WORKERS SECTION */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Workers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatCard icon={Users} label="Total Workers" value={workersStats.total} trend={workersStats.trend} />
          <StatCard icon={Users} label="Active" value={workersStats.active} subtitle="90.5% present" trend="+2.1%" />
          <StatCard icon={Users} label="On Leave" value={workersStats.onLeave} subtitle="9.5% absent" trend="-0.8%" />
          <StatCard icon={Users} label="Avg Productivity" value="87.5%" subtitle="This month" trend="+3.2%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Attendance</h3>
            <div className="h-64">
              <canvas ref={workersBarRef}></canvas>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workers by Department</h3>
            <div className="h-64">
              <canvas ref={workersPieRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}