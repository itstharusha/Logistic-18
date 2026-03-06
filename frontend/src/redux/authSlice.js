/**
 * authSlice.js — Redux Slice: Authentication State
 *
 * Responsibility:
 *   Manages all authentication-related state for the frontend application.
 *
 *   State shape:
 *   {
 *     user:          object | null   — current logged-in user (name, email, role, orgId)
 *     accessToken:   string | null   — JWT access token (mirrored from localStorage)
 *     refreshToken:  string | null   — JWT refresh token (mirrored from localStorage)
 *     loading:       boolean         — true while an async auth operation is in progress
 *     isInitialized: boolean         — true once the initial getMe() check has returned
 *                                      (used to prevent flash of login page on reload)
 *     error:         string | null   — error message from the last failed operation
 *     message:       string | null   — success message (e.g. after registration)
 *   }
 *
 *   Async Thunks (API calls):
 *   - login          → POST /auth/login
 *   - register       → POST /auth/register
 *   - logout         → POST /auth/logout
 *   - changePassword → POST /auth/change-password
 *   - getMe          → GET  /auth/me  (called on app load to restore session)
 *
 *   Sync Actions (exported for components to use):
 *   - setUser, clearError, clearMessage
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../utils/api.js';

// ─────────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────────

/**
 * login
 * Sends email + password to the backend.
 * On success: stores tokens in localStorage and returns the user object.
 * On failure: returns the error message via rejectWithValue.
 */
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(email, password);
      // Persist tokens so they survive page reloads
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

/**
 * register
 * Creates a new user account.
 * On success: does NOT log the user in — they must login separately.
 */
export const register = createAsyncThunk(
  'auth/register',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(formData);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

/**
 * logout
 * Calls the backend to invalidate the refresh token, then clears localStorage.
 * Regardless of backend success/failure, tokens are removed client-side.
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Logout failed');
    }
  }
);

/**
 * changePassword
 * Changes the current user's password.
 * The backend invalidates all tokens, forcing a re-login.
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Password change failed');
    }
  }
);

/**
 * getMe
 * Fetches the current user from the backend using the stored access token.
 * Called once on app startup (in App.jsx) to restore the user session.
 * If the token is invalid/expired, localStorage is cleared and the app redirects to login.
 */
export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return response.data.user;
    } catch (error) {
      // Expired/invalid token — clean up localStorage so the user sees the login page
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return rejectWithValue(error.response?.data?.error || 'Session expired');
    }
  }
);

// ─────────────────────────────────────────────
// Slice Definition
// ─────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',

  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken') || null,  // Restore from storage
    refreshToken: localStorage.getItem('refreshToken') || null,
    loading: false,
    isInitialized: false, // App waits for this to be true before rendering protected routes
    error: null,
    message: null,
  },

  reducers: {
    /** Manually set the user object (e.g. after profile update) */
    setUser: (state, action) => {
      state.user = action.payload;
    },
    /** Clear the last error message (e.g. when the error modal is dismissed) */
    clearError: (state) => {
      state.error = null;
    },
    /** Clear the last success message (e.g. after displaying a toast) */
    clearMessage: (state) => {
      state.message = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ── Login ────────────────────────────────────────
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.accessToken = localStorage.getItem('accessToken');
        state.refreshToken = localStorage.getItem('refreshToken');
        state.isInitialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Get Me (session restore on load) ────────────
      .addCase(getMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isInitialized = true; // App can now render protected routes
      })
      .addCase(getMe.rejected, (state) => {
        // Session invalid — clear everything
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isInitialized = true; // Still mark as initialized so app can show login
      })

      // ── Register ─────────────────────────────────────
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.message = 'Registration successful. Please login.';
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Logout ───────────────────────────────────────
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Change Password ───────────────────────────────
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.message = 'Password changed successfully';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setUser, clearError, clearMessage } = authSlice.actions;
export default authSlice.reducer;
