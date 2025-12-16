// Example: How to use the location slice in your components

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchLocations,
  createLocation,
  fetchLocationsByBounds,
  fetchLocationsCount,
  fetchLocationTypes,
  createLocationType,
  // fetchLocationById,
  deleteLocationType,
  deleteLocation,
  type CreateLocationPayload,
  type GetLocationsByBoundsParams,
  type GetLocationsCountParams,
} from '@/store/locationsSlice';

export function ExampleLocationComponent() {
  const dispatch = useAppDispatch();
  
  // Select data from the store
  const { locations, locationTypes, loading, error } = useAppSelector(
    (state) => state.locations
  );

  // Fetch locations when component mounts
  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchLocationTypes());
  }, [dispatch]);

  // Example: Create a new location
  const handleCreateLocation = async () => {
    const newLocation: CreateLocationPayload = {
      area: 'Downtown',
      latitude: 40.7128,
      longitude: -74.0060,
      location_type_id: 1,
      name: 'NYC Office',
      project: 'HQ Expansion',
      worker_id: 1,
    };
    
    await dispatch(createLocation(newLocation));
    // Location is automatically added to store
  };

  // Example: Fetch locations by geographical bounds
  const handleFetchByBounds = async () => {
    const bounds: GetLocationsByBoundsParams = {
      min_lat: 40.0,
      max_lat: 41.0,
      min_lng: -75.0,
      max_lng: -73.0,
    };
    
    await dispatch(fetchLocationsByBounds(bounds));
    // Locations within bounds replace current locations in store
  };

  // Example: Get locations count with filters
  const handleGetCount = async () => {
    const params: GetLocationsCountParams = {
      project: 'HQ Expansion',
      area: 'Downtown',
      location_type_id: 1,
    };
    
    const result = await dispatch(fetchLocationsCount(params));
    console.log('Location count:', result.payload);
  };

  // Example: Fetch a specific location by ID
  // const handleFetchLocationById = async (locationId: number) => {
  //   await dispatch(fetchLocationById(locationId));
  //   // Location is added/updated in store
  // };

  // Example: Delete a location
  const handleDeleteLocation = async (locationId: number) => {
    await dispatch(deleteLocation(locationId));
    // Location is automatically removed from store
  };

  // Example: Create a location type
  const handleCreateLocationType = async () => {
    await dispatch(createLocationType('Warehouse'));
    // Location type is automatically added to store
  };

  // Example: Delete a location type
  const handleDeleteLocationType = async (typeId: number) => {
    await dispatch(deleteLocationType(typeId));
    // Location type is automatically removed from store
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      
      <h2>Locations ({locations.length})</h2>
      <ul>
        {locations.map((location) => (
          <li key={location.id}>
            {location.name} - {location.project} ({location.area})
            <br />
            Lat: {location.latitude}, Lng: {location.longitude}
            <br />
            Status: {location.status} - {location.status_reason}
            <button onClick={() => handleDeleteLocation(location.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Location Types ({locationTypes.length})</h2>
      <ul>
        {locationTypes.map((type) => (
          <li key={type.id}>
            {type.name}
            <button onClick={() => handleDeleteLocationType(type.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <button onClick={handleCreateLocation}>Create Location</button>
      <button onClick={handleCreateLocationType}>Create Location Type</button>
      <button onClick={handleFetchByBounds}>Fetch by Bounds</button>
      <button onClick={handleGetCount}>Get Count</button>
    </div>
  );
}
