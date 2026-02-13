import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Alert {
	type: 'device' | 'location' | 'worker';
	message: string;
	link: string;
}

interface AlertsBannerProps {
	alerts: Alert[];
}

export default function AlertsBanner({ alerts }: AlertsBannerProps) {
	const [dismissed, setDismissed] = useState(false);
	const navigate = useNavigate();

	if (dismissed || alerts.length === 0) return null;

	return (
		<div className="mb-4 bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3 flex-1">
					<AlertTriangle className="w-6 h-6 text-red-400 mt-0.5 animate-pulse" />
					<div className="flex-1">
						<h3 className="text-red-200 font-semibold text-sm mb-2">
							Critical Network Alerts ({alerts.length})
						</h3>
						<div className="space-y-1">
							{alerts.map((alert, index) => (
								<button
									key={index}
									onClick={() => navigate(alert.link)}
									className="block text-left text-xs text-red-100/80 hover:text-white hover:underline transition-colors"
								>
									• {alert.message}
								</button>
							))}
						</div>
					</div>
				</div>
				<button
					onClick={() => setDismissed(true)}
					className="text-red-300 hover:text-white transition-colors"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}