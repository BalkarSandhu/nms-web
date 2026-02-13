import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QuickStatsProps {
	icon: ReactNode;
	title: string;
	value: number | string;
	change?: string;
	changeType?: 'positive' | 'negative' | 'neutral';
}

export default function QuickStats({ icon, title, value, change, changeType = 'neutral' }: QuickStatsProps) {
	const getChangeIcon = () => {
		switch (changeType) {
			case 'positive':
				return <TrendingUp className="w-4 h-4 text-green-400" />;
			case 'negative':
				return <TrendingDown className="w-4 h-4 text-red-400" />;
			default:
				return <Minus className="w-4 h-4 text-gray-400" />;
		}
	};

	const getChangeColor = () => {
		switch (changeType) {
			case 'positive':
				return 'text-green-400';
			case 'negative':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	};

	return (
		<div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-lg p-4 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300">
			<div className="flex items-start justify-between mb-3">
				<div className="p-2 bg-blue-500/20 rounded-lg">
					{icon}
				</div>
			</div>
			<div className="space-y-1">
				<h3 className="text-gray-400 text-xs font-medium uppercase tracking-wide">
					{title}
				</h3>
				<div className="flex items-baseline gap-2">
					<span className="text-2xl font-bold text-white">
						{value}
					</span>
				</div>
				{change && (
					<div className={`flex items-center gap-1 text-xs ${getChangeColor()}`}>
						{getChangeIcon()}
						<span>{change}</span>
					</div>
				)}
			</div>
		</div>
	);
}