import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

//-- Local Components
import Header from './local-components/header';
import LocationsTable from './local-components/table';
import { fetchLocations } from '@/store/locationsSlice';
import { LocationDetailsSidebar } from './local-components/LocationDetailsSidebar';


export default function LocationsPage() {
    const dispatch = useAppDispatch();
    const { locations, loading, error } = useAppSelector(state => state.locations);
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

    useEffect(() => {
        if (!locations || locations.length === 0) {
            dispatch(fetchLocations());
        }
    }, [dispatch, locations]);

    return (
        <div className="p-4 flex gap-4 bg-(--contrast) min-h-[90vh] max-h-full w-full">
            <div className="h-full w-full">
                <Header />
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading locations...</div>
                ) : error ? (
                    <div className="p-4 text-center text-red-500">{error}</div>
                ) : (
                    <LocationsTable onRowClick={setSelectedLocationId} selectedLocationId={selectedLocationId} />
                )}
            </div>

            {/*Details Sidebar*/}
            <LocationDetailsSidebar locationId={selectedLocationId} onClose={() => setSelectedLocationId(null)} />
        </div>
    );
}
