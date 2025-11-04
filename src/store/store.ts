import { configureStore } from '@reduxjs/toolkit';

// Create the Redux store
export const store = configureStore({
  reducer: {
    // Add your reducers here as you create them
    // Example: counter: counterReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
