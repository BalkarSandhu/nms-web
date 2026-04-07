import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import Header from './local-components/header';
import LocationsTable, { type EnrichedLocation } from './local-components/table';
import { exportToCsv, type CsvColumn } from '@/lib/utils';

export default function LocationsPage() {
    const navigate = useNavigate();
    const { error } = useAppSelector(state => state.locations);
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

    const handleRowClick = (locationId: number) => {
        navigate(`/locations/${locationId}`);
    };

    return (
        <div className="p-4 flex gap-4 bg-gray-50 min-h-[90vh] max-h-full w-full">
            <div className="h-full w-full">
                <Header onExport={handleExport} exportDisabled={!exportRows.length} />
                {error ? (
                    <div className="p-4 text-center text-red-500">{error}</div>
                ) : (
                    <LocationsTable
                        onRowClick={handleRowClick}
                        onDataChange={setExportRows}
                    />
                )}
            </div>
        </div>
    );
}