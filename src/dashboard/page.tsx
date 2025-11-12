//--local-components
import Section from "./local-components/Section";
import Filters from "./local-components/Filters";

import { useAPIs } from "@/contexts/API-Context"
import type { ApiContextType } from "@/contexts/API-Context"

type DashboardProps = {
	isButtonClicked?: boolean;
	setIsButtonClicked?: (value: boolean) => void;
}

export default function Dashboard({ isButtonClicked, setIsButtonClicked }: DashboardProps) {

	const context = useAPIs();

	// Add null check for safety
	if (!context) {
		return <div className="flex items-center justify-center h-screen">
			<p className="text-(--contrast)">API Context not available</p>
		</div>;
	}

	const { devices, locations, workers }: ApiContextType = context;

	// Note: Removed blocking loading check to allow UI to render immediately
	// Data will populate as API calls complete in parallel

	// Calculate metrics from actual data
	// Device status is a boolean, so we categorize based on other criteria
	const deviceMetrics = {
		low: devices.filter(d => d.status && d.consecutive_failures === 0).length, // healthy devices (online)
		medium: devices.filter(d => d.status && d.consecutive_failures > 0).length, // online but with failures (supervised)
		high: devices.filter(d => !d.status).length // offline devices
	};

	// Location metrics - group by location type or project
	const locationsByType = locations.reduce((acc, loc) => {
		acc[loc.location_type_id] = (acc[loc.location_type_id] || 0) + 1;
		return acc;
	}, {} as Record<number, number>);

	const locationMetrics = {
		low: Object.values(locationsByType)[0] || 0,
		medium: Object.values(locationsByType)[1] || 0,
		high: Object.values(locationsByType)[2] || 0
	};

	// Workers data structure needs to be defined in read-Types.ts
	// Using placeholder calculation for now
	const workerMetrics = {
		low: Math.floor(workers.length * 0.1),
		medium: Math.floor(workers.length * 0.2),
		high: workers.length - Math.floor(workers.length * 0.1) - Math.floor(workers.length * 0.2)
	};

	return (
		<div className="flex flex-col gap-2 p-2 bg-linear-to-b from-(--base) to-(--dark) w-full min-h-full">
			<div
				className={`transition-all duration-500 ease-in-out overflow-hidden ${isButtonClicked ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
					}`}
			>
				<Filters
					fromDate={"2024-01-01"}
					toDate={"2024-12-31"}
					onFromDateChange={() => {}}
					onToDateChange={() => {}}
					selectedLocationType="1"
					onLocationTypeChange={() => {}}
					selectedDeviceType="1"
					onDeviceTypeChange={() => {}}
					selectedWorker={1}
					onWorkerChange={() => {}}
					locations={[{ id: 1, name: "Location A" }, { id: 2, name: "Location B" }]}
					devices={[{ id: 1, name: "Device X" }, { id: 2, name: "Device Y" }]}
					workers={[{ id: 1, name: "Worker John" }, { id: 2, name: "Worker Jane" }]}
				/>
			</div>
			<Section
				title="Devices"
				metricsData={{
					metric1: {
						title: "Device Status",
						data: deviceMetrics,
						labels: {
							low: "Online",
							medium: "Supervised",
							high: "Offline"
						},
						showLabels: true
					},
					metric2: {
						data: deviceMetrics,
						title: "Device Distribution",
						labels: { low: "Online", medium: "Warning", high: "Offline" }
					}
				}}
			/>
			<Section
				title="Locations"
				metricsData={{
					metric1: {
						title: "Location Types",
						data: locationMetrics,
						labels: {
							low: "Type 1",
							medium: "Type 2",
							high: "Type 3"
						},
						showLabels: true
					},
					metric2: {
						data: locationMetrics,
						title: "Location Distribution",
						labels: { low: "Type 1", medium: "Type 2", high: "Type 3" }
					}
				}}
			/>
			<Section
				title="Workers"
				metricsData={{
					metric2: {
						data: workerMetrics,
						title: "Worker Status",
						labels: { low: "Idle", medium: "Busy", high: "Active" }
					}
				}}
			/>
		</div>
	)
}
