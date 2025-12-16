import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { readDeviceType } from '@/contexts/read-Types';
import { getAuthHeaders, handle401Unauthorized, buildUrlWithWorkerId, isDataStale } from '@/lib/auth';
import type { RootState } from './store';


// Types for Device Type
export interface DeviceType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// Types for API responses
interface PaginatedDevicesResponse {
  devices: readDeviceType[];
  meta: {
    current_page: number;
    page_size: number;
    total_pages: number;
    total_records: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface AllDevicesResponse {
  count: number;
  devices: readDeviceType[];
}

interface DeviceTypesResponse {
  count: number;
  device_types: DeviceType[];
}

interface CreateDeviceTypeResponse {
  device_type: DeviceType;
  message: string;
}

interface MessageResponse {
  message: string;
}

// Types for creating device
export interface CreateDevicePayload {
  attributes?: Record<string, any>;
  check_interval: number;
  device_type_id: number;
  display: string;
  hostname: string;
  has_power:boolean;
  last_check:string;
  imei: string;
  ip: string;
  location_id: number;
  port: number;
  protocol: string;
  snmp_auth_protocol?: string;
  snmp_community?: string;
  snmp_password?: string;
  snmp_priv_password?: string;
  snmp_priv_protocol?: string;
  snmp_username?: string;
  snmp_version?: string;
  timeout: number;
  worker_id: string;
}

// device statistics
interface DeviceStatistics {
  active_devices: number,
  device_type_stats: {
    [type:string]: number
  },
  offline_devices: number,
  online_devices: number,
  protocol_stats: {
     [protocol: string]: number 
    },
  total_devices: number

}

// State interface
interface DeviceState {
  devices: readDeviceType[];
  deviceTypes: DeviceType[];
  deviceStatistics: DeviceStatistics;
  paginationMeta: PaginatedDevicesResponse['meta'] | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last successful fetch
}

// Initial state
const initialState: DeviceState = {
  devices: [],
  deviceTypes: [],
  deviceStatistics:{
    online_devices:0,
    offline_devices:0,
    active_devices:0,
    protocol_stats:{},
    total_devices:0,
    device_type_stats:{}
  },
  paginationMeta: null,
  loading: false,
  error: null,
  lastFetched: null,
};

// Async thunks
export const fetchDevicesPaginated = createAsyncThunk(
  'devices/fetchPaginated',
  async (_, { rejectWithValue }) => {
    try {
      const url = buildUrlWithWorkerId(`${import.meta.env.VITE_NMS_HOST}/devices`);
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data: PaginatedDevicesResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchAllDevices = createAsyncThunk(
  'devices/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const url = buildUrlWithWorkerId(`${import.meta.env.VITE_NMS_HOST}/devices/all`);
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      // Handle 401 globally
      if (response.status === 401) {
        handle401Unauthorized();
        throw new Error('Unauthorized - please log in again');
      }
      
      if (!response.ok) throw new Error('Failed to fetch all devices');
      const data: AllDevicesResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const { devices, lastFetched, loading } = state.devices;

      if (loading) {
        return false;
      }

      if (devices.length > 0 && !isDataStale(lastFetched)) {
        return false;
      }

      return true;
    },
  }
);
export const fetchDevices = createAsyncThunk(
  'devices/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const url = buildUrlWithWorkerId(`${import.meta.env.VITE_NMS_HOST}/devices`);
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch all devices');
      const data: AllDevicesResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const { devices, lastFetched, loading } = state.devices;

      if (loading) {
        return false;
      }

      if (devices.length > 0 && !isDataStale(lastFetched)) {
        return false;
      }

      return true;
    },
  }
);

export const createDevice = createAsyncThunk(
  'devices/create',
  async (payload: CreateDevicePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create device');
      const data: MessageResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteDevice = createAsyncThunk(
  'devices/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete device');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchDeviceTypes = createAsyncThunk(
  'devices/fetchTypes',
  async (_, { rejectWithValue }) => {
    try {
      const url = buildUrlWithWorkerId(`${import.meta.env.VITE_NMS_HOST}/devices/types`);
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      // Handle 401 globally
      if (response.status === 401) {
        handle401Unauthorized();
        throw new Error('Unauthorized - please log in again');
      }
      
      if (!response.ok) throw new Error('Failed to fetch device types');
      const data: DeviceTypesResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);


export const createDeviceType = createAsyncThunk(
  'devices/createType',
  async (name: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices/types`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create device type');
      const data: CreateDeviceTypeResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteDeviceType = createAsyncThunk(
  'devices/deleteType',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices/types?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete device type');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch devices paginated
      .addCase(fetchDevicesPaginated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevicesPaginated.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload.devices;
        state.paginationMeta = action.payload.meta;
      })
      .addCase(fetchDevicesPaginated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch all devices
      .addCase(fetchAllDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload.devices;
        state.paginationMeta = null; // Clear pagination when fetching all
        state.lastFetched = Date.now(); // Track when data was fetched
      })
      .addCase(fetchAllDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch devices
      .addCase(fetchDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload.devices;
        state.paginationMeta = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create device
      .addCase(createDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDevice.fulfilled, (state) => {
        state.loading = false;
        // After creating, you might want to refetch devices
      })
      .addCase(createDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete device
      .addCase(deleteDevice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDevice.fulfilled, (state, action) => {
        state.loading = false;
        // Remove deleted device from state
        state.devices = state.devices.filter(device => device.id !== action.payload.id);
      })
      .addCase(deleteDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch device types
      .addCase(fetchDeviceTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeviceTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.deviceTypes = action.payload.device_types;
      })
      .addCase(fetchDeviceTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create device type
      .addCase(createDeviceType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDeviceType.fulfilled, (state, action) => {
        state.loading = false;
        // Add new device type to state
        state.deviceTypes.push(action.payload.device_type);
      })
      .addCase(createDeviceType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete device type
      .addCase(deleteDeviceType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDeviceType.fulfilled, (state, action) => {
        state.loading = false;
        // Remove deleted device type from state
        state.deviceTypes = state.deviceTypes.filter(type => type.id !== action.payload.id);
      })
      .addCase(deleteDeviceType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle device statistics fetch
      .addCase(fetchDeviceStatistics.fulfilled, (state, action) => {
        state.deviceStatistics = action.payload;
      });
  },
});

export const fetchDeviceStatistics = createAsyncThunk (
  'devices/statistics',
  async (_, { rejectWithValue}) => {
    try{
      const url = buildUrlWithWorkerId(`${import.meta.env.VITE_NMS_HOST}/devices/statistics`);
      const response = await fetch(url,
        {
          headers: getAuthHeaders(),
        }
      );

      // Handle 401 globally
      if (response.status === 401) {
        handle401Unauthorized();
        throw new Error('Unauthorized - please log in again');
      }

      if(!response.ok) throw new Error ('Failed to fetch device statistics')

      const data: DeviceStatistics = await response.json();
      return data;

    }catch (error){
      return rejectWithValue((error as Error).message)
    }
  }
);

export const { clearError } = deviceSlice.actions;
export default deviceSlice.reducer;
