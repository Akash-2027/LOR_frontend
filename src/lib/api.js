import axios from 'axios';

// Backend base URL — VITE_API_BASE can override (e.g. in .env or Vercel env settings)
const defaultBase = import.meta.env.DEV
  ? 'http://localhost:4000'
  : 'https://lor-backendend.vercel.app'; // matches Vercel project name

const rawBase    = import.meta.env.VITE_API_BASE || defaultBase;
const trimmedBase = rawBase.replace(/\/+$/, '');

// All routes are versioned under /api/v1
const baseURL = trimmedBase.endsWith('/api/v1')
  ? trimmedBase
  : `${trimmedBase}/api/v1`;

const api = axios.create({
  baseURL,
  timeout: 15000 // 15 s — prevent requests from hanging forever
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token if available (for state-changing requests)
  const csrfToken = localStorage.getItem('lor_csrf_token');
  const sessionId = localStorage.getItem('lor_session_id');
  if (csrfToken && sessionId) {
    config.headers['X-CSRF-Token'] = csrfToken;
    config.headers['X-Session-ID'] = sessionId;
  }

  return config;
});

// Capture CSRF token from response headers and store it
api.interceptors.response.use(
  (response) => {
    const csrfToken = response.headers['x-csrf-token'];
    const sessionId = response.headers['x-session-id'];

    if (csrfToken) {
      localStorage.setItem('lor_csrf_token', csrfToken);
    }
    if (sessionId) {
      localStorage.setItem('lor_session_id', sessionId);
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lor_token');
      localStorage.removeItem('lor_role');
      localStorage.removeItem('lor_user');
      localStorage.removeItem('lor_csrf_token');
      localStorage.removeItem('lor_session_id');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
