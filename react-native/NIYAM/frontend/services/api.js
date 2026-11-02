import axios from 'axios';
import { Platform } from 'react-native';
import { authStorage } from './authStorage';

/**
 * Determine the API base URL based on environment configuration and target platform.
 * Supports configurable development URLs via EXPO_PUBLIC_API_URL.
 *
 * Defaults:
 * - Android Emulator: http://10.0.2.2:5000 (maps to host development machine)
 * - iOS Simulator / Web / Desktop: http://localhost:5000
 * - Physical devices: configure EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000
 */
export const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    let url = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    // If Android is running with localhost/127.0.0.1, auto-map to 10.0.2.2 for emulator support
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      url = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return url;
  }

  // Fallback defaults for local development
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();

// Create centralized Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor:
 * Attaches the JWT Bearer token to all outgoing requests if present in SecureStore.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await authStorage.getToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to retrieve auth token for request interceptor:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Standardizes error reporting, extracts meaningful backend messages,
 * and handles 401 Unauthorized by clearing stale tokens.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle Network / Connectivity errors
    if (!error.response) {
      const networkError = new Error(
        'Unable to connect to the NIYAM server. Please check your internet connection or API URL configuration.'
      );
      networkError.isNetworkError = true;
      networkError.originalError = error;
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;

    // Clear stale token if server returns 401 Unauthorized
    // (except on auth/login where 401 is expected for invalid credentials)
    if (status === 401 && !originalRequest?.url?.includes('/auth/login')) {
      try {
        await authStorage.removeToken();
      } catch (e) {
        // Ignore removal error
      }
    }

    // Extract cleanest user-facing message
    let message = 'An unexpected error occurred. Please try again.';
    if (data && typeof data === 'object') {
      if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = data.error;
      } else if (Array.isArray(data.errors) && data.errors.length > 0) {
        message = data.errors.join('. ');
      }
    } else if (status === 404) {
      message = 'Requested resource was not found.';
    } else if (status >= 500) {
      message = 'NIYAM server encountered an internal error. Please try again shortly.';
    }

    const normalizedError = new Error(message);
    normalizedError.status = status;
    normalizedError.data = data;
    normalizedError.originalError = error;

    return Promise.reject(normalizedError);
  }
);

export default api;
