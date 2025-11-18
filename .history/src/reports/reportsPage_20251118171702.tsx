import {
  LineChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";

const dailyData = [
  { day: "Mon", vehicles: 120, persons: 45 },
  { day: "Tue", vehicles: 200, persons: 78 },
  { day: "Wed", vehicles: 150, persons: 60 },
  { day: "Thu", vehicles: 300, persons: 95 },
  { day: "Fri", vehicles: 250, persons: 80 },
];

const pieData = [
  { name: "Entries", value: 540 },
  { name: "Exits", value: 480 },
];

const COLORS = ["#4f46e5", "#16a34a"];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="p-5 bg-white rounded-xl shadow">
          <p className="text-gray-500 text-sm">Total Vehicles</p>
          <h2 className="text-3xl font-bold mt-2">1,520</h2>
        </div>
        <div className="p-5 bg-white rounded-xl shadow">
          <p className="text-gray-500 text-sm">Total Persons</p>
          <h2 className="text-3xl font-bold mt-2">890</h2>
        </div>
        <div className="p-5 bg-white rounded-xl shadow">
          <p className="text-gray-500 text-sm">Gate Alerts</p>
          <h2 className="text-3xl font-bold mt-2">32</h2>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">

        {/* Line Chart */}
        <div className="p-5 bg-white rounded-xl shadow">
          <h2 className="font-semibold mb-3">Vehicles Per Day</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="vehicles" stroke="#4f46e5" strokeWidth={3} />
              <Line type="monotone" dataKey="persons" stroke="#16a34a" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="p-5 bg-white rounded-xl shadow">
          <h2 className="font-semibold mb-3">Person & Vehicle Count</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="vehicles" fill="#4f46e5" />
              <Bar dataKey="persons" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="p-5 bg-white rounded-xl shadow col-span-2">
          <h2 className="font-semibold mb-3">Entry vs Exit Summary</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
