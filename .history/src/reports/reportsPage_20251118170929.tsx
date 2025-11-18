import { Activity, MapPin, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function ReportsPage() {
  // Devices Data
  const devicesStats = {
    total: 247,
    online: 231,
    offline: 16,
    trend: "+5.2%"
  };

  const devicesChartData = [
    { name: 'Mon', online: 220, offline: 12 },
    { name: 'Tue', online: 225, offline: 10 },
    { name: 'Wed', online: 228, offline: 8 },
    { name: 'Thu', online: 235, offline: 7 },
    { name: 'Fri', online: 231, offline: 16 },
  ];

  const deviceTypeData = [
    { name: 'Routers', value: 85, color: '#3b82f6' },
    { name: 'Switches', value: 92, color: '#8b5cf6' },
    { name: 'Firewalls', value: 45, color: '#ec4899' },
    { name: 'Others', value: 25, color: '#f59e0b' },
  ];

  // Locations Data
  const locationsStats = {
    total: 42,
    active: 38,
    inactive: 4,
    trend: "+2.1%"
  };

  const locationsChartData = [
    { name: 'North', devices: 85, workers: 45 },
    { name: 'South', devices: 67, workers: 38 },
    { name: 'East', devices: 52, workers: 29 },
    { name: 'West', devices: 43, workers: 25 },
  ];

  const locationActivityData = [
    { month: 'Jan', activity: 65 },
    { month: 'Feb', activity: 72 },
    { month: 'Mar', activity: 78 },
    { month: 'Apr', activity: 85 },
    { month: 'May', activity: 90 },
    { month: 'Jun', activity: 88 },
  ];

  // Workers Data
  const workersStats = {
    total: 137,
    active: 124,
    onLeave: 13,
    trend: "+3.8%"
  };

  const workersChartData = [
    { day: 'Mon', present: 118, absent: 5 },
    { day: 'Tue', present: 121, absent: 3 },
    { day: 'Wed', present: 119, absent: 4 },
    { day: 'Thu', present: 125, absent: 2 },
    { day: 'Fri', present: 124, absent: 3 },
  ];

  const departmentData = [
    { name: 'Engineering', value: 45, color: '#10b981' },
    { name: 'Operations', value: 38, color: '#06b6d4' },
    { name: 'Maintenance', value: 32, color: '#f59e0b' },
    { name: 'Admin', value: 22, color: '#6366f1' },
  ];

  const StatCard = ({ icon: Icon, label, value, subtitle, trend }: any) => {
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
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={devicesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="online" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="offline" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Types Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={deviceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={locationsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="devices" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="workers" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Activity Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={locationActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="activity" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workersChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workers by Department</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}