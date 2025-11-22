import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearAuthToken } from '@/lib/auth';

interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  has_api_key: boolean;
  token_expiry: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      clearAuthToken();
      
      // Clear persisted Redux state
      try {
        localStorage.removeItem('redux-auth-state');
      } catch (error) {
        console.warn('Failed to clear persisted auth state:', error);
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;