import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import usersReducer from './usersSlice.js';
import suppliersReducer from './suppliersSlice.js';
import shipmentsReducer from './shipmentsSlice.js';

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    users:     usersReducer,
    suppliers: suppliersReducer,
    shipments: shipmentsReducer,
  },
});
