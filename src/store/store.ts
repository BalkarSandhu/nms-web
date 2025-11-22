import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import deviceReducer from './deviceSlice';
import locationReducer from './locationsSlice';
import workerReducer from './workerSlice';

// Middleware to persist auth state to localStorage
const localStorageMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  
  // Save auth state to localStorage whenever it changes
  if (action.type?.startsWith('auth/')) {
    const authState = store.getState().auth;
    try {
      localStorage.setItem('redux-auth-state', JSON.stringify(authState));
    } catch (error) {
      console.warn('Failed to persist auth state:', error);
    }
  }
  
  return result;
};

// Load persisted auth state from localStorage
const loadPersistedAuthState = () => {
  try {
    const serialized = localStorage.getItem('redux-auth-state');
    if (serialized === null) {
      return undefined;
    }
    return JSON.parse(serialized);
  } catch (error) {
    console.warn('Failed to load persisted auth state:', error);
    return undefined;
  }
};

// Create the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    devices: deviceReducer,
    locations: locationReducer,
    workers: workerReducer,
  },
  preloadedState: {
    auth: loadPersistedAuthState(),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;