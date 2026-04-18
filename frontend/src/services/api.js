import axios from 'axios';

/**
 * Pre-configured Axios instance.
 * Automatically attaches the JWT stored in localStorage to every request.
 * Intercepts 401 responses to clear stale auth state.
 */
const api = axios.create({
  baseURL:         '/api',
  withCredentials: true, // Send cookies (httpOnly JWT)
  timeout:         15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach JWT  ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle auth errors globally ────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local storage and redirect to login
      localStorage.removeItem('cr_token');
      localStorage.removeItem('cr_user');
      // Emit custom event so AuthContext can react without circular imports
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
