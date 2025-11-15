import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { isDataStale } from '@/lib/auth';

//-- Local Components
import Header from './local-components/header';
import LocationsTable, { type EnrichedLocation } from './local-components/table';
import { fetchLocations } from '@/store/locationsSlice';
import { LocationDetailsSidebar } from './local-components/LocationDetailsSidebar';
import { exportToCsv, type CsvColumn } from '@/lib/utils';


export default function LocationsPage() {
    const dispatch = useAppDispatch();
    const { locations, loading, error, lastFetched } = useAppSelector(state => state.locations);
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [exportRows, setExportRows] = useState<EnrichedLocation[]>([]);

    const exportColumns = useMemo<CsvColumn<EnrichedLocation>[]>(() => [
        { header: 'S.No', accessor: (_row, index) => index + 1 },
        { header: 'Name', accessor: (row) => row.name },
        { header: 'Type', accessor: (row) => row.type_name },
        { header: 'Status', accessor: (row) => row.status },
        { header: 'Project', accessor: (row) => row.project },
        { header: 'Area', accessor: (row) => row.area },
        { header: 'Worker', accessor: (row) => row.worker_hostname ?? 'N/A' },
        { header: 'Devices Online', accessor: (row) => row.devices_online },
        { header: 'Devices Offline', accessor: (row) => row.devices_offline },
        { header: 'Devices Total', accessor: (row) => row.devices_total },
    ], []);

    const handleExport = () => {
        if (!exportRows.length) return;
        exportToCsv('locations.csv', exportRows, exportColumns);
    };

    useEffect(() => {
        // Only fetch if locations are not loaded OR data is stale (older than 5 minutes)
        if (!locations || locations.length === 0 || isDataStale(lastFetched)) {
            dispatch(fetchLocations());
        }
    }, [dispatch, locations, lastFetched]);

    return (
        <div className="p-4 flex gap-4 bg-(--contrast) min-h-[90vh] max-h-full w-full">
            <div className="h-full w-full">
                <Header onExport={handleExport} exportDisabled={!exportRows.length} />
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading locations...</div>
                ) : error ? (
                    <div className="p-4 text-center text-red-500">{error}</div>
                ) : (
                    <LocationsTable 
                        onRowClick={setSelectedLocationId} 
                        selectedLocationId={selectedLocationId} 
                        onDataChange={setExportRows}
                    />
                )}
            </div>

            {/*Details Sidebar*/}
            <LocationDetailsSidebar locationId={selectedLocationId} onClose={() => setSelectedLocationId(null)} />
        </div>
    );
}
