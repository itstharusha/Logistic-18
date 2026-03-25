import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userAPI } from '../utils/api.js';

// Async thunks
export const listUsers = createAsyncThunk(
  'users/listUsers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await userAPI.listUsers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch users');
    }
  }
);

export const assignRole = createAsyncThunk(
  'users/assignRole',
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await userAPI.assignRole(userId, { role });
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to assign role');
    }
  }
);

export const deactivateUser = createAsyncThunk(
  'users/deactivateUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await userAPI.deactivateUser(userId);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to deactivate user');
    }
  }
);

export const activateUser = createAsyncThunk(
  'users/activateUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await userAPI.activateUser(userId);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to activate user');
    }
  }
);

export const inviteUser = createAsyncThunk(
  'users/inviteUser',
  async (data, { rejectWithValue }) => {
    try {
      const response = await userAPI.inviteUser(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to invite user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await userAPI.updateProfile(userId, data);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update user');
    }
  }
);

// Users slice
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    total: 0,
    loading: false,
    error: null,
    message: null,
    selectedUser: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // List users
      .addCase(listUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
        state.total = action.payload.total;
      })
      .addCase(listUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Assign role
      .addCase(assignRole.pending, (state) => {
        state.loading = true;
      })
      .addCase(assignRole.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'Role assigned successfully';
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
      })
      .addCase(assignRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Deactivate user
      .addCase(deactivateUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(deactivateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'User deactivated successfully';
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
      })
      .addCase(deactivateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Activate user
      .addCase(activateUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(activateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'User activated successfully';
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
      })
      .addCase(activateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Invite user
      .addCase(inviteUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(inviteUser.fulfilled, (state) => {
        state.loading = false;
        state.message = 'User invited successfully';
      })
      .addCase(inviteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.message = 'User updated successfully';
        const index = state.users.findIndex((u) => u._id === action.payload._id);
        if (index !== -1) state.users[index] = action.payload;
        state.selectedUser = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearMessage, setSelectedUser } = usersSlice.actions;
export default usersSlice.reducer;
