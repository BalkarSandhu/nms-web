import { Activity, MapPin, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    { name: 'Routers', value: 85, color: '#3b82f6', percent: 34.5 },
    { name: 'Switches', value: 92, color: '#8b5cf6', percent: 37.4 },
    { name: 'Firewalls', value: 45, color: '#ec4899', percent: 18.3 },
    { name: 'Others', value: 25, color: '#f59e0b', percent: 9.8 },
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
    { name: 'Engineering', value: 45, color: '#10b981', percent: 32.8 },
    { name: 'Operations', value: 38, color: '#06b6d4', percent: 27.7 },
    { name: 'Maintenance', value: 32, color: '#f59e0b', percent: 23.4 },
    { name: 'Admin', value: 22, color: '#6366f1', percent: 16.1 },
  ];

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

  const BarChart = ({ data, maxValue }) => {
    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{item.name}</span>
              <span className="text-gray-600">{item.devices} devices, {item.workers} workers</span>
            </div>
            <div className="flex gap-2 h-8">
              <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${(item.devices / maxValue) * 100}%` }}
                ></div>
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${(item.workers / maxValue) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const LineChart = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.online || d.activity));
    
    return (
      <div className="relative h-48">
        <div className="absolute inset-0 flex items-end justify-around pb-8">
          {data.map((item, index) => {
            const value = item.online || item.activity;
            const height = (value / maxValue) * 100;
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative w-full flex items-end justify-center" style={{ height: '160px' }}>
                  <div 
                    className="w-2 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-full transition-all duration-500"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 mt-2">{item.name || item.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const DonutChart = ({ data }) => {
    return (
      <div className="flex items-center justify-center gap-8">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.map((item, index) => {
              const total = data.reduce((sum, d) => sum + d.value, 0);
              const percentage = (item.value / total) * 100;
              const previousPercentages = data.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 100, 0);
              const circumference = 2 * Math.PI * 35;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((previousPercentages / 100) * circumference);
              
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="15"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.reduce((sum, d) => sum + d.value, 0)}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-600">{item.value} ({item.percent}%)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StackedBarChart = ({ data }) => {
    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          const total = (item.present || item.online) + (item.absent || item.offline);
          const primaryPercent = ((item.present || item.online) / total) * 100;
          const secondaryPercent = ((item.absent || item.offline) / total) * 100;
          
          return (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{item.day || item.name}</span>
                <span className="text-gray-600">
                  {item.present || item.online} / {item.absent || item.offline}
                </span>
              </div>
              <div className="flex h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${primaryPercent}%` }}
                ></div>
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${secondaryPercent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Device Status Trend</h3>
            <StackedBarChart data={devicesChartData} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Device Types Distribution</h3>
            <DonutChart data={deviceTypeData} />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Devices & Workers by Location</h3>
            <BarChart data={locationsChartData} maxValue={90} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Location Activity Trend</h3>
            <LineChart data={locationActivityData} />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Attendance</h3>
            <StackedBarChart data={workersChartData} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Workers by Department</h3>
            <DonutChart data={departmentData} />
          </div>
        </div>
      </div>
    </div>
  );
}