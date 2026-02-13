import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceDataPoint {
	timestamp: string;
	online: number;
	offline: number;
	total: number;
}

interface PerformanceChartProps {
	data: PerformanceDataPoint[];
	title?: string;
	height?: number;
}

export default function PerformanceChart({ 
	data, 
	title = "Network Performance (Last 24h)",
	height = 200 
}: PerformanceChartProps) {
	
	const chartData = useMemo(() => {
		return data.map(point => ({
			...point,
			time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
				hour: '2-digit', 
				minute: '2-digit' 
			})
		}));
	}, [data]);

	const CustomTooltip = ({ active, payload }: any) => {
		if (!active || !payload || !payload.length) return null;

		return (
			<div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
				<p className="text-gray-300 text-xs mb-2">{payload[0].payload.time}</p>
				{payload.map((entry: any, index: number) => (
					<div key={index} className="flex items-center gap-2 text-xs">
						<div 
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-gray-400">{entry.name}:</span>
						<span className="text-white font-semibold">{entry.value}</span>
					</div>
				))}
			</div>
		);
	};

	return (
		<div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-lg p-4 backdrop-blur-sm">
			<h3 className="text-gray-200 text-sm font-semibold mb-4">{title}</h3>
			<ResponsiveContainer width="100%" height={height}>
				<LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
					<XAxis 
						dataKey="time" 
						stroke="#9CA3AF"
						style={{ fontSize: '11px' }}
					/>
					<YAxis 
						stroke="#9CA3AF"
						style={{ fontSize: '11px' }}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Legend 
						wrapperStyle={{ fontSize: '12px' }}
						iconType="circle"
					/>
					<Line 
						type="monotone" 
						dataKey="online" 
						stroke="#10B981" 
						strokeWidth={2}
						dot={{ fill: '#10B981', r: 3 }}
						activeDot={{ r: 5 }}
						name="Online"
					/>
					<Line 
						type="monotone" 
						dataKey="offline" 
						stroke="#EF4444" 
						strokeWidth={2}
						dot={{ fill: '#EF4444', r: 3 }}
						activeDot={{ r: 5 }}
						name="Offline"
					/>
					<Line 
						type="monotone" 
						dataKey="total" 
						stroke="#3B82F6" 
						strokeWidth={2}
						dot={{ fill: '#3B82F6', r: 3 }}
						activeDot={{ r: 5 }}
						name="Total"
						strokeDasharray="5 5"
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}