import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Types for Location
export interface Location {
  area: string;
  id: number;
  lat: number;
  lng: number;
  location_type_id: number;
  name: string;
  project: string;
  status: string;
  status_reason: string;
  created_at?: string;
  updated_at?: string;
}

// Types for Location Type
export interface LocationType {
  id: number;
  name: string;
  created_at?: string;
  location_type?: string;
}

// Types for API payloads
export interface CreateLocationPayload {
  area: string;
  lat: number;
  lng: number;
  location_type_id: number;
  name: string;
  project: string;
  worker_id: number;
}

export interface GetLocationsByBoundsParams {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export interface GetLocationsCountParams {
  project?: string;
  area?: string;
  location_type_id?: number;
}

// Types for API responses
interface CreateLocationResponse {
  location: Location;
  location_id: number;
  message: string;
}

interface CreateLocationTypeResponse {
  created_at: string;
  id: number;
  location_type: string;
}

interface CountResponse {
  count: number;
}

interface MessageResponse {
  message: string;
}

// State interface
interface LocationState {
  locations: Location[];
  locationTypes: LocationType[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: LocationState = {
  locations: [],
  locationTypes: [],
  loading: false,
  error: null,
};

// Helper to get cookie
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// Helper to create headers with auth
const getAuthHeaders = (): HeadersInit => {
  const token = getCookie('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Async thunks
export const fetchLocations = createAsyncThunk(
  'locations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data: Location[] = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createLocation = createAsyncThunk(
  'locations/create',
  async (payload: CreateLocationPayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create location');
      const data: CreateLocationResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchLocationsByBounds = createAsyncThunk(
  'locations/fetchByBounds',
  async (params: GetLocationsByBoundsParams, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({
        min_lat: params.min_lat.toString(),
        max_lat: params.max_lat.toString(),
        min_lng: params.min_lng.toString(),
        max_lng: params.max_lng.toString(),
      });
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/locations/bounds?${queryParams}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch locations by bounds');
      const data: Location[] = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchLocationsCount = createAsyncThunk(
  'locations/fetchCount',
  async (params: GetLocationsCountParams, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.project) queryParams.append('project', params.project);
      if (params.area) queryParams.append('area', params.area);
      if (params.location_type_id) queryParams.append('location_type_id', params.location_type_id.toString());
      
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/locations/count?${queryParams}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch locations count');
      const data: CountResponse = await response.json();
      return data.count;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchLocationTypes = createAsyncThunk(
  'locations/fetchTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations/types`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch location types');
      const data: LocationType[] = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createLocationType = createAsyncThunk(
  'locations/createType',
  async (name: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations/types`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create location type');
      const data: CreateLocationTypeResponse = await response.json();
      return {
        id: data.id,
        name: data.location_type,
        created_at: data.created_at,
      } as LocationType;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchLocationById = createAsyncThunk(
  'locations/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/locations?id=${id}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch location');
      const data: Location = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteLocationType = createAsyncThunk(
  'locations/deleteType',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/locations/types?id=${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to delete location type');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'locations/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/locations?id=${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to delete location');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all locations
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create location
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.loading = false;
        // Add new location to state
        state.locations.push(action.payload.location);
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch locations by bounds
      .addCase(fetchLocationsByBounds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationsByBounds.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocationsByBounds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch locations count (no state update needed, returns count)
      .addCase(fetchLocationsCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationsCount.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchLocationsCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch location types
      .addCase(fetchLocationTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.locationTypes = action.payload;
      })
      .addCase(fetchLocationTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create location type
      .addCase(createLocationType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocationType.fulfilled, (state, action) => {
        state.loading = false;
        // Add new location type to state
        state.locationTypes.push(action.payload);
      })
      .addCase(createLocationType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch location by ID
      .addCase(fetchLocationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.loading = false;
        // Update or add location if not already in state
        const index = state.locations.findIndex(loc => loc.id === action.payload.id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        } else {
          state.locations.push(action.payload);
        }
      })
      .addCase(fetchLocationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete location type
      .addCase(deleteLocationType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocationType.fulfilled, (state, action) => {
        state.loading = false;
        // Remove deleted location type from state
        state.locationTypes = state.locationTypes.filter(type => type.id !== action.payload.id);
      })
      .addCase(deleteLocationType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete location
      .addCase(deleteLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.loading = false;
        // Remove deleted location from state
        state.locations = state.locations.filter(loc => loc.id !== action.payload.id);
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = locationSlice.actions;
export default locationSlice.reducer;
