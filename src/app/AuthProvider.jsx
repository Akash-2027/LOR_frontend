import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/api.js';

export const AuthContext = createContext(null);

const STORAGE_KEYS = {
  token: 'lor_token',
  role: 'lor_role',
  user: 'lor_user'
};

const readStoredUser = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [role, setRole] = useState(() => localStorage.getItem(STORAGE_KEYS.role));
  const [user, setUser] = useState(() => readStoredUser());

  const login = useCallback(({ token: nextToken, role: nextRole, user: nextUser }) => {
    localStorage.setItem(STORAGE_KEYS.token, nextToken);
    localStorage.setItem(STORAGE_KEYS.role, nextRole);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    setToken(nextToken);
    setRole(nextRole);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.role);
    localStorage.removeItem(STORAGE_KEYS.user);
    setToken(null);
    setRole(null);
    setUser(null);
  }, []);

  // On mount: if a token exists but is expired or malformed, clear it immediately
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        logout();
      }
    } catch {
      logout(); // malformed token — clear it
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: fetch CSRF token for form submissions
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        await api.get('/csrf-token');
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };
    fetchCsrfToken();
  }, []);

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, role, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
