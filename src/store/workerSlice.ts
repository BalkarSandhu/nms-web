import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuthHeaders } from '@/lib/auth';

// Types for Worker
export interface Worker {
  approval_status: string;
  approved_at: string;
  approved_by: string;
  capabilities: string[];
  created_at: string;
  hostname: string;
  id: string;
  ip_address: string;
  last_seen: string;
  max_devices: number;
  metadata?: Record<string, any>;
  registered_at: string;
  status: string;
  updated_at: string;
  version: string;
}

// Types for API responses
interface WorkersResponse {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  workers: Worker[];
}

interface WorkerStatsResponse {
  active_workers: number;
  approved_workers: number;
  denied_workers: number;
  offline_workers: number;
  pending_workers: number;
  total_workers: number;
}

interface MessageResponse {
  message: string;
}

// Types for API payloads
export interface UpdateWorkerPayload {
  hostname?: string;
  max_devices?: number;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface ApproveWorkerPayload {
  approve: boolean;
}

export interface BulkStatusPayload {
  worker_ids: string[];
  status: string;
}

export interface BulkDeletePayload {
  worker_ids: string[];
}

export interface GetWorkersParams {
  page?: number;
  page_size?: number;
  status?: string;
  approval_status?: string;
}

export interface SearchWorkersParams {
  query: string;
  page?: number;
  page_size?: number;
}

// State interface
interface WorkerState {
  workers: Worker[];
  stats: WorkerStatsResponse | null;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  } | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp of last successful fetch
}

// Initial state
const initialState: WorkerState = {
  workers: [],
  stats: null,
  pagination: null,
  loading: false,
  error: null,
  lastFetched: null,
};

// Async thunks
export const fetchWorkers = createAsyncThunk(
  'workers/fetchAll',
  async (params: GetWorkersParams = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.approval_status) queryParams.append('approval_status', params.approval_status);

      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers?${queryParams}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch workers');
      const data: WorkersResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const searchWorkers = createAsyncThunk(
  'workers/search',
  async (params: SearchWorkersParams, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams({ query: params.query });
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());

      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/search?${queryParams}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to search workers');
      const data: WorkersResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchWorkerStats = createAsyncThunk(
  'workers/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NMS_HOST}/workers/stats`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch worker stats');
      const data: WorkerStatsResponse = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchWorkerById = createAsyncThunk(
  'workers/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch worker');
      const data: Worker = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateWorker = createAsyncThunk(
  'workers/update',
  async ({ id, payload }: { id: string; payload: UpdateWorkerPayload }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error('Failed to update worker');
      const data: Worker = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteWorker = createAsyncThunk(
  'workers/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to delete worker');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const approveWorker = createAsyncThunk(
  'workers/approve',
  async ({ id, approve }: { id: string; approve: boolean }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}/approve`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ approve }),
        }
      );
      if (!response.ok) throw new Error('Failed to approve/deny worker');
      const data: MessageResponse = await response.json();
      return { id, approve, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const pauseWorker = createAsyncThunk(
  'workers/pause',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}/pause`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to pause worker');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const resumeWorker = createAsyncThunk(
  'workers/resume',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}/resume`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to resume worker');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const reloadWorkerConfig = createAsyncThunk(
  'workers/reloadConfig',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/${id}/reload-config`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to reload worker config');
      const data: MessageResponse = await response.json();
      return { id, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Broadcast operations
export const broadcastPause = createAsyncThunk(
  'workers/broadcastPause',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/broadcast/pause`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to pause all workers');
      const data: MessageResponse = await response.json();
      return data.message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const broadcastResume = createAsyncThunk(
  'workers/broadcastResume',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/broadcast/resume`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to resume all workers');
      const data: MessageResponse = await response.json();
      return data.message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const broadcastReloadConfig = createAsyncThunk(
  'workers/broadcastReloadConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/broadcast/reload-config`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to reload all workers config');
      const data: MessageResponse = await response.json();
      return data.message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const broadcastStatusCheck = createAsyncThunk(
  'workers/broadcastStatusCheck',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/broadcast/status-check`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to check all workers status');
      const data: MessageResponse = await response.json();
      return data.message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Bulk operations
export const bulkUpdateStatus = createAsyncThunk(
  'workers/bulkUpdateStatus',
  async (payload: BulkStatusPayload, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/bulk/status`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error('Failed to bulk update worker status');
      const data: MessageResponse = await response.json();
      return data.message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const bulkDeleteWorkers = createAsyncThunk(
  'workers/bulkDelete',
  async (payload: BulkDeletePayload, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_NMS_HOST}/workers/bulk/delete`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error('Failed to bulk delete workers');
      const data: MessageResponse = await response.json();
      return { worker_ids: payload.worker_ids, message: data.message };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const workerSlice = createSlice({
  name: 'workers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workers
      .addCase(fetchWorkers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkers.fulfilled, (state, action) => {
        state.loading = false;
        state.workers = action.payload.workers;
        state.pagination = {
          page: action.payload.page,
          page_size: action.payload.page_size,
          total_count: action.payload.total_count,
          total_pages: action.payload.total_pages,
        };
        state.lastFetched = Date.now(); // Track when data was fetched
      })
      .addCase(fetchWorkers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Search workers
      .addCase(searchWorkers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchWorkers.fulfilled, (state, action) => {
        state.loading = false;
        state.workers = action.payload.workers;
        state.pagination = {
          page: action.payload.page,
          page_size: action.payload.page_size,
          total_count: action.payload.total_count,
          total_pages: action.payload.total_pages,
        };
      })
      .addCase(searchWorkers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch worker stats
      .addCase(fetchWorkerStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkerStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchWorkerStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch worker by ID
      .addCase(fetchWorkerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkerById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.workers.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workers[index] = action.payload;
        } else {
          state.workers.push(action.payload);
        }
      })
      .addCase(fetchWorkerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update worker
      .addCase(updateWorker.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorker.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.workers.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workers[index] = action.payload;
        }
      })
      .addCase(updateWorker.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete worker
      .addCase(deleteWorker.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWorker.fulfilled, (state, action) => {
        state.loading = false;
        state.workers = state.workers.filter(w => w.id !== action.payload.id);
      })
      .addCase(deleteWorker.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Approve worker
      .addCase(approveWorker.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveWorker.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.workers.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workers[index].approval_status = action.payload.approve ? 'approved' : 'denied';
        }
      })
      .addCase(approveWorker.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Pause worker
      .addCase(pauseWorker.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(pauseWorker.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(pauseWorker.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Resume worker
      .addCase(resumeWorker.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resumeWorker.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resumeWorker.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Reload worker config
      .addCase(reloadWorkerConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reloadWorkerConfig.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(reloadWorkerConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Broadcast operations
      .addCase(broadcastPause.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(broadcastPause.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(broadcastPause.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(broadcastResume.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(broadcastResume.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(broadcastResume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(broadcastReloadConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(broadcastReloadConfig.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(broadcastReloadConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(broadcastStatusCheck.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(broadcastStatusCheck.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(broadcastStatusCheck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Bulk operations
      .addCase(bulkUpdateStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateStatus.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(bulkUpdateStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(bulkDeleteWorkers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkDeleteWorkers.fulfilled, (state, action) => {
        state.loading = false;
        state.workers = state.workers.filter(w => !action.payload.worker_ids.includes(w.id));
      })
      .addCase(bulkDeleteWorkers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = workerSlice.actions;
export default workerSlice.reducer;
