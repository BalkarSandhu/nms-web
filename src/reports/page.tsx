import ReportsFilters from "./local-components/ReportsFilters";
import { useState } from "react";

export default function ReportsPage() {
    const [lastFilters, setLastFilters] = useState(null as any);

    const handleGenerate = (filters: any) => {
        // TODO: replace with report generation logic (API call / navigation)
        console.log('Generate report with', filters);
        setLastFilters(filters);
    }

    return (
        <div className="p-4">
            <div className="p-4">
                <label htmlFor="">Devices Report </label>
            <ReportsFilters onGenerate={handleGenerate} />
            {lastFilters && (
                <div className="mt-4 text-sm text-(--contrast)">
                    <strong>Last generated with:</strong>
                    <pre className="bg-(--base) p-2 mt-2 rounded text-xs">{JSON.stringify(lastFilters, null, 2)}</pre>
                </div>
            )}
        </div>
        <div className="p-4">
                <h2 className="text"> Locations Report</h2>
            <ReportsFilters onGenerate={handleGenerate} />
            {lastFilters && (
                <div className="mt-4 text-sm text-(--contrast)">
                    <strong>Last generated with:</strong>
                    <pre className="bg-(--base) p-2 mt-2 rounded text-xs">{JSON.stringify(lastFilters, null, 2)}</pre>
                </div>
            )}
        </div>
        <div className="p-4">
                <label htmlFor="">Workers Report </label>
            <ReportsFilters onGenerate={handleGenerate} />
            {lastFilters && (
                <div className="mt-4 text-sm text-(--contrast)">
                    <strong>Last generated with:</strong>
                    <pre className="bg-(--base) p-2 mt-2 rounded text-xs">{JSON.stringify(lastFilters, null, 2)}</pre>
                </div>
            )}
        </div>
        </div>
    );
}
