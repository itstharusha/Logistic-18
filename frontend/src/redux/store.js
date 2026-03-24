import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import usersReducer from './usersSlice.js';
import inventoryReducer from './inventorySlice.js';
import warehouseReducer from './warehouseSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    inventory: inventoryReducer,
    warehouse: warehouseReducer,
  },
});
