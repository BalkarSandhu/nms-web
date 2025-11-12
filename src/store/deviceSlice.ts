import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { readDeviceType } from '@/contexts/read-Types';

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

// State interface
interface DeviceState {
  devices: readDeviceType[];
  deviceTypes: DeviceType[];
  paginationMeta: PaginatedDevicesResponse['meta'] | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: DeviceState = {
  devices: [],
  deviceTypes: [],
  paginationMeta: null,
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
export const fetchDevicesPaginated = createAsyncThunk(
  'devices/fetchPaginated',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices`, {
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
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices/all`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch all devices');
      const data: AllDevicesResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
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
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices/types`, {
        headers: getAuthHeaders(),
      });
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
      })
      .addCase(fetchAllDevices.rejected, (state, action) => {
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
      });
  },
});

export const { clearError } = deviceSlice.actions;
export default deviceSlice.reducer;
