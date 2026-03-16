import axios from 'axios';

const defaultBase = import.meta.env.DEV ? 'http://localhost:4000' : 'https://lor-backendend.vercel.app';
const rawBase = import.meta.env.VITE_API_BASE || defaultBase;
const trimmedBase = rawBase.replace(/\/+$/, '');
const baseURL = trimmedBase.endsWith('/api') ? trimmedBase : `${trimmedBase}/api`;

const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
