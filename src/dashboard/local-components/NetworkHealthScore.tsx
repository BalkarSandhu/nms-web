import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NetworkHealthScoreProps {
	score: number; // 0-100
	trend?: 'up' | 'down' | 'stable';
}

export default function NetworkHealthScore({ score, trend = 'stable' }: NetworkHealthScoreProps) {
	const getHealthColor = (score: number): string => {
		if (score >= 90) return 'text-green-400';
		if (score >= 75) return 'text-yellow-400';
		if (score >= 50) return 'text-orange-400';
		return 'text-red-400';
	};

	const getHealthStatus = (score: number): string => {
		if (score >= 90) return 'Excellent';
		if (score >= 75) return 'Good';
		if (score >= 50) return 'Fair';
		return 'Critical';
	};

	const getTrendIcon = () => {
		switch (trend) {
			case 'up':
				return <TrendingUp className="w-4 h-4 text-green-400" />;
			case 'down':
				return <TrendingDown className="w-4 h-4 text-red-400" />;
			default:
				return <Minus className="w-4 h-4 text-gray-400" />;
		}
	};

	const circumference = 2 * Math.PI * 45; // radius = 45
	const offset = circumference - (score / 100) * circumference;

	return (
		<div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/50 rounded-lg p-4 backdrop-blur-sm">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Activity className="w-5 h-5 text-blue-400" />
					<h3 className="text-gray-200 text-sm font-semibold">Network Health</h3>
				</div>
				{getTrendIcon()}
			</div>
			
			<div className="flex items-center justify-between">
				<div className="relative w-24 h-24">
					<svg className="transform -rotate-90 w-24 h-24">
						<circle
							cx="48"
							cy="48"
							r="45"
							stroke="currentColor"
							strokeWidth="8"
							fill="transparent"
							className="text-gray-700"
						/>
						<circle
							cx="48"
							cy="48"
							r="45"
							stroke="currentColor"
							strokeWidth="8"
							fill="transparent"
							strokeDasharray={circumference}
							strokeDashoffset={offset}
							className={`${getHealthColor(score)} transition-all duration-1000 ease-out`}
							strokeLinecap="round"
						/>
					</svg>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<div className={`text-2xl font-bold ${getHealthColor(score)}`}>
								{score}
							</div>
							<div className="text-xs text-gray-400">/ 100</div>
						</div>
					</div>
				</div>
				
				<div className="text-right">
					<div className={`text-xl font-bold ${getHealthColor(score)}`}>
						{getHealthStatus(score)}
					</div>
					<div className="text-xs text-gray-400 mt-1">
						Overall Status
					</div>
				</div>
			</div>
		</div>
	);
}