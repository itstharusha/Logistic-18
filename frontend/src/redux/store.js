/**
 * store.js — Redux Store Configuration
 *
 * Responsibility:
 *   Creates and exports the single Redux store for the entire frontend application.
 *   The store combines four domain-specific "slices" (reducers), each managing
 *   a distinct area of application state:
 *
 *   ├── auth      (authSlice.js)      — current user session, tokens, login state
 *   ├── users     (usersSlice.js)     — user list management, role assignment
 *   ├── suppliers (suppliersSlice.js) — supplier list, detail, risk history
 *   └── shipments (shipmentsSlice.js) — shipment list, detail, tracking events
 *
 *   Configured with Redux Toolkit's configureStore, which automatically sets up:
 *   - Redux DevTools Extension support (for browser debugging)
 *   - The Immer middleware (allows "mutating" writes in reducers)
 *   - The Thunk middleware (enables async thunk actions)
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import usersReducer from './usersSlice.js';
import inventoryReducer from './inventorySlice.js';
import warehouseReducer from './warehouseSlice.js';
import suppliersReducer from './suppliersSlice.js';
import shipmentsReducer from './shipmentsSlice.js';
import alertsReducer from './alertsSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,      // Manages login/logout/session state
    users: usersReducer,     // Manages user list and admin actions
    inventory: inventoryReducer, // Manages inventory CRUD
    warehouse: warehouseReducer, // Manages warehouse CRUD
    suppliers: suppliersReducer, // Manages supplier CRUD + risk history
    shipments: shipmentsReducer, // Manages shipment CRUD + tracking
    alerts: alertsReducer, // Manages alerts and notifications
  },
});
