import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

//-- Local Components
import Header from './local-components/header';
import LocationsTable from './local-components/table';
import {
  fetchLocations,
  createLocation,
  fetchLocationsByBounds,
  fetchLocationsCount,
  fetchLocationTypes,
  createLocationType,
  fetchLocationById,
  deleteLocationType,
  deleteLocation,
  type CreateLocationPayload,
  type GetLocationsByBoundsParams,
  type GetLocationsCountParams,
} from '@/store/locationsSlice';







export default function LocationsPage() {
    const dispatch = useAppDispatch();
    const { locations, loading, error } = useAppSelector(state => state.locations);

    useEffect(() => {
        if (!locations || locations.length === 0) {
            dispatch(fetchLocations());
        }
    }, [dispatch, locations]);

    return (
        <div className="p-4 flex gap-4 bg-(--contrast) min-h-full w-full">
            <div className="h-full w-full">
                <Header />
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading locations...</div>
                ) : error ? (
                    <div className="p-4 text-center text-red-500">{error}</div>
                ) : (
                    <LocationsTable />
                )}
            </div>

            {/*Details Sidebar*/}
            <div className="md:flex md:flex-col hidden md:w-[280px] border-l-2 border-(--base)/20">
                {/* Sidebar content here */}
            </div>
        </div>
    );
}