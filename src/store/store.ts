import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import deviceReducer from './deviceSlice';
import locationReducer from './locationsSlice';
import workerReducer from './workerSlice';

// Create the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    devices: deviceReducer,
    locations: locationReducer,
    workers: workerReducer,
    // Add your reducers here as you create them
    // Example: counter: counterReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
