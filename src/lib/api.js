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
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lor_token');
      localStorage.removeItem('lor_role');
      localStorage.removeItem('lor_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
