import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAuthHeaders, handle401Unauthorized } from '@/lib/auth';

export interface WorkerServiceStats {
  worker_id: string;
  worker_name: string;
  running: number;
  stopped: number;
  paused: number;
  total: number;
}

interface ServicesState {
  stats: WorkerServiceStats[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: ServicesState = {
  stats: [],
  loading: false,
  error: null,
  lastFetched: null,
};

export const fetchServiceStats = createAsyncThunk(
  'services/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const url = `${import.meta.env.VITE_NMS_HOST}/services`;
      const response = await fetch(url, { headers: getAuthHeaders() });

      if (response.status === 401) {
        handle401Unauthorized();
        throw new Error('Unauthorized - please log in again');
      }

      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();

      const rows: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const normalized: WorkerServiceStats[] = rows.map((r) => {
        const running = Number(r.running ?? 0);
        const stopped = Number(r.stopped ?? 0);
        const paused = Number(r.paused ?? 0);
        const total = Number(r.total ?? running + stopped + paused);
        return {
          worker_id: String(r.worker_id ?? ''),
          worker_name: String(r.worker_name ?? r.name ?? 'Unknown'),
          running,
          stopped,
          paused,
          total,
        };
      });

      return normalized;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearServicesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServiceStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchServiceStats.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch services';
      });
  },
});

export const { clearServicesError } = servicesSlice.actions;
export default servicesSlice.reducer;
