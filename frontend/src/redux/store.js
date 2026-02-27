import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import usersReducer from './usersSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
  },
});
