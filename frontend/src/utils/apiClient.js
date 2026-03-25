/**
 * apiClient.js — Axios HTTP Client with JWT Interceptors
 *
 * Responsibility:
 *   Creates and exports a configured Axios instance used by every API call
 *   in the frontend application.
 *
 *   Key features:
 *   1. Base URL — reads VITE_API_URL from .env (defaults to '/api'), which
 *      Vite's dev proxy then forwards to http://localhost:5000/api.
 *   2. Request Interceptor — automatically attaches the JWT access token from
 *      localStorage as an Authorization: Bearer header before every request.
 *   3. Response Interceptor — detects 401 Unauthorized responses and
 *      automatically attempts to refresh the access token using the stored
 *      refresh token. If the refresh succeeds, the original request is retried
 *      transparently. If the refresh fails, the user is sent to the login page.
 */

import axios from 'axios';

// Base URL for all API calls — proxied to the backend by Vite's dev server
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create a reusable Axios instance with shared configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Abort requests that take longer than 10 seconds
});

// In-memory references (refreshed from localStorage before each request)
let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');

// ─────────────────────────────────────────────
// Request Interceptor
// ─────────────────────────────────────────────

/**
 * Intercepts every outgoing request and attaches the JWT access token.
 * Reads from localStorage each time so it always uses the latest token
 * even after a token refresh.
 */
apiClient.interceptors.request.use(
  (config) => {
    // Always re-read from storage in case the token was refreshed since the app loaded
    accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// Response Interceptor
// ─────────────────────────────────────────────

/**
 * Intercepts every response.
 * On success:    passes the response through unchanged.
 * On 401 error: attempts to refresh the access token once (_retry flag prevents loops),
 *               re-sends the failed request with the new token,
 *               or redirects to /login if the refresh itself fails.
 */
apiClient.interceptors.response.use(
  (response) => response, // Success — return the response as-is

  async (error) => {
    const originalRequest = error.config;

    // Only attempt one refresh per failed request (guard against infinite loop)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Request a new access token using the stored refresh token
          const response = await axios.post('/api/auth/refresh', { refreshToken });

          accessToken = response.data.accessToken;
          localStorage.setItem('accessToken', accessToken); // Store the new token

          // Retry the original failed request with the new access token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh token is invalid or expired — force re-login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // For all other errors (400, 403, 404, 500, etc.) — reject as normal
    return Promise.reject(error);
  }
);

export default apiClient;
