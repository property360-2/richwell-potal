import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get('accounts/auth/me/');
      setUser(res.data);
      setRole(res.data.role);
      setIsProfileLoaded(true);
      setIsLoading(false);
    } catch (err) {
      setUser(null);
      setRole(null);
      setIsProfileLoaded(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize CSRF
    api.get('accounts/auth/csrf/').catch(() => {});
    
    checkAuth();

    const handleAuthExpired = () => {
      setUser(null);
      setRole(null);
      setIsProfileLoaded(false);
      
      // Prevent redirecting if already on public pages to avoid DOM detachment
      const publicPaths = ['/login', '/apply', '/'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login?expired=true';
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [checkAuth]);

  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      const response = await api.post('accounts/auth/login/', credentials);
      const { user: userData } = response.data;
      
      if (userData) {
        setUser(userData);
        setRole(userData.role);
        setIsProfileLoaded(true);
        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        // If user data isn't in response, fetch it
        await checkAuth();
        return { success: true };
      }
    } catch (error) {
      setIsLoading(false);
      return { 
        success: false, 
        message: error.response?.data?.detail || error.response?.data?.message || 'Login failed' 
      };
    }
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await api.post('accounts/auth/logout/');
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setUser(null);
      setRole(null);
      setIsProfileLoaded(false);
    }
  }, []);

  const value = {
    user,
    role,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
