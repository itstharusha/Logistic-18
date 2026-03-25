import { configureStore } from '@reduxjs/toolkit';

import authReducer from './authSlice.js';
import usersReducer from './usersSlice.js';

// ✅ ADD THIS
import analyticsReducer from './analyticsSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,

    // ✅ add analytics slice
    analytics: analyticsReducer,
  },
});