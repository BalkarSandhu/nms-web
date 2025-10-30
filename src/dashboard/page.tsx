import Section from "./local-components/Section";

export default function Dashboard() {
	return (
		<div className="flex flex-col gap-2 p-2 bg-(--base) w-full min-h-full">
            <Section 
				title="Devices"
				metricsData={{
					// metric1: {
					// 	value: 75,
					// 	name: "Device Status",
					// 	title: "Device Health",
					// 	max: 100
					// }
				}}
			/>
            <Section 
				title="Locations"
				metricsData={{
					// metric1: {
					// 	value: 45,
					// 	name: "Location Coverage",
					// 	title: "Coverage %",
					// 	max: 100
					// }
				}}
			/>
            <Section 
				title="Workers"
				metricsData={{
					// metric1: {
					// 	value: 92,
					// 	name: "Worker Load",
					// 	title: "Worker Utilization",
					// 	max: 100
					// }
				}}
			/>
		</div>
	)
}
